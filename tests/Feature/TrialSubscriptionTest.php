<?php

use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function trialAdmin(array $tenantAttributes = []): User
{
    $tenant = Tenant::factory()->create(array_merge([
        'plan' => 'free',
        'status' => 'active',
        'self_registered' => true,
        'trial_started_at' => now()->subDays(5),
        'trial_ends_at' => now()->addDays(10),
    ], $tenantAttributes));

    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    Permission::findOrCreate('dashboard.view', 'web');
    Permission::findOrCreate('settings.users.view', 'web');

    $role = Role::findOrCreate('Administrador', 'web');
    $role->givePermissionTo(['dashboard.view', 'settings.users.view']);
    $user->assignRole($role);

    return $user;
}

test('an organization inside its trial can use the system', function () {
    $user = trialAdmin();

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});

test('an organization whose trial expired is sent to the subscription page', function () {
    $user = trialAdmin([
        'trial_ends_at' => now()->subDay(),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('subscription.index'));

    // Still logged in: the data is intact, only access is paused.
    $this->assertAuthenticatedAs($user);
});

test('the subscription page stays reachable after the trial expires', function () {
    $user = trialAdmin(['trial_ends_at' => now()->subDay()]);

    $this->actingAs($user)->get(route('subscription.index'))->assertOk();
});

test('a paid plan restores access even with a past trial date', function () {
    $user = trialAdmin([
        'plan' => 'pro',
        'trial_ends_at' => now()->subDays(30),
    ]);

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});

test('an admin can request a plan', function () {
    $user = trialAdmin();

    $this->actingAs($user)
        ->post(route('subscription.request'), [
            'requested_plan' => 'pro',
            'plan_request_notes' => 'Somos 4 fisioterapeutas.',
        ])
        ->assertSessionHas('success');

    $tenant = $user->tenant->fresh();

    expect($tenant->requested_plan)->toBe('pro')
        ->and($tenant->plan_requested_at)->not->toBeNull()
        ->and($tenant->hasPendingPlanRequest())->toBeTrue()
        // Requesting does not itself grant the plan.
        ->and($tenant->plan)->toBe('free');
});

test('a plan request rejects unknown plans', function () {
    $user = trialAdmin();

    $this->actingAs($user)
        ->post(route('subscription.request'), ['requested_plan' => 'enterprise'])
        ->assertSessionHasErrors('requested_plan');
});

test('a user without admin permission cannot request a plan', function () {
    $tenant = Tenant::factory()->create([
        'plan' => 'free',
        'trial_ends_at' => now()->addDays(10),
    ]);
    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    $this->actingAs($user)
        ->post(route('subscription.request'), ['requested_plan' => 'pro'])
        ->assertSessionHas('error');

    expect($tenant->fresh()->plan_requested_at)->toBeNull();
});

test('a suspended organization is logged out rather than sent to the subscription page', function () {
    $user = trialAdmin(['status' => 'suspended']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('dev admin can approve a plan request and unlock the organization', function () {
    $user = trialAdmin([
        'trial_ends_at' => now()->subDay(),
        'requested_plan' => 'pro',
        'plan_requested_at' => now()->subHour(),
    ]);
    $tenant = $user->tenant;

    $devAdmin = User::factory()->create(['is_dev_admin' => true, 'tenant_id' => null]);

    $this->actingAs($devAdmin)
        ->post(route('dev-admin.tenants.approve-plan', $tenant), ['plan' => 'pro'])
        ->assertSessionHas('success');

    $tenant->refresh();

    expect($tenant->plan)->toBe('pro')
        ->and($tenant->trial_ends_at)->toBeNull()
        ->and($tenant->plan_requested_at)->toBeNull()
        ->and($tenant->hasAppAccess())->toBeTrue();

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});

test('dev admin can extend an expired trial from today', function () {
    $user = trialAdmin(['trial_ends_at' => now()->subDays(10)]);
    $tenant = $user->tenant;

    $devAdmin = User::factory()->create(['is_dev_admin' => true, 'tenant_id' => null]);

    $this->actingAs($devAdmin)
        ->post(route('dev-admin.tenants.extend-trial', $tenant), ['days' => 7]);

    $tenant->refresh();

    expect($tenant->isOnTrial())->toBeTrue()
        ->and($tenant->trialDaysLeft())->toBe(7);
});

test('dev admin can filter tenants by pending plan requests', function () {
    $devAdmin = User::factory()->create(['is_dev_admin' => true, 'tenant_id' => null]);

    Tenant::factory()->create(['plan' => 'free', 'trial_ends_at' => now()->addDays(5)]);
    $requesting = Tenant::factory()->create([
        'plan' => 'free',
        'trial_ends_at' => now()->addDays(5),
        'requested_plan' => 'basic',
        'plan_requested_at' => now(),
    ]);

    $this->actingAs($devAdmin)
        ->get(route('dev-admin.tenants.index', ['filter' => 'plan_requests']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('DevAdmin/Tenants/Index')
            ->has('tenants.data', 1)
            ->where('tenants.data.0.id', $requesting->id)
        );
});
