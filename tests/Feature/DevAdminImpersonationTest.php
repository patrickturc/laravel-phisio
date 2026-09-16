<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

test('dev admin can impersonate a tenant and then leave impersonation', function () {
    $tenant = Tenant::factory()->create(['name' => 'Clínica Teste']);
    $tenantUser = User::factory()->create([
        'tenant_id' => $tenant->id,
        'name' => 'Dr. Tenant Admin',
        'is_dev_admin' => false,
    ]);

    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    // 1. Act as Dev Admin and trigger impersonate
    $this->actingAs($devAdmin);
    $response = $this->post(route('dev-admin.tenants.impersonate', $tenant->id));

    $response->assertRedirect(route('dashboard'));
    $this->assertEquals($tenantUser->id, auth()->id());
    $this->assertEquals($devAdmin->id, session('impersonated_by'));

    // 2. Act as impersonated user with the session state, and leave impersonation
    $this->actingAs($tenantUser)->withSession([
        'impersonated_by' => $devAdmin->id,
        'impersonated_tenant_id' => $tenant->id,
    ]);
    $leaveResponse = $this->post(route('dev-admin.leave-impersonation'));
    $leaveResponse->assertRedirect(route('dev-admin.tenants.show', $tenant->id));
    $this->assertEquals($devAdmin->id, auth()->id());
    $this->assertFalse(session()->has('impersonated_by'));
});

test('regular users cannot impersonate tenants', function () {
    $tenant = Tenant::factory()->create();
    $regularUser = User::factory()->create(['is_dev_admin' => false]);

    $this->actingAs($regularUser);
    $response = $this->post(route('dev-admin.tenants.impersonate', $tenant->id));

    $response->assertForbidden();
});

test('dev admin can create a user for a tenant', function () {
    $tenant = Tenant::factory()->create();
    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    // Role must be one already seeded by AclSeeder — an arbitrary string
    // used to silently create a brand-new, permission-less role instead of
    // being rejected.
    Role::findOrCreate('Fisioterapeuta', 'web');

    $this->actingAs($devAdmin);
    $response = $this->post(route('dev-admin.tenants.users.store', $tenant->id), [
        'name' => 'Novo Fisioterapeuta',
        'email' => 'fisio@clinicateste.com',
        'password' => 'secret1234',
        'role' => 'Fisioterapeuta',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('users', [
        'email' => 'fisio@clinicateste.com',
        'tenant_id' => $tenant->id,
        'is_dev_admin' => false,
    ]);
    $this->assertTrue(User::where('email', 'fisio@clinicateste.com')->first()->hasRole('Fisioterapeuta'));
});

test('dev admin can reset password for a tenant user', function () {
    $tenant = Tenant::factory()->create();
    $tenantUser = User::factory()->create([
        'tenant_id' => $tenant->id,
        'password' => Hash::make('oldpassword'),
        'is_dev_admin' => false,
    ]);

    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    $this->actingAs($devAdmin);
    $response = $this->post(route('dev-admin.tenants.users.reset-password', [$tenant->id, $tenantUser->id]), [
        'password' => 'newpassword123',
    ]);

    $response->assertRedirect();
    $tenantUser->refresh();
    $this->assertTrue(Hash::check('newpassword123', $tenantUser->password));
});
