<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class GroupClassSchedule extends Model
{
    use BelongsToTenant, HasUuids;

    protected $fillable = [
        'tenant_id',
        'group_class_id',
        'day_of_week',
        'start_time',
        'duration_minutes',
    ];

    public function groupClass()
    {
        return $this->belongsTo(GroupClass::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'schedule_id');
    }
}
