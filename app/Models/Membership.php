<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class Membership extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'commercial_plan_id',
        'plan_name',
        'start_date',
        'end_date',
        'price',
        'status',
        'billing_cycle',
        'billing_day',
        'last_billed_at',
        'next_billing_date',
        'paused_at',
        'paused_until',
        'pauses_classes',
    ];

    public const STATUSES = ['active', 'paused', 'expired', 'cancelled'];

    /**
     * Billing cycles: a length in days (weekly ones) or in months (the rest,
     * due on the same day of the month).
     *
     * @var array<string, array{label: string, days?: int, months?: int}>
     */
    public const BILLING_CYCLES = [
        'weekly' => ['label' => 'Semanal', 'days' => 7],
        'biweekly' => ['label' => 'Quinzenal', 'days' => 14],
        'monthly' => ['label' => 'Mensal', 'months' => 1],
        'bimonthly' => ['label' => 'Bimestral', 'months' => 2],
        'quarterly' => ['label' => 'Trimestral', 'months' => 3],
        'semiannual' => ['label' => 'Semestral', 'months' => 6],
        'annual' => ['label' => 'Anual', 'months' => 12],
    ];

    public function commercialPlan()
    {
        return $this->belongsTo(CommercialPlan::class);
    }

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'last_billed_at' => 'date',
            'next_billing_date' => 'date:Y-m-d',
            'paused_at' => 'date:Y-m-d',
            'paused_until' => 'date:Y-m-d',
            'pauses_classes' => 'boolean',
            'price' => 'decimal:2',
            'billing_day' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // A day of the month without a cycle is how memberships were billed
        // before cycles existed: monthly.
        static::saving(function (Membership $membership) {
            if (! $membership->billing_cycle && $membership->billing_day) {
                $membership->billing_cycle = 'monthly';
            }
        });
    }

    /**
     * Due date of the charge after $due. Month-based cycles keep the same
     * day of the month ($billingDay), clamped to short months.
     */
    public static function nextDueAfter(CarbonInterface $due, string $cycle, ?int $billingDay = null): Carbon
    {
        $definition = self::BILLING_CYCLES[$cycle];

        if (isset($definition['days'])) {
            return Carbon::parse($due)->addDays($definition['days']);
        }

        $next = Carbon::parse($due)->startOfMonth()->addMonthsNoOverflow($definition['months']);

        return $next->day(min($billingDay ?? Carbon::parse($due)->day, $next->daysInMonth));
    }

    /**
     * Due date of the next charge to generate, or null for a single-charge
     * membership.
     */
    public function nextBillingDate(): ?Carbon
    {
        // Casts hand out immutable dates; callers here get a mutable copy.
        if ($this->next_billing_date) {
            return Carbon::parse($this->next_billing_date);
        }

        if (! $this->billing_cycle) {
            return null;
        }

        // Memberships from before next_billing_date existed: one charge per
        // calendar month on the billing day, as the old generator did.
        $today = Carbon::today();
        $month = $this->last_billed_at && $this->last_billed_at->format('Y-m') >= $today->format('Y-m')
            ? $today->copy()->startOfMonth()->addMonthNoOverflow()
            : $today->copy()->startOfMonth();
        $startMonth = Carbon::parse($this->start_date)->startOfMonth();
        if ($startMonth->gt($month)) {
            $month = $startMonth;
        }

        return $month->day(min($this->billing_day ?? $this->start_date->day, $month->daysInMonth));
    }

    /**
     * How far ahead charges are generated: until the end of the current month
     * for month-based cycles (as before), a cycle minus a day for weekly ones.
     */
    public function billingHorizon(CarbonInterface $today): Carbon
    {
        $days = self::BILLING_CYCLES[$this->billing_cycle]['days'] ?? null;

        return $days
            ? Carbon::parse($today)->addDays($days - 1)
            : Carbon::parse($today)->endOfMonth();
    }

    /**
     * Create the pending charge of one billing cycle.
     */
    public function createCharge(CarbonInterface $due): FinancialTransaction
    {
        $this->loadMissing('commercialPlan', 'patient');

        $planName = $this->commercialPlan?->name ?? $this->plan_name ?? 'Plano';
        $patientName = $this->patient?->name ?? 'Aluno';

        // tenant_id is explicit: the daily command runs with nobody logged in.
        return FinancialTransaction::create([
            'tenant_id' => $this->tenant_id,
            'type' => 'income',
            'amount' => $this->price,
            'date' => $due->toDateString(),
            'due_date' => $due->toDateString(),
            'description' => "Mensalidade: {$planName} — {$patientName}",
            'category' => 'Mensalidade',
            'status' => 'pending',
            'patient_id' => $this->patient_id,
            'membership_id' => $this->id,
        ]);
    }

    /**
     * Generate every charge due up to the billing horizon, never past the end
     * date. Returns how many were created; running it again creates none.
     */
    public function generateDueCharges(CarbonInterface $today): int
    {
        if ($this->status !== 'active' || ! $this->billing_cycle || $this->price <= 0) {
            return 0;
        }

        $next = $this->nextBillingDate();
        $horizon = $this->billingHorizon($today);
        $created = 0;

        // Bounded so bad data can never loop forever.
        while ($next && $next->lte($horizon) && (! $this->end_date || $next->lte($this->end_date)) && $created < 60) {
            DB::transaction(function () use ($next) {
                $this->createCharge($next);
                $this->last_billed_at = $next->copy();
            });

            $next = self::nextDueAfter($next, $this->billing_cycle, $this->billing_day);
            $created++;
        }

        $this->next_billing_date = $next;
        $this->save();

        return $created;
    }

    /**
     * Pause billing (and optionally the fixed-slot classes) from today until
     * $until, or until resumed by hand. Returns how many upcoming classes were
     * taken off the agenda.
     */
    public function pause(?CarbonInterface $until, bool $pausesClasses): int
    {
        $today = Carbon::today();
        $removed = 0;

        DB::transaction(function () use ($today, $until, $pausesClasses, &$removed) {
            $this->update([
                'status' => 'paused',
                'paused_at' => $today->toDateString(),
                'paused_until' => $until?->toDateString(),
                'pauses_classes' => $pausesClasses,
            ]);

            if (! $pausesClasses) {
                return;
            }

            // Upcoming fixed-slot classes inside the pause nobody attended
            // yet. They are removed (not cancelled) so that, on resuming, the
            // generator books those weeks again from that day on.
            Appointment::query()
                ->where('tenant_id', $this->tenant_id)
                ->whereHas('recurringBooking', fn ($query) => $query->where('patient_id', $this->patient_id))
                ->where('appointment_date', '>=', $today->toDateString())
                ->when($until, fn ($query) => $query->where('appointment_date', '<', $until->toDateString()))
                ->where('status', 'scheduled')
                ->whereDoesntHave('patients', fn ($query) => $query->where('appointment_patient.status', '!=', 'scheduled'))
                ->get()
                ->each(function (Appointment $appointment) use (&$removed) {
                    $appointment->patients()->detach();
                    $appointment->delete();
                    $removed++;
                });
        });

        return $removed;
    }

    /**
     * End the pause: the end date moves by the days paused, the cycles that
     * fell inside the pause are skipped, and the fixed-slot classes come back.
     */
    public function resume(CarbonInterface $today): void
    {
        $pausedDays = $this->paused_at ? (int) $this->paused_at->diffInDays($today) : 0;

        $next = $this->nextBillingDate();
        while ($next && $this->billing_cycle && $next->lt($today)) {
            $next = self::nextDueAfter($next, $this->billing_cycle, $this->billing_day);
        }

        $this->update([
            'status' => 'active',
            'end_date' => $this->end_date?->copy()->addDays($pausedDays)->toDateString(),
            'next_billing_date' => $next?->toDateString(),
            'paused_at' => null,
            'paused_until' => null,
            'pauses_classes' => false,
        ]);

        RecurringBooking::active()
            ->where('patient_id', $this->patient_id)
            ->get()
            ->each->generateAppointments();
    }

    /**
     * Whether the patient's classes are paused on that day.
     */
    public function pausesClassesOn(CarbonInterface $day): bool
    {
        return $this->status === 'paused'
            && $this->pauses_classes
            && $this->paused_at?->lte($day)
            && ($this->paused_until === null || $day->lt($this->paused_until));
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }

    /**
     * Total sessions included by the plan (null = unlimited).
     */
    public function getSessionsTotalAttribute(): ?int
    {
        return $this->commercialPlan?->sessions_total;
    }

    /**
     * The active membership a session on $date should consume for a patient,
     * preferring one whose plan has a limited session count.
     */
    public static function activeForAttendance(string $patientId, string $date): ?self
    {
        return self::with('commercialPlan')
            ->where('patient_id', $patientId)
            ->where('status', 'active')
            ->where('start_date', '<=', $date)
            ->where(fn ($query) => $query->whereNull('end_date')->orWhere('end_date', '>=', $date))
            ->get()
            ->sortByDesc(fn (self $m) => $m->commercialPlan?->sessions_total !== null ? 1 : 0)
            ->first();
    }

    /**
     * Attended sessions consumed. Counts pivots explicitly linked to this
     * membership, plus legacy attended pivots in the period with no link.
     */
    public function getSessionsUsedAttribute(): int
    {
        return DB::table('appointment_patient')
            ->join('appointments', 'appointments.id', '=', 'appointment_patient.appointment_id')
            ->where('appointments.tenant_id', $this->tenant_id)
            ->where('appointment_patient.status', 'attended')
            ->where(function ($query) {
                $query->where('appointment_patient.membership_id', $this->id)
                    ->orWhere(function ($legacy) {
                        $legacy->whereNull('appointment_patient.membership_id')
                            ->where('appointment_patient.patient_id', $this->patient_id)
                            ->whereBetween('appointments.appointment_date', [
                                $this->start_date->toDateString(),
                                $this->end_date?->toDateString() ?? '9999-12-31',
                            ]);
                    });
            })
            ->count();
    }

    /**
     * Remaining sessions (null = unlimited).
     */
    public function getSessionsRemainingAttribute(): ?int
    {
        $total = $this->sessions_total;

        if ($total === null) {
            return null;
        }

        return max(0, $total - $this->sessions_used);
    }

    /**
     * Weeks per month used to turn a plan's weekly frequency into a monthly
     * session allowance (e.g. 2x/week → 8 classes/month).
     */
    public const WEEKS_PER_MONTH = 4;

    /**
     * Monthly session allowance derived from the plan's weekly frequency
     * (null = no monthly cap / unlimited).
     */
    public function getMonthlyAllowanceAttribute(): ?int
    {
        $perWeek = $this->commercialPlan?->sessions_per_week;

        return $perWeek ? $perWeek * self::WEEKS_PER_MONTH : null;
    }

    /**
     * Sessions the patient has consumed in the CURRENT calendar month: every
     * attended session plus every UNJUSTIFIED miss (a justified miss does not
     * consume, leaving room for a free make-up).
     */
    public function getSessionsUsedThisMonthAttribute(): int
    {
        $now = now();

        return DB::table('appointment_patient')
            ->join('appointments', 'appointments.id', '=', 'appointment_patient.appointment_id')
            ->where('appointments.tenant_id', $this->tenant_id)
            ->where('appointment_patient.patient_id', $this->patient_id)
            ->whereYear('appointments.appointment_date', $now->year)
            ->whereMonth('appointments.appointment_date', $now->month)
            ->where(function ($q) {
                $q->where('appointment_patient.status', 'attended')
                    ->orWhere(function ($missed) {
                        $missed->where('appointment_patient.status', 'missed')
                            ->where('appointment_patient.missed_justified', false);
                    });
            })
            ->count();
    }

    /**
     * Remaining sessions in the current month (null = no monthly cap).
     */
    public function getSessionsRemainingThisMonthAttribute(): ?int
    {
        $allowance = $this->monthly_allowance;

        if ($allowance === null) {
            return null;
        }

        return max(0, $allowance - $this->sessions_used_this_month);
    }
}
