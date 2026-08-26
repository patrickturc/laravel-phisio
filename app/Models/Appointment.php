<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use BelongsToTenant, HasUuids;

    public $timestamps = false;

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
        return $this->belongsToMany(Patient::class)
            ->withPivot('status', 'reminder_sent_at', 'membership_id', 'missed_justified', 'missed_reason')
            ->withTimestamps();
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
