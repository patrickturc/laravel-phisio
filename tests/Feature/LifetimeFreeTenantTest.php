<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Permission;

function lifetimeDevAdmin(): User
{
    return User::factory()->create(['tenant_id' => null, 'is_dev_admin' => true]);
}

test('a dev admin turns free unlimited access on and off', function () {
    $tenant = Tenant::factory()->create([
        'plan' => 'free',
        'trial_ends_at' => now()->addDays(3),
        'plan_requested_at' => now(),
        'requested_plan' => 'basic',
    ]);

    $this->actingAs(lifetimeDevAdmin())
        ->post(route('dev-admin.tenants.toggle-lifetime-free', $tenant))
        ->assertSessionHas('success');

    $tenant->refresh();
    expect($tenant->isLifetimeFree())->toBeTrue()
        ->and($tenant->accessStatus())->toBe('lifetime_free')
        ->and($tenant->isOnTrial())->toBeFalse()
        ->and($tenant->hasPendingPlanRequest())->toBeFalse()
        ->and($tenant->requested_plan)->toBeNull()
        ->and(Tenant::onTrial()->whereKey($tenant->id)->exists())->toBeFalse();

    $this->actingAs(lifetimeDevAdmin())
        ->post(route('dev-admin.tenants.toggle-lifetime-free', $tenant));

    expect($tenant->fresh()->isLifetimeFree())->toBeFalse();
});

test('only dev admins can grant free unlimited access', function () {
    $tenant = Tenant::factory()->create();
    $clinicUser = User::factory()->create(['tenant_id' => $tenant->id]);

    $this->actingAs($clinicUser)
        ->post(route('dev-admin.tenants.toggle-lifetime-free', $tenant))
        ->assertForbidden();

    expect($tenant->fresh()->isLifetimeFree())->toBeFalse();
});

test('a clinic with free unlimited access never expires', function () {
    Permission::findOrCreate('dashboard.view', 'web');
    $tenant = Tenant::factory()->create([
        'plan' => 'free',
        'status' => 'active',
        'trial_ends_at' => now()->subDay(),
        'lifetime_free_at' => now(),
    ]);
    $user = User::factory()->create(['tenant_id' => $tenant->id]);
    $user->givePermissionTo('dashboard.view');

    expect($tenant->isTrialExpired())->toBeFalse()
        ->and(Tenant::trialExpired()->whereKey($tenant->id)->exists())->toBeFalse();

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});

test('a clinic with free unlimited access has no user limit', function () {
    foreach (['settings.users.view', 'settings.users.create'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $tenant = Tenant::factory()->create(['status' => 'active', 'max_users' => 1, 'lifetime_free_at' => now()]);
    $admin = User::factory()->create(['tenant_id' => $tenant->id]);
    $admin->givePermissionTo(['settings.users.view', 'settings.users.create']);
    $role = Role::create(['name' => 'Consulta', 'tenant_id' => $tenant->id]);

    expect($tenant->hasSeatAvailable())->toBeTrue();

    $this->actingAs($admin)->post(route('users.store'), [
        'name' => 'Segunda pessoa',
        'email' => 'segunda@example.com',
        'password' => 'password123',
        'role' => $role->name,
    ])->assertSessionHasNoErrors();

    expect(User::where('email', 'segunda@example.com')->exists())->toBeTrue();
});
