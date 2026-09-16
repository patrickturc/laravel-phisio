<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users with permission can visit the dashboard', function () {
    Permission::findOrCreate('dashboard.view', 'web');

    $user = User::factory()->create();
    $user->givePermissionTo('dashboard.view');
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('authenticated users without permission are forbidden from the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertForbidden();
});

test('dashboard weekly agenda shows only group classes with at least one student, plus individual appointments', function () {
    Permission::findOrCreate('dashboard.view', 'web');

    $user = User::factory()->create();
    $user->givePermissionTo('dashboard.view');
    $this->actingAs($user);

    $today = now()->toDateString();

    // 1. Individual appointment with no patients (should be visible)
    $indivNoPatient = Appointment::create([
        'user_id' => $user->id,
        'appointment_date' => $today,
        'start_time' => '09:00',
        'duration_minutes' => 50,
        'type' => 'individual',
        'status' => 'scheduled',
    ]);

    // 2. Individual appointment with patient (should be visible)
    $indivWithPatient = Appointment::create([
        'user_id' => $user->id,
        'appointment_date' => $today,
        'start_time' => '10:00',
        'duration_minutes' => 50,
        'type' => 'individual',
        'status' => 'scheduled',
    ]);
    $patient1 = Patient::create(['name' => 'Patient 1', 'user_id' => $user->id]);
    $indivWithPatient->patients()->attach($patient1->id, ['status' => 'scheduled']);

    // 3. Group appointment with no patients (should be filtered out!)
    $groupNoPatient = Appointment::create([
        'user_id' => $user->id,
        'appointment_date' => $today,
        'start_time' => '11:00',
        'duration_minutes' => 50,
        'type' => 'group',
        'status' => 'scheduled',
    ]);

    // 4. Group appointment with patient (should be visible)
    $groupWithPatient = Appointment::create([
        'user_id' => $user->id,
        'appointment_date' => $today,
        'start_time' => '12:00',
        'duration_minutes' => 50,
        'type' => 'group',
        'status' => 'scheduled',
    ]);
    $patient2 = Patient::create(['name' => 'Patient 2', 'user_id' => $user->id]);
    $groupWithPatient->patients()->attach($patient2->id, ['status' => 'scheduled']);

    $response = $this->get(route('dashboard', ['date' => $today]));
    $response->assertOk();

    // Verify Inertia data filtered out the empty group class
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->has('dayAppointments', 3) // indivNoPatient, indivWithPatient, groupWithPatient
        ->where('dayAppointments.0.id', $indivNoPatient->id)
        ->where('dayAppointments.1.id', $indivWithPatient->id)
        ->where('dayAppointments.2.id', $groupWithPatient->id)
    );
});
