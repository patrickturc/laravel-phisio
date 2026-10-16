<?php

use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\AclSeeder;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());

    // The real permission list, as production has it.
    $this->seed(AclSeeder::class);
});

test('a new clinic signs up for free, logs back in and can use every screen', function () {
    $this->post(route('register.store'), [
        'organization_name' => 'Studio Novo',
        'document' => '11.222.333/0001-81',
        'name' => 'Dona do Studio',
        'email' => 'dona@studionovo.test',
        'phone' => '(11) 99999-0000',
        'password' => 'senha-segura-123',
        'password_confirmation' => 'senha-segura-123',
        'terms' => '1',
    ])->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticated();

    $owner = User::where('email', 'dona@studionovo.test')->firstOrFail();
    $tenant = $owner->tenant;

    expect($tenant->name)->toBe('Studio Novo')
        ->and($tenant->isOnTrial())->toBeTrue()
        ->and($tenant->trialDaysLeft())->toBeGreaterThan(0)
        ->and($owner->hasRole('Administrador'))->toBeTrue();

    // Log out and back in with the password chosen at signup.
    $this->post(route('logout'));
    $this->assertGuest();

    $this->post(route('login.store'), [
        'email' => 'dona@studionovo.test',
        'password' => 'senha-segura-123',
    ])->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticatedAs($owner);

    foreach ([
        'dashboard', 'patients.index', 'appointments.index', 'evolutions.index',
        'group-classes.index', 'memberships.index', 'commercial-plans.index',
        'financial.index', 'financial.receivables', 'recurring-expenses.index',
        'reports.index', 'clinical-protocols.index', 'celebrations.index',
        'users.index', 'roles.index', 'organization.edit', 'billing.edit',
        'schedule-settings.edit', 'profile.edit', 'subscription.index',
    ] as $route) {
        $this->get(route($route))->assertOk();
    }

    // And actually work: register a patient.
    $this->post(route('patients.store'), ['name' => 'Primeira Paciente', 'type' => 'pilates'])
        ->assertSessionHasNoErrors();

    expect(Patient::where('tenant_id', $tenant->id)->where('name', 'Primeira Paciente')->exists())->toBeTrue();
});

test('the wrong password does not log in', function () {
    $this->post(route('register.store'), [
        'organization_name' => 'Studio Novo',
        'document' => '11.222.333/0001-81',
        'name' => 'Dona do Studio',
        'email' => 'dona@studionovo.test',
        'phone' => '(11) 99999-0000',
        'password' => 'senha-segura-123',
        'password_confirmation' => 'senha-segura-123',
        'terms' => '1',
    ]);
    $this->post(route('logout'));

    $this->post(route('login.store'), ['email' => 'dona@studionovo.test', 'password' => 'errada'])
        ->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('when the trial ends the clinic is sent to choose a plan', function () {
    $this->post(route('register.store'), [
        'organization_name' => 'Studio Novo',
        'document' => '11.222.333/0001-81',
        'name' => 'Dona do Studio',
        'email' => 'dona@studionovo.test',
        'phone' => '(11) 99999-0000',
        'password' => 'senha-segura-123',
        'password_confirmation' => 'senha-segura-123',
        'terms' => '1',
    ]);

    Tenant::where('name', 'Studio Novo')->update(['trial_ends_at' => now()->subDay()]);

    $this->get(route('dashboard'))->assertRedirect(route('subscription.index'));
    $this->get(route('subscription.index'))->assertOk();
});
