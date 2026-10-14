<?php

namespace App\Console\Commands;

use App\Models\FinancialTransaction;
use App\Models\Membership;
use App\Models\RecurringExpense;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateRecurringCharges extends Command
{
    protected $signature = 'charges:generate';

    protected $description = 'Generate recurring expense transactions and membership charges on each billing cycle';

    public function handle(): int
    {
        $today = Carbon::today(config('app.timezone'));
        $daysInMonth = $today->daysInMonth;
        $monthStart = $today->copy()->startOfMonth();

        $generated = 0;

        // 1. Recurring Expenses — create the whole month's charge up front as
        //    pending, dated to the month and due on its billing day. It only
        //    turns "overdue" once the due date passes (see FinancialTransaction
        //    scopeOverdue). One charge per cycle (recurrenceIsDue dedups).
        $recurringExpenses = RecurringExpense::where('is_active', true)->get();

        foreach ($recurringExpenses as $expense) {
            if (! $this->recurrenceIsDue($expense->last_generated_at, $expense->recurrence ?? 'monthly', $today)) {
                continue;
            }

            $billingDay = min((int) $expense->day_of_month, $daysInMonth);
            $dueDate = $today->copy()->day($billingDay);

            DB::transaction(function () use ($expense, $today, $monthStart, $dueDate) {
                // tenant_id is explicit: nobody is logged in when this runs.
                FinancialTransaction::create([
                    'tenant_id' => $expense->tenant_id,
                    'type' => 'expense',
                    'amount' => $expense->amount,
                    'date' => $monthStart->toDateString(),
                    'due_date' => $dueDate->toDateString(),
                    'description' => $expense->description,
                    'category' => $expense->category,
                    'status' => 'pending',
                    'recurring_expense_id' => $expense->id,
                ]);

                $expense->update(['last_generated_at' => $today]);
            });

            $generated++;
        }

        $this->info("Generated {$generated} recurring expense transactions.");

        // 2. Membership charges — each membership bills on its own cycle
        //    (weekly … annual), up to a short horizon ahead, never past its
        //    end date. A pause whose return date arrived is lifted first.
        $membershipGenerated = 0;
        $resumed = 0;

        Membership::with(['patient', 'commercialPlan'])
            ->whereIn('status', ['active', 'paused'])
            ->get()
            ->each(function (Membership $membership) use ($today, &$membershipGenerated, &$resumed) {
                if ($membership->status === 'paused') {
                    if (! $membership->paused_until || $membership->paused_until->gt($today)) {
                        return;
                    }

                    $membership->resume($today);
                    $resumed++;
                }

                $membershipGenerated += $membership->generateDueCharges($today);
            });

        $this->info("Generated {$membershipGenerated} membership billing transactions ({$resumed} paused memberships resumed).");

        // 3. Auto-expire memberships past end_date (open-ended ones never expire)
        $expired = Membership::whereIn('status', ['active', 'paused'])
            ->whereNotNull('end_date')
            ->where('end_date', '<', $today->toDateString())
            ->update(['status' => 'expired']);

        $this->info("Expired {$expired} memberships past end date.");

        return self::SUCCESS;
    }

    /**
     * Whether a recurring expense is due for a new charge in the current cycle.
     */
    private function recurrenceIsDue(?CarbonInterface $lastGenerated, string $recurrence, CarbonInterface $today): bool
    {
        if ($lastGenerated === null) {
            return true;
        }

        $monthStart = $today->copy()->startOfMonth();

        return match ($recurrence) {
            'quarterly' => $lastGenerated->copy()->addMonthsNoOverflow(3)->startOfMonth()->lte($monthStart),
            'yearly' => $lastGenerated->copy()->addYearNoOverflow()->startOfMonth()->lte($monthStart),
            default => $lastGenerated->format('Y-m') !== $today->format('Y-m'),
        };
    }
}
