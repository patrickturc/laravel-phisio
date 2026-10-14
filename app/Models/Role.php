<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Contracts\Role as RoleContract;
use Spatie\Permission\Exceptions\RoleAlreadyExists;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * An access profile owned by one clinic. Each tenant has its own copy of the
 * default roles, so editing or deleting "Recepcionista" in one clinic never
 * touches another. Roles without a tenant belong to the platform (dev admins).
 *
 * Every name/id lookup Spatie does (assignRole('Recepcionista'),
 * User::role(...), route binding) is confined to the current tenant.
 *
 * @property string|null $tenant_id
 */
class Role extends SpatieRole
{
    public const ADMIN = 'Administrador';

    /**
     * The roles every clinic starts with. '*' grants every permission.
     *
     * @var array<string, list<string>>
     */
    public const DEFAULTS = [
        self::ADMIN => ['*'],
        'Recepcionista' => [
            'dashboard.view',
            'patients.manage.view',
            'patients.manage.create',
            'patients.manage.edit',
            'appointments.manage.view',
            'appointments.manage.create',
            'appointments.manage.edit',
            'group_classes.manage.view',
            'memberships.manage.view',
            'memberships.manage.create',
            'commercial_plans.manage.view',
            'financial.transactions.view',
            'financial.transactions.create',
        ],
        'Fisioterapeuta' => [
            'dashboard.view',
            'patients.manage.view',
            'appointments.manage.view',
            'group_classes.manage.view',
            'evolutions.manage.view',
            'evolutions.manage.create',
            'evolutions.manage.edit',
            'treatment_plans.manage.view',
            'treatment_plans.manage.create',
            'treatment_plans.manage.edit',
            'calendar.sync.manage',
            'professional.attend',
        ],
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * The tenant whose roles the current request may see: the signed-in
     * user's clinic, or none (platform roles) for dev admins and the console.
     */
    public static function currentTenantId(): ?string
    {
        if (! auth()->hasUser()) {
            return null;
        }

        /** @var User $user */
        $user = auth()->user();

        return $user->is_dev_admin ? null : $user->tenant_id;
    }

    public function scopeForTenant(Builder $query, ?string $tenantId): Builder
    {
        return $tenantId === null
            ? $query->whereNull('tenant_id')
            : $query->where('tenant_id', $tenantId);
    }

    /**
     * @return RoleContract|Role
     *
     * @throws RoleAlreadyExists
     */
    public static function create(array $attributes = [])
    {
        $attributes['tenant_id'] = array_key_exists('tenant_id', $attributes)
            ? $attributes['tenant_id']
            : static::currentTenantId();

        $attributes['guard_name'] ??= 'web';

        if (static::findByParam(['name' => $attributes['name'], 'guard_name' => $attributes['guard_name'], 'tenant_id' => $attributes['tenant_id']])) {
            throw RoleAlreadyExists::create($attributes['name'], $attributes['guard_name']);
        }

        return static::query()->create($attributes);
    }

    /**
     * @return RoleContract|Role
     */
    public static function findOrCreate($name, ?string $guardName = null): RoleContract
    {
        $guardName ??= 'web';

        return static::findByParam(['name' => $name, 'guard_name' => $guardName])
            ?? static::query()->create([
                'name' => $name,
                'guard_name' => $guardName,
                'tenant_id' => static::currentTenantId(),
            ]);
    }

    /**
     * Spatie resolves role names and ids through here; scope it to one tenant
     * so a clinic can never pick up another clinic's role.
     *
     * @return RoleContract|Role|null
     */
    protected static function findByParam(array $params = []): ?RoleContract
    {
        $tenantId = array_key_exists('tenant_id', $params) ? $params['tenant_id'] : static::currentTenantId();
        unset($params['tenant_id']);

        $query = static::query()->forTenant($tenantId);

        foreach ($params as $key => $value) {
            $query->where($key, $value);
        }

        return $query->first();
    }

    /**
     * @param  mixed  $value
     * @param  string|null  $field
     */
    public function resolveRouteBinding($value, $field = null): ?Model
    {
        return static::query()
            ->forTenant(static::currentTenantId())
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->first();
    }

    /**
     * Create whichever default roles the clinic is missing. Roles it already
     * has are left alone, since the clinic may have customised them.
     */
    public static function provisionDefaultsFor(Tenant $tenant): void
    {
        $existing = static::query()->forTenant($tenant->id)->pluck('name')->all();
        $available = Permission::where('guard_name', 'web')->pluck('name');

        foreach (self::DEFAULTS as $name => $permissions) {
            if (in_array($name, $existing, true)) {
                continue;
            }

            $role = static::query()->create([
                'name' => $name,
                'guard_name' => 'web',
                'tenant_id' => $tenant->id,
            ]);

            $role->syncPermissions(
                $permissions === ['*'] ? $available : $available->intersect($permissions)->values()
            );
        }
    }

    /**
     * The clinic's full-access role, created with the other defaults when the
     * clinic does not have it yet.
     */
    public static function ownerFor(Tenant $tenant): self
    {
        static::provisionDefaultsFor($tenant);

        return static::query()->forTenant($tenant->id)->where('name', self::ADMIN)->firstOrFail();
    }
}
