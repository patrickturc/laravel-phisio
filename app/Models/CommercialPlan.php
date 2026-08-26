<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CommercialPlan extends Model
{
    use BelongsToTenant, HasUuids;

    protected $fillable = [
        'tenant_id',
        'name',
        'category',
        'price',
        'duration_months',
        'sessions_total',
        'sessions_per_week',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'duration_months' => 'integer',
            'sessions_total' => 'integer',
            'sessions_per_week' => 'integer',
        ];
    }
}
