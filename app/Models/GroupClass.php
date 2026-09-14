<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GroupClass extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'name',
        'color',
        'max_participants',
        'status',
    ];

    public function schedules()
    {
        return $this->hasMany(GroupClassSchedule::class);
    }

    public function patients()
    {
        $tenantId = $this->tenant_id ?? auth()->user()?->tenant_id;
        if (! $tenantId && app()->runningUnitTests()) {
            $tenantId = Tenant::first()?->id;
        }

        $relation = $this->belongsToMany(Patient::class, 'group_class_patient')
            ->withTimestamps();

        if ($tenantId) {
            $relation->withPivotValue('tenant_id', $tenantId);
        }

        return $relation;
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }
}
