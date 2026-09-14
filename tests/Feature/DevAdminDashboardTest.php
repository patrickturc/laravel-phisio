<?php

use App\Models\Tenant;
use App\Models\User;

test('guests are redirected from dev-admin to login', function () {
    $response = $this->get(route('dev-admin.dashboard'));
    $response->assertRedirect(route('login'));
});

test('regular users cannot access dev-admin', function () {
    $user = User::factory()->create(['is_dev_admin' => false]);
    $this->actingAs($user);

    $response = $this->get(route('dev-admin.dashboard'));
    $response->assertForbidden();
});

test('dev admin can access dev-admin dashboard', function () {
    $user = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);
    $this->actingAs($user);

    $response = $this->get(route('dev-admin.dashboard'));
    $response->assertOk();
});
