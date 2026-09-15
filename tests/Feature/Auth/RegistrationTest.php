<?php

use App\Models\Tenant;
use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new organizations can register themselves and start a trial', function () {
    $response = $this->post(route('register.store'), [
        'organization_name' => 'Studio Movimento',
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '11999990000',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => '1',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $tenant = Tenant::where('name', 'Studio Movimento')->firstOrFail();

    expect($tenant->self_registered)->toBeTrue()
        ->and($tenant->status)->toBe('active')
        ->and($tenant->plan)->toBe('free')
        ->and($tenant->isOnTrial())->toBeTrue()
        ->and($tenant->trialDaysLeft())->toBe(Tenant::TRIAL_DAYS);

    $user = User::where('email', 'test@example.com')->firstOrFail();

    expect($user->tenant_id)->toBe($tenant->id)
        ->and($user->is_dev_admin)->toBeFalse()
        ->and($user->hasRole('Administrador'))->toBeTrue();
});

test('registration requires an organization name and accepted terms', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors(['organization_name', 'terms']);
    $this->assertGuest();
    expect(Tenant::count())->toBe(0);
});

test('each registration creates its own isolated organization', function () {
    $this->post(route('register.store'), [
        'organization_name' => 'Clinica Norte',
        'name' => 'Ana',
        'email' => 'ana@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => '1',
    ]);

    $this->post('/logout');

    $this->post(route('register.store'), [
        'organization_name' => 'Clinica Norte',
        'name' => 'Bruno',
        'email' => 'bruno@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => '1',
    ]);

    $tenants = Tenant::where('name', 'Clinica Norte')->get();

    expect($tenants)->toHaveCount(2)
        ->and($tenants->pluck('slug')->unique())->toHaveCount(2);
});
