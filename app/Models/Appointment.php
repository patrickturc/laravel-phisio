<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

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
        'notes',
        'title',
        'type',
        'status',
        'max_participants',
        'group_class_id',
        'schedule_id',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
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
            ->withPivot('status', 'reminder_sent_at', 'membership_id', 'missed_justified', 'missed_reason')
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
}
