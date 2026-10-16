<?php

use App\Models\Tenant;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

function onlineClinicUser(): User
{
    Permission::findOrCreate('dashboard.view', 'web');
    $user = User::factory()->create(['tenant_id' => Tenant::factory()->create(['status' => 'active'])->id]);
    $user->givePermissionTo('dashboard.view');

    return $user;
}

test('visiting a page records when and where the user was seen', function () {
    $user = onlineClinicUser();

    $this->actingAs($user)->get(route('dashboard'))->assertOk();

    $user->refresh();
    expect($user->last_seen_path)->toBe('/dashboard')
        ->and($user->last_seen_at->diffInSeconds(now()))->toBeLessThan(5);
});

test('opening a patient records the patient details screen', function () {
    $user = onlineClinicUser();

    $this->actingAs($user)->get(route('dashboard', ['patient' => fake()->uuid()]));

    expect($user->fresh()->last_seen_path)->toBe('/dashboard?patient');
});

test('dev admins and impersonation sessions are not tracked', function () {
    $devAdmin = User::factory()->create(['tenant_id' => null, 'is_dev_admin' => true]);
    $this->actingAs($devAdmin)->get('/dev-admin');
    expect($devAdmin->fresh()->last_seen_at)->toBeNull();

    $user = onlineClinicUser();
    $this->actingAs($user)
        ->withSession(['impersonated_by' => $devAdmin->id])
        ->get(route('dashboard'));
    expect($user->fresh()->last_seen_at)->toBeNull();
});

test('the online page lists recent clinic users with their clinic and screen', function () {
    $recent = onlineClinicUser();
    $recent->forceFill(['last_seen_at' => now()->subMinute(), 'last_seen_path' => '/appointments'])->save();
    $idle = onlineClinicUser();
    $idle->forceFill(['last_seen_at' => now()->subHours(2), 'last_seen_path' => '/patients'])->save();

    $this->actingAs(User::factory()->create(['tenant_id' => null, 'is_dev_admin' => true]))
        ->get(route('dev-admin.online.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('DevAdmin/Online/Index')
            ->has('users', 1)
            ->where('users.0.id', $recent->id)
            ->where('users.0.path', '/appointments')
            ->where('users.0.tenant.name', $recent->tenant->name)
            ->where('clinics', 1));

    $this->actingAs(User::factory()->create(['tenant_id' => null, 'is_dev_admin' => true]))
        ->get(route('dev-admin.online.index', ['window' => 1440]))
        ->assertInertia(fn (AssertableInertia $page) => $page->has('users', 2));
});

test('only dev admins see who is online', function () {
    $this->actingAs(onlineClinicUser())
        ->get(route('dev-admin.online.index'))
        ->assertForbidden();
});
