<?php

use App\Models\Patient;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

function patientViewer(array $permissions = ['patients.manage.view']): User
{
    foreach ([...$permissions, 'dashboard.view'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo([...$permissions, 'dashboard.view']);

    return $user;
}

test('the patient details open over any screen', function () {
    $user = patientViewer();
    $patient = Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Ana']);

    $this->actingAs($user)
        ->get(route('dashboard', ['patient' => $patient->id]))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('dashboard')
            ->where('patientDetails.patient.name', 'Ana')
            ->has('patientDetails.protocols')
            ->has('patientDetails.commercialPlans'));
});

test('no patient details are sent unless asked for', function () {
    $user = patientViewer();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('patientDetails', null));
});

test('the old patient page opens the list with the modal', function () {
    $user = patientViewer();
    $patient = Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Ana']);

    $this->actingAs($user)
        ->get(route('patients.show', ['patient' => $patient, 'tab' => 'financial']))
        ->assertRedirect(route('patients.index', ['patient' => $patient->id, 'patient_tab' => 'financial']));
});

test('another clinic patient never opens', function () {
    $user = patientViewer();
    $outsider = User::factory()->create();
    $foreign = Patient::create(['tenant_id' => $outsider->tenant_id, 'user_id' => $outsider->id, 'name' => 'Outra']);

    $this->actingAs($user)
        ->get(route('dashboard', ['patient' => $foreign->id]))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('patientDetails', null));
});

test('the patient details need the patient view permission', function () {
    $user = patientViewer([]);
    $patient = Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Ana']);

    $this->actingAs($user)
        ->get(route('dashboard', ['patient' => $patient->id]))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('patientDetails', null));
});

test('editing the patient keeps the modal open where it was', function () {
    $user = patientViewer(['patients.manage.view', 'patients.manage.edit']);
    $patient = Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Ana']);
    $from = route('dashboard', ['patient' => $patient->id]);

    $this->actingAs($user)
        ->from($from)
        ->put(route('patients.update', $patient), ['nickname' => 'Aninha'])
        ->assertRedirect($from);

    expect($patient->fresh()->nickname)->toBe('Aninha');
});
