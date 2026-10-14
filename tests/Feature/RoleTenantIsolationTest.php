<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

function clinicAdmin(): User
{
    foreach ([
        'dashboard.view', 'patients.manage.view',
        'settings.users.view', 'settings.users.create', 'settings.users.edit',
        'settings.roles.view', 'settings.roles.create', 'settings.roles.edit', 'settings.roles.delete',
    ] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $tenant = Tenant::factory()->create(['status' => 'active', 'max_users' => 10]);
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->assignRole(Role::ownerFor($tenant));

    return $user;
}

function clinicRole(User $admin, string $name): Role
{
    return Role::forTenant($admin->tenant_id)->where('name', $name)->firstOrFail();
}

test('each clinic gets its own copy of the default roles', function () {
    $adminA = clinicAdmin();
    $adminB = clinicAdmin();

    foreach (array_keys(Role::DEFAULTS) as $name) {
        expect(clinicRole($adminA, $name)->id)->not->toBe(clinicRole($adminB, $name)->id);
    }

    expect(clinicRole($adminA, 'Recepcionista')->permissions->pluck('name')->all())
        ->toContain('patients.manage.view')
        ->not->toContain('settings.roles.edit');
});

test('editing a default role only changes it for the clinic that edited it', function () {
    $adminA = clinicAdmin();
    $adminB = clinicAdmin();

    $this->actingAs($adminA)
        ->put(route('roles.update', clinicRole($adminA, 'Recepcionista')), [
            'name' => 'Recepção',
            'permissions' => ['dashboard.view'],
        ])
        ->assertSessionHasNoErrors();

    $roleB = clinicRole($adminB, 'Recepcionista');

    expect($roleB->permissions->pluck('name'))->toContain('patients.manage.view')
        ->and(Role::forTenant($adminA->tenant_id)->where('name', 'Recepção')->exists())->toBeTrue();
});

test('a clinic cannot edit or delete another clinic role', function () {
    $adminA = clinicAdmin();
    $adminB = clinicAdmin();
    $roleB = clinicRole($adminB, 'Recepcionista');

    $this->actingAs($adminA)
        ->put(route('roles.update', $roleB), ['name' => 'Hackeado', 'permissions' => []])
        ->assertNotFound();

    $this->actingAs($adminA)
        ->delete(route('roles.destroy', $roleB))
        ->assertNotFound();

    expect($roleB->fresh())->not->toBeNull()
        ->and($roleB->fresh()->name)->toBe('Recepcionista');
});

test('the roles page lists only the clinic roles', function () {
    $adminA = clinicAdmin();
    $adminB = clinicAdmin();
    Role::create(['name' => 'Gestor B', 'tenant_id' => $adminB->tenant_id]);

    $this->actingAs($adminA)
        ->get(route('roles.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('roles', count(Role::DEFAULTS))
            ->where('roles', fn ($roles) => collect($roles)->every(fn ($role) => $role['tenant_id'] === $adminA->tenant_id)));
});

test('two clinics can create roles with the same name', function () {
    $adminA = clinicAdmin();
    $adminB = clinicAdmin();

    $this->actingAs($adminA)->post(route('roles.store'), ['name' => 'Estagiário', 'permissions' => []])
        ->assertSessionHasNoErrors();
    $this->actingAs($adminB)->post(route('roles.store'), ['name' => 'Estagiário', 'permissions' => []])
        ->assertSessionHasNoErrors();
    $this->actingAs($adminB)->post(route('roles.store'), ['name' => 'Estagiário', 'permissions' => []])
        ->assertSessionHasErrors('name');

    expect(Role::where('name', 'Estagiário')->count())->toBe(2);
});

test('a user cannot be given a role from another clinic', function () {
    $adminA = clinicAdmin();
    $adminB = clinicAdmin();
    Role::create(['name' => 'Gestor B', 'tenant_id' => $adminB->tenant_id]);

    $this->actingAs($adminA)->post(route('users.store'), [
        'name' => 'Nova',
        'email' => 'nova@example.com',
        'password' => 'password123',
        'role' => 'Gestor B',
    ])->assertSessionHasErrors('role');

    $this->actingAs($adminA)->post(route('users.store'), [
        'name' => 'Recepção',
        'email' => 'recepcao@example.com',
        'password' => 'password123',
        'role' => 'Recepcionista',
    ])->assertSessionHasNoErrors();

    $created = User::where('email', 'recepcao@example.com')->firstOrFail();

    expect($created->roles->pluck('id')->all())->toBe([clinicRole($adminA, 'Recepcionista')->id]);
});

test('signing up a clinic creates its own roles', function () {
    Permission::findOrCreate('dashboard.view', 'web');

    $this->post(route('register.store'), [
        'organization_name' => 'Studio Novo',
        'document' => '11.222.333/0001-81',
        'name' => 'Dona',
        'email' => 'dona@example.com',
        'phone' => '11999990000',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => '1',
    ]);

    $owner = User::where('email', 'dona@example.com')->firstOrFail();

    expect(Role::forTenant($owner->tenant_id)->pluck('name')->sort()->values()->all())
        ->toBe(collect(array_keys(Role::DEFAULTS))->sort()->values()->all())
        ->and($owner->roles->first()->tenant_id)->toBe($owner->tenant_id)
        ->and($owner->can('dashboard.view'))->toBeTrue();
});

test('the migration gives each clinic its own copy of the shared roles', function () {
    $migration = require database_path('migrations/2027_01_13_000000_make_roles_tenant_scoped.php');
    $migration->down();

    $view = Permission::findOrCreate('patients.manage.view', 'web');
    $tenantA = Tenant::factory()->create();
    $tenantB = Tenant::factory()->create();
    $receptionA = User::factory()->create(['tenant_id' => $tenantA->id]);
    $receptionB = User::factory()->create(['tenant_id' => $tenantB->id]);
    $devAdmin = User::factory()->create(['tenant_id' => null, 'is_dev_admin' => true]);

    $shared = fn (string $name) => DB::table('roles')->insertGetId(['name' => $name, 'guard_name' => 'web']);
    $reception = $shared('Recepcionista');
    $admin = $shared('Administrador');
    $custom = $shared('Gestor');
    DB::table('role_has_permissions')->insert(['permission_id' => $view->id, 'role_id' => $reception]);
    DB::table('model_has_roles')->insert([
        ['role_id' => $reception, 'model_type' => User::class, 'model_id' => $receptionA->id],
        ['role_id' => $reception, 'model_type' => User::class, 'model_id' => $receptionB->id],
        ['role_id' => $custom, 'model_type' => User::class, 'model_id' => $receptionB->id],
        ['role_id' => $admin, 'model_type' => User::class, 'model_id' => $devAdmin->id],
    ]);

    $migration->up();

    $roleA = $receptionA->fresh()->roles->sole();
    $roleB = $receptionB->fresh()->roles->firstWhere('name', 'Recepcionista');

    expect($roleA->tenant_id)->toBe($tenantA->id)
        ->and($roleB->tenant_id)->toBe($tenantB->id)
        ->and($roleA->id)->not->toBe($roleB->id)
        ->and($roleA->permissions->pluck('name')->all())->toBe(['patients.manage.view'])
        // A custom role is copied only to the clinic whose users hold it.
        ->and(Role::forTenant($tenantB->id)->where('name', 'Gestor')->exists())->toBeTrue()
        ->and(Role::forTenant($tenantA->id)->where('name', 'Gestor')->exists())->toBeFalse()
        // Both clinics get every default role.
        ->and(Role::forTenant($tenantA->id)->count())->toBe(count(Role::DEFAULTS))
        // The dev admin keeps the platform role.
        ->and($devAdmin->fresh()->roles->sole()->id)->toBe($admin);
});
