<?php

namespace App\Concerns;

use App\Models\Tenant;
use App\Models\User;
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
            if (auth()->hasUser()) {
                /** @var User|null $user */
                $user = auth()->user();

                if ($user && ! $user->is_dev_admin) {
                    $model->tenant_id ??= $user->tenant_id;
                }
            }

            if (empty($model->tenant_id) && app()->runningUnitTests() && ! $model instanceof User) {
                $model->tenant_id = Tenant::first()?->id ?? Tenant::factory()->create()->id;
            }
        });

        static::addGlobalScope('tenant', function (Builder $builder): void {
            if (! auth()->hasUser()) {
                return;
            }

            /** @var User|null $user */
            $user = auth()->user();

            if (! $user || $user->is_dev_admin) {
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
