<?php

use App\Models\Tenant;
use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());
});

/**
 * @return array<string, string>
 */
function registrationPayload(array $overrides = []): array
{
    return array_merge([
        'organization_name' => 'Studio Movimento',
        'document' => '11.222.333/0001-81',
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone' => '11999990000',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => '1',
    ], $overrides);
}

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new organizations can register themselves and start a trial', function () {
    $response = $this->post(route('register.store'), registrationPayload());

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $tenant = Tenant::where('name', 'Studio Movimento')->firstOrFail();

    expect($tenant->self_registered)->toBeTrue()
        ->and($tenant->status)->toBe('active')
        ->and($tenant->plan)->toBe('free')
        ->and($tenant->isOnTrial())->toBeTrue()
        ->and($tenant->trialDaysLeft())->toBe(Tenant::TRIAL_DAYS)
        // Punctuation is stripped so the uniqueness check cannot be bypassed.
        ->and($tenant->document)->toBe('11222333000181')
        ->and($tenant->phone)->toBe('11999990000')
        // Seats and storage come from the trial plan definition.
        ->and($tenant->max_users)->toBe(Tenant::planConfig('free')['users']);

    $user = User::where('email', 'test@example.com')->firstOrFail();

    expect($user->tenant_id)->toBe($tenant->id)
        ->and($user->is_dev_admin)->toBeFalse()
        ->and($user->hasRole('Administrador'))->toBeTrue();
});

test('registration requires organization name, document, phone and accepted terms', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors(['organization_name', 'document', 'phone', 'terms']);
    $this->assertGuest();
    expect(Tenant::count())->toBe(0);
});

test('registration rejects a document that is not a real CPF or CNPJ', function () {
    $response = $this->post(route('register.store'), registrationPayload([
        'document' => '12345678900',
    ]));

    $response->assertSessionHasErrors('document');
    expect(Tenant::count())->toBe(0);
});

test('registration rejects a document already used by another organization', function () {
    Tenant::factory()->create(['document' => '11222333000181']);

    // Same CNPJ, different punctuation — must still be caught.
    $response = $this->post(route('register.store'), registrationPayload([
        'document' => '11222333/0001-81',
    ]));

    $response->assertSessionHasErrors('document');
    expect(Tenant::where('name', 'Studio Movimento')->count())->toBe(0);
});

test('a self-registered organization starts with an incomplete profile', function () {
    $this->post(route('register.store'), registrationPayload());

    $tenant = Tenant::where('name', 'Studio Movimento')->firstOrFail();

    expect($tenant->isProfileComplete())->toBeFalse()
        // Document and phone were captured at signup, so they are not missing.
        ->and($tenant->missingProfileFields())->not->toContain('document')
        ->and($tenant->missingProfileFields())->toContain('cep', 'city', 'technical_manager_name');
});

test('each registration creates its own isolated organization', function () {
    $this->post(route('register.store'), registrationPayload([
        'organization_name' => 'Clinica Norte',
        'document' => '11222333000181',
        'email' => 'ana@example.com',
    ]));

    $this->post('/logout');

    $this->post(route('register.store'), registrationPayload([
        'organization_name' => 'Clinica Norte',
        'document' => '11444777000161',
        'email' => 'bruno@example.com',
    ]));

    $tenants = Tenant::where('name', 'Clinica Norte')->get();

    expect($tenants)->toHaveCount(2)
        ->and($tenants->pluck('slug')->unique())->toHaveCount(2);
});
