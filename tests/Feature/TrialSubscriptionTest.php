<?php

use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * A CNPJ with correct check digits, unique per call so tests that build several
 * organizations do not trip the uniqueness constraint on tenants.document.
 */
function uniqueCnpj(): string
{
    $base = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT).'0001';

    foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $weights) {
        $sum = 0;

        foreach ($weights as $i => $weight) {
            $sum += (int) $base[$i] * $weight;
        }

        $remainder = $sum % 11;
        $base .= $remainder < 2 ? 0 : 11 - $remainder;
    }

    return $base;
}

/**
 * @return array<string, string>
 */
function completeProfile(): array
{
    return [
        'document' => uniqueCnpj(),
        'cep' => '01310100',
        'street' => 'Avenida Paulista',
        'number' => '1000',
        'neighborhood' => 'Bela Vista',
        'city' => 'São Paulo',
        'state' => 'SP',
        'technical_manager_name' => 'Maria Fisio',
        'technical_manager_document' => 'CREFITO-3/12345-F',
    ];
}

function trialAdmin(array $tenantAttributes = []): User
{
    $tenant = Tenant::factory()->create(array_merge([
        'plan' => 'free',
        'status' => 'active',
        'self_registered' => true,
        // Same seats a real self-service signup would get.
        'max_users' => Tenant::planConfig('free')['users'],
        'trial_started_at' => now()->subDays(5),
        'trial_ends_at' => now()->addDays(10),
    ], completeProfile(), $tenantAttributes));

    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    foreach (['dashboard.view', 'settings.users.view', 'settings.users.create'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $role = Role::findOrCreate('Administrador', 'web');
    $role->givePermissionTo(['dashboard.view', 'settings.users.view', 'settings.users.create']);
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
    $tenant = Tenant::factory()->create(array_merge(completeProfile(), [
        'plan' => 'free',
        'trial_ends_at' => now()->addDays(10),
    ]));
    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    $this->actingAs($user)
        ->post(route('subscription.request'), ['requested_plan' => 'pro'])
        ->assertSessionHas('error');

    expect($tenant->fresh()->plan_requested_at)->toBeNull();
});

test('a plan cannot be requested while the organization profile is incomplete', function () {
    $user = trialAdmin(['city' => null, 'technical_manager_name' => null]);

    $this->actingAs($user)
        ->post(route('subscription.request'), ['requested_plan' => 'basic'])
        ->assertRedirect(route('organization.edit'));

    expect($user->tenant->fresh()->plan_requested_at)->toBeNull();
});

test('an admin can request extra seats alongside a plan', function () {
    $user = trialAdmin();

    $this->actingAs($user)->post(route('subscription.request'), [
        'requested_plan' => 'basic',
        'requested_extra_users' => 4,
    ])->assertSessionHas('success');

    $tenant = $user->tenant->fresh();

    expect($tenant->requested_plan)->toBe('basic')
        ->and($tenant->requested_extra_users)->toBe(4);
});

test('a plan request cannot ask for fewer seats than the team already uses', function () {
    $user = trialAdmin();
    $tenant = $user->tenant;

    // Basic includes 5 seats; put 6 people in the organization.
    User::factory()->count(5)->create(['tenant_id' => $tenant->id]);

    $this->actingAs($user)->post(route('subscription.request'), [
        'requested_plan' => 'basic',
        'requested_extra_users' => 0,
    ])->assertSessionHasErrors('requested_extra_users');

    expect($tenant->fresh()->plan_requested_at)->toBeNull();
});

test('approving a plan applies its seats and storage', function () {
    $user = trialAdmin([
        'trial_ends_at' => now()->subDay(),
        'requested_plan' => 'intermediate',
        'requested_extra_users' => 3,
        'plan_requested_at' => now()->subHour(),
    ]);
    $tenant = $user->tenant;

    $devAdmin = User::factory()->create(['is_dev_admin' => true, 'tenant_id' => null]);

    $this->actingAs($devAdmin)
        ->post(route('dev-admin.tenants.approve-plan', $tenant), ['plan' => 'intermediate'])
        ->assertSessionHas('success');

    $tenant->refresh();
    $config = Tenant::planConfig('intermediate');

    expect($tenant->plan)->toBe('intermediate')
        ->and($tenant->extra_users)->toBe(3)
        // 15 seats from the plan plus the 3 extra ones that were requested.
        ->and($tenant->seatLimit())->toBe($config['users'] + 3)
        ->and($tenant->max_storage_mb)->toBe($config['storage_mb'])
        ->and($tenant->requested_extra_users)->toBe(0);
});

test('plans do not gate features: every plan gives the whole system', function () {
    $modules = ['financial', 'group_classes', 'clinical_protocols', 'reports', 'evolution_photos'];

    foreach (['basic', 'intermediate', 'pro'] as $plan) {
        $user = trialAdmin();
        $tenant = $user->tenant;

        $tenant->applyPlan($plan);
        $tenant->refresh();

        foreach ($modules as $module) {
            expect($tenant->hasFeature($module))
                ->toBeTrue("o plano {$plan} deveria liberar {$module}");
        }
    }
});

test('changing plan keeps the per-tenant feature switches a dev admin set', function () {
    $user = trialAdmin();
    $tenant = $user->tenant;

    // A dev admin turned one module off for this clinic specifically.
    $tenant->update(['features' => ['reports' => false]]);

    $tenant->applyPlan('pro');
    $tenant->refresh();

    expect($tenant->hasFeature('reports'))->toBeFalse()
        ->and($tenant->hasFeature('financial'))->toBeTrue();
});

test('an organization cannot create more users than its plan allows', function () {
    $user = trialAdmin();
    $tenant = $user->tenant;

    // The trial plan seats 3: the admin plus two more fills it.
    User::factory()->count(2)->create(['tenant_id' => $tenant->id]);

    expect($tenant->hasSeatAvailable())->toBeFalse();

    $this->actingAs($user)->post(route('users.store'), [
        'name' => 'Novo Usuario',
        'email' => 'novo@example.com',
        'password' => 'password123',
        'role' => 'Administrador',
    ])->assertSessionHasErrors('email');

    expect(User::where('email', 'novo@example.com')->exists())->toBeFalse();
});

test('buying extra seats lets the organization add users again', function () {
    $user = trialAdmin();
    $tenant = $user->tenant;

    User::factory()->count(2)->create(['tenant_id' => $tenant->id]);
    $tenant->applyPlan('basic', 0);
    $tenant->refresh();

    expect($tenant->seatLimit())->toBe(Tenant::planConfig('basic')['users'])
        ->and($tenant->hasSeatAvailable())->toBeTrue();

    $this->actingAs($user)->post(route('users.store'), [
        'name' => 'Quarto Usuario',
        'email' => 'quarto@example.com',
        'password' => 'password123',
        'role' => 'Administrador',
    ]);

    expect(User::where('email', 'quarto@example.com')->exists())->toBeTrue();
});

test('the profile completion state is shared with every page', function () {
    $user = trialAdmin(['city' => null]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('profileCompletion.complete', false)
            ->where('profileCompletion.missing_count', 1)
            ->where('profileCompletion.missing', ['city'])
        );
});

test('completing the organization form clears the reminder', function () {
    $user = trialAdmin(['city' => null, 'profile_completed_at' => null]);

    $this->actingAs($user)
        ->patch(route('organization.update'), array_merge(completeProfile(), [
            'name' => $user->tenant->name,
            'email' => 'contato@example.com',
            'phone' => '11999990000',
        ]))
        ->assertSessionHasNoErrors();

    $tenant = $user->tenant->fresh();

    expect($tenant->isProfileComplete())->toBeTrue()
        ->and($tenant->profile_completed_at)->not->toBeNull()
        ->and($tenant->city)->toBe('São Paulo');
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
