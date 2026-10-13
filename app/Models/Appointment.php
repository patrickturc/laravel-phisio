<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use BelongsToTenant, HasUuids;

    public $timestamps = false;

    /**
     * Eloquent's date-cast columns are always written to the database using
     * this format, regardless of a "date" vs "datetime" cast, and regardless
     * of what format the cast declares for reading. Left at the default
     * (Y-m-d H:i:s), appointment_date is stored with a trailing "00:00:00" on
     * sqlite (no native DATE type), which then fails exact-match and
     * whereBetween date-string comparisons. Postgres silently swallows this by
     * coercing to its native DATE column type, hiding the bug there — so it
     * only surfaces in local dev and tests, where it breaks scheduling
     * conflict checks and any query that compares appointment_date directly.
     */
    protected $dateFormat = 'Y-m-d';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'appointment_date',
        'start_time',
        'duration_minutes',
        'room',
        'notes',
        'title',
        'type',
        'status',
        'max_participants',
        'group_class_id',
        'schedule_id',
        'recurring_booking_id',
        'recurrence_date',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
            'recurrence_date' => 'date',
            'max_participants' => 'integer',
        ];
    }

    public function patients()
    {
        $tenantId = $this->tenant_id ?? auth()->user()?->tenant_id;
        if (! $tenantId && app()->runningUnitTests()) {
            $tenantId = Tenant::first()?->id;
        }

        $relation = $this->belongsToMany(Patient::class)
            ->withPivot('status', 'reminder_sent_at', 'whatsapp_reminder_at', 'confirmed_at', 'membership_id', 'missed_justified', 'missed_reason')
            ->withTimestamps();

        if ($tenantId) {
            $relation->withPivotValue('tenant_id', $tenantId);
        }

        return $relation;
    }

    public function schedule()
    {
        return $this->belongsTo(GroupClassSchedule::class, 'schedule_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function groupClass()
    {
        return $this->belongsTo(GroupClass::class);
    }

    public function evolutions()
    {
        return $this->hasMany(Evolution::class, 'agendamento_id');
    }

    public function recurringBooking(): BelongsTo
    {
        return $this->belongsTo(RecurringBooking::class);
    }

    /**
     * Students holding a place at this date and start time, across every
     * appointment of the clinic (individual sessions and classes alike).
     * Cancelled sessions and cancelled students free their place. Times are
     * compared as "HH:MM" in PHP because the column holds "08:00" or
     * "08:00:00" depending on the driver.
     */
    public static function studentsInSlot(
        string $tenantId,
        string $date,
        string $startTime,
        ?string $exceptAppointmentId = null,
    ): int {
        $time = substr($startTime, 0, 5);

        return static::query()
            ->where('tenant_id', $tenantId)
            ->where('appointment_date', $date)
            ->where('status', '!=', 'cancelled')
            ->when($exceptAppointmentId, fn ($query) => $query->whereKeyNot($exceptAppointmentId))
            ->withCount(['patients as students_count' => fn ($query) => $query->where('appointment_patient.status', '!=', 'cancelled')])
            ->get(['id', 'start_time'])
            ->filter(fn (Appointment $appointment): bool => substr((string) $appointment->start_time, 0, 5) === $time)
            ->sum('students_count');
    }

    /**
     * Whether the patient already holds a place at this date and start time.
     */
    public static function patientBookedAt(
        string $tenantId,
        string $patientId,
        string $date,
        string $startTime,
        ?string $exceptAppointmentId = null,
    ): bool {
        $time = substr($startTime, 0, 5);

        return static::query()
            ->where('tenant_id', $tenantId)
            ->where('appointment_date', $date)
            ->where('status', '!=', 'cancelled')
            ->when($exceptAppointmentId, fn ($query) => $query->whereKeyNot($exceptAppointmentId))
            ->whereHas('patients', fn ($query) => $query
                ->where('patients.id', $patientId)
                ->where('appointment_patient.status', '!=', 'cancelled'))
            ->get(['id', 'start_time'])
            ->contains(fn (Appointment $appointment): bool => substr((string) $appointment->start_time, 0, 5) === $time);
    }
}
