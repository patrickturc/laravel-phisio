<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemAnnouncement extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'title',
        'message',
        'type',
        'target_tenant_id',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'target_tenant_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function (Builder $q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    public function scopeForTenant(Builder $query, ?string $tenantId = null): Builder
    {
        return $query->where(function (Builder $q) use ($tenantId) {
            $q->whereNull('target_tenant_id');
            if ($tenantId) {
                $q->orWhere('target_tenant_id', $tenantId);
            }
        });
    }
}
