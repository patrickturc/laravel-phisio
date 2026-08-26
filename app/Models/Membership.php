<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
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
        'billing_day',
        'last_billed_at',
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
            'price' => 'decimal:2',
            'billing_day' => 'integer',
        ];
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
            ->where('end_date', '>=', $date)
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
                                $this->end_date->toDateString(),
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
