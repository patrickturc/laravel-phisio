<?php

use App\Models\Tenant;
use App\Models\TenantPayment;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function billingAdmin(array $tenantAttributes = []): User
{
    $tenant = Tenant::factory()->create(array_merge([
        'plan' => 'basic',
        'status' => 'active',
        'max_users' => 5,
        'document' => str_pad((string) random_int(10000000000, 99999999999), 11, '0', STR_PAD_LEFT),
        'cep' => '01310100',
        'street' => 'Avenida Paulista',
        'number' => '1000',
        'neighborhood' => 'Bela Vista',
        'city' => 'São Paulo',
        'state' => 'SP',
        'technical_manager_name' => 'Maria Fisio',
        'technical_manager_document' => 'CREFITO-3/12345-F',
    ], $tenantAttributes));

    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    foreach (['dashboard.view', 'settings.users.view', 'settings.users.create'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $role = Role::findOrCreate('Administrador', 'web');
    $role->givePermissionTo(['dashboard.view', 'settings.users.view', 'settings.users.create']);
    $user->assignRole($role);

    return $user;
}

test('admin can view the billing settings page', function () {
    $user = billingAdmin();

    $this->actingAs($user)
        ->get(route('billing.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/billing')
            ->has('tenant')
            ->has('plans')
            ->has('payments')
        );
});

test('user without permission cannot view billing settings', function () {
    $tenant = Tenant::factory()->create([
        'plan' => 'basic',
        'status' => 'active',
        'max_users' => 5,
    ]);

    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    $this->actingAs($user)
        ->get(route('billing.edit'))
        ->assertForbidden();
});

test('admin can request a plan from the billing page', function () {
    $user = billingAdmin(['plan' => 'free', 'trial_started_at' => now(), 'trial_ends_at' => now()->addDays(10)]);

    $this->actingAs($user)
        ->post(route('billing.request-plan'), [
            'requested_plan' => 'basic',
            'requested_extra_users' => 2,
            'plan_request_notes' => 'Prefiro boleto.',
        ])
        ->assertRedirect();

    $tenant = $user->tenant->fresh();
    expect($tenant->requested_plan)->toBe('basic')
        ->and($tenant->requested_extra_users)->toBe(2)
        ->and($tenant->plan_request_notes)->toBe('Prefiro boleto.')
        ->and($tenant->plan_requested_at)->not->toBeNull();
});

test('billing page shows payment history', function () {
    $user = billingAdmin();

    TenantPayment::factory()->count(3)->create([
        'tenant_id' => $user->tenant_id,
    ]);

    $this->actingAs($user)
        ->get(route('billing.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/billing')
            ->has('payments.data', 3)
        );
});

test('billing page shows empty state when no payments', function () {
    $user = billingAdmin();

    $this->actingAs($user)
        ->get(route('billing.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/billing')
            ->has('payments.data', 0)
        );
});

test('plan request from billing redirects to organization when profile is incomplete', function () {
    $user = billingAdmin([
        'plan' => 'free',
        'trial_started_at' => now(),
        'trial_ends_at' => now()->addDays(10),
        'document' => null,
        'cep' => null,
        'street' => null,
        'number' => null,
        'neighborhood' => null,
        'city' => null,
        'state' => null,
        'technical_manager_name' => null,
        'technical_manager_document' => null,
    ]);

    $this->actingAs($user)
        ->post(route('billing.request-plan'), [
            'requested_plan' => 'basic',
        ])
        ->assertRedirect(route('organization.edit'));
});
