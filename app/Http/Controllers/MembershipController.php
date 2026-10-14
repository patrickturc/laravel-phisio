<?php

namespace App\Http\Controllers;

use App\Models\CommercialPlan;
use App\Models\FinancialTransaction;
use App\Models\Membership;
use App\Models\Patient;
use App\Rules\BelongsToClinic;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MembershipController extends Controller
{
    public function index(Request $request)
    {
        $query = Membership::with('patient', 'commercialPlan')->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->whereHas('patient', function ($q) use ($request) {
                $q->whereLike('name', '%'.$request->search.'%');
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $memberships = $query->paginate(15)->withQueryString();
        $memberships->getCollection()->each->append(['sessions_total', 'sessions_used', 'sessions_remaining']);

        $patients = Patient::orderBy('name')->get(['id', 'name']);
        $commercialPlans = CommercialPlan::orderBy('name')->get(['id', 'name', 'price', 'billing_cycle', 'duration_months', 'sessions_total']);

        return Inertia::render('memberships/index', [
            'memberships' => $memberships,
            'filters' => $request->only(['search', 'status']),
            'patients' => $patients,
            'commercialPlans' => $commercialPlans,
        ]);
    }

    public function create(Request $request)
    {
        // Creation happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('memberships.index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'uuid', new BelongsToClinic(Patient::class)],
            'commercial_plan_id' => ['nullable', 'uuid', new BelongsToClinic(CommercialPlan::class)],
            'plan_name' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            // No end date: an open-ended ("contínua") membership.
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:active,expired,cancelled',
            'billing_cycle' => ['nullable', Rule::in(array_keys(Membership::BILLING_CYCLES))],
            'first_due_date' => 'nullable|date',
            // Older clients send only a day of the month: a monthly cycle.
            'billing_day' => 'nullable|integer|min:1|max:31',
        ]);

        $startDate = Carbon::parse($validated['start_date']);
        $cycle = $validated['billing_cycle'] ?? (isset($validated['billing_day']) ? 'monthly' : null);
        $firstDue = isset($validated['first_due_date'])
            ? Carbon::parse($validated['first_due_date'])
            : (isset($validated['billing_day'])
                ? $startDate->copy()->day(min($validated['billing_day'], $startDate->daysInMonth))
                : $startDate->copy());

        DB::transaction(function () use ($validated, $cycle, $firstDue) {
            $membership = Membership::create([
                ...collect($validated)->except(['first_due_date', 'billing_day'])->all(),
                'billing_cycle' => $cycle,
                'billing_day' => $this->billingDayFor($cycle, $firstDue),
            ]);

            // The first charge is created right away; the daily command takes
            // it from there, one cycle after the other.
            if ($membership->price > 0) {
                $membership->createCharge($firstDue);
                $membership->update([
                    'last_billed_at' => $firstDue->toDateString(),
                    'next_billing_date' => $cycle
                        ? Membership::nextDueAfter($firstDue, $cycle, $membership->billing_day)->toDateString()
                        : null,
                ]);
            } elseif ($cycle) {
                $membership->update(['next_billing_date' => $firstDue->toDateString()]);
            }
        });

        return redirect()->route('memberships.index')->with('success', 'Matrícula criada com sucesso!');
    }

    public function show(Membership $membership)
    {
        $membership->load(['patient', 'commercialPlan', 'financialTransactions' => function ($q) {
            $q->orderBy('date', 'desc');
        }]);
        $membership->append([
            'sessions_total', 'sessions_used', 'sessions_remaining',
            'monthly_allowance', 'sessions_used_this_month', 'sessions_remaining_this_month',
        ]);

        $patients = Patient::orderBy('name')->get(['id', 'name']);
        $commercialPlans = CommercialPlan::orderBy('name')->get(['id', 'name', 'price', 'billing_cycle', 'duration_months']);

        return Inertia::render('memberships/show', [
            'membership' => $membership,
            'patients' => $patients,
            'commercialPlans' => $commercialPlans,
        ]);
    }

    public function edit(Membership $membership)
    {
        // Editing happens via a sheet on the show page; keep the URL from 404ing.
        return redirect()->route('memberships.show', $membership);
    }

    public function update(Request $request, Membership $membership)
    {
        // "paused" only through pause/resume, but editing a paused membership
        // keeps it paused.
        $statuses = ['active', 'expired', 'cancelled', ...($membership->status === 'paused' ? ['paused'] : [])];

        $validated = $request->validate([
            'commercial_plan_id' => ['nullable', 'uuid', new BelongsToClinic(CommercialPlan::class)],
            'plan_name' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'price' => 'required|numeric|min:0',
            'status' => ['required', Rule::in($statuses)],
            'billing_cycle' => ['nullable', Rule::in(array_keys(Membership::BILLING_CYCLES))],
            'next_billing_date' => 'nullable|date',
            'billing_day' => 'nullable|integer|min:1|max:31',
        ]);

        $cycle = array_key_exists('billing_cycle', $validated)
            ? $validated['billing_cycle']
            : $membership->billing_cycle;
        $nextDue = isset($validated['next_billing_date'])
            ? Carbon::parse($validated['next_billing_date'])
            : $membership->nextBillingDate();

        $membership->update([
            ...collect($validated)->except(['next_billing_date', 'billing_day'])->all(),
            'billing_cycle' => $cycle,
            'billing_day' => $cycle && $nextDue ? $this->billingDayFor($cycle, $nextDue) : null,
            'next_billing_date' => $cycle ? $nextDue?->toDateString() : null,
        ]);

        return redirect()->route('memberships.index')->with('success', 'Matrícula atualizada com sucesso!');
    }

    /**
     * Pause billing — and, if asked, the patient's fixed-slot classes — until
     * a return date or until resumed by hand.
     */
    public function pause(Request $request, Membership $membership)
    {
        if ($membership->status !== 'active') {
            return back()->with('error', 'Só matrículas ativas podem ser pausadas.');
        }

        $validated = $request->validate([
            'paused_until' => 'nullable|date|after:today',
            'pauses_classes' => 'boolean',
        ], [
            'paused_until.after' => 'A data de retorno precisa ser depois de hoje.',
        ]);

        $removed = $membership->pause(
            isset($validated['paused_until']) ? Carbon::parse($validated['paused_until']) : null,
            (bool) ($validated['pauses_classes'] ?? false),
        );

        $message = 'Matrícula pausada. As cobranças ficam suspensas durante a pausa.';
        if ($removed > 0) {
            $message .= " {$removed} aula(s) do horário fixo saíram da agenda.";
        }

        return back()->with('success', $message);
    }

    public function resume(Membership $membership)
    {
        if ($membership->status !== 'paused') {
            return back()->with('error', 'Esta matrícula não está pausada.');
        }

        $membership->resume(Carbon::today());

        return back()->with('success', 'Matrícula retomada. As cobranças e as aulas do horário fixo voltaram.');
    }

    public function destroy(Membership $membership)
    {
        // Delete the unpaid charges linked to this membership
        $membership->financialTransactions()->whereIn('status', FinancialTransaction::OPEN_STATUSES)->delete();
        $membership->delete();

        return redirect()->route('memberships.index')->with('success', 'Matrícula excluída.');
    }

    public function renew(Membership $membership)
    {
        if ($membership->status === 'cancelled') {
            return redirect()->route('memberships.show', $membership)
                ->with('error', 'Matrículas canceladas não podem ser renovadas.');
        }

        if (! $membership->end_date) {
            return redirect()->route('memberships.show', $membership)
                ->with('error', 'Matrículas contínuas não precisam ser renovadas.');
        }

        $membership->loadMissing('commercialPlan');

        $oldStart = Carbon::parse($membership->start_date);
        $oldEnd = Carbon::parse($membership->end_date);

        // Duration in whole months, preferring the plan's contracted duration
        // (renewing by raw day count drifts monthly plans out of alignment).
        $durationMonths = $membership->commercialPlan?->duration_months
            ?? max(1, $oldStart->diffInMonths($oldEnd));

        $newStart = $oldEnd->copy()->addDay();
        $newEnd = $newStart->copy()->addMonthsNoOverflow($durationMonths)->subDay();

        // Re-read the current plan price so renewals reflect price changes.
        $price = $membership->commercialPlan?->price ?? $membership->price;

        $newMembership = DB::transaction(function () use ($membership, $newStart, $newEnd, $price) {
            if ($membership->status === 'active') {
                $membership->update(['status' => 'expired']);
            }

            $newMembership = Membership::create([
                'patient_id' => $membership->patient_id,
                'commercial_plan_id' => $membership->commercial_plan_id,
                'plan_name' => $membership->plan_name,
                'start_date' => $newStart->format('Y-m-d'),
                'end_date' => $newEnd->format('Y-m-d'),
                'price' => $price,
                'status' => 'active',
                'billing_cycle' => $membership->billing_cycle,
                'billing_day' => $membership->billing_day,
            ]);

            if ($newMembership->price > 0) {
                // Month-based cycles keep their day of the month.
                $firstDue = $newMembership->billing_day
                    ? $newStart->copy()->day(min($newMembership->billing_day, $newStart->daysInMonth))
                    : $newStart->copy();
                $newMembership->createCharge($firstDue);
                $newMembership->update([
                    'last_billed_at' => $firstDue->toDateString(),
                    'next_billing_date' => $newMembership->billing_cycle
                        ? Membership::nextDueAfter($firstDue, $newMembership->billing_cycle, $newMembership->billing_day)->toDateString()
                        : null,
                ]);
            }

            return $newMembership;
        });

        return redirect()->route('memberships.show', $newMembership)->with('success', 'Matrícula renovada com sucesso!');
    }

    /**
     * Day of the month month-based cycles are due on; weekly cycles have none.
     */
    private function billingDayFor(?string $cycle, CarbonInterface $due): ?int
    {
        return $cycle && isset(Membership::BILLING_CYCLES[$cycle]['months']) ? $due->day : null;
    }
}
