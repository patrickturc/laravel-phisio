<?php

namespace App\Concerns;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Provides automatic tenant scoping for Eloquent models.
 *
 * - Registers a global scope that filters queries by the authenticated
 *   user's tenant_id (dev admins bypass the scope).
 * - Auto-fills tenant_id on the "creating" event when not already set.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::creating(function (Model $model): void {
            if (! auth()->check()) {
                return;
            }

            /** @var \App\Models\User $user */
            $user = auth()->user();

            if ($user->is_dev_admin) {
                return;
            }

            $model->tenant_id ??= $user->tenant_id;
        });

        static::addGlobalScope('tenant', function (Builder $builder): void {
            if (! auth()->check()) {
                return;
            }

            /** @var \App\Models\User $user */
            $user = auth()->user();

            if ($user->is_dev_admin) {
                return;
            }

            $builder->where($builder->getModel()->getTable().'.tenant_id', $user->tenant_id);
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
