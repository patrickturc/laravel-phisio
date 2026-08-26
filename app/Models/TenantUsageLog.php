<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantUsageLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'reference_date',
        'patients_count',
        'appointments_count',
        'evolutions_count',
        'financial_transactions_count',
        'users_count',
        'storage_mb',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reference_date' => 'date',
            'patients_count' => 'integer',
            'appointments_count' => 'integer',
            'evolutions_count' => 'integer',
            'financial_transactions_count' => 'integer',
            'users_count' => 'integer',
            'storage_mb' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
