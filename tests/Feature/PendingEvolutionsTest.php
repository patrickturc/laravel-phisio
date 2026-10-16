<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

function pendingClass(): array
{
    foreach (['evolutions.manage.view', 'evolutions.manage.create'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create(['name' => 'Amanda']);
    $user->givePermissionTo(['evolutions.manage.view', 'evolutions.manage.create']);

    $patient = Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Ana', 'type' => 'pilates']);
    $appointment = Appointment::create([
        'tenant_id' => $user->tenant_id,
        'user_id' => $user->id,
        'appointment_date' => now()->subDays(2)->toDateString(),
        'start_time' => '09:00',
        'duration_minutes' => 50,
        'type' => 'individual',
        'status' => 'completed',
    ]);
    $appointment->patients()->attach($patient->id, ['status' => 'attended', 'tenant_id' => $user->tenant_id]);

    return [$user, $patient, $appointment];
}

test('a pending class lists its professional', function () {
    [$user, $patient, $appointment] = pendingClass();

    $this->actingAs($user)
        ->get(route('evolutions.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('pendingEvolutions', 1)
            ->where('pendingEvolutions.0.patient_id', $patient->id)
            ->where('pendingEvolutions.0.appointment_id', $appointment->id)
            ->where('pendingEvolutions.0.professional_name', 'Amanda')
            ->where('pendingEvolutions.0.patient_type', 'pilates'));
});

test('a pilates evolution linked to the class clears it from the pending list', function () {
    [$user, $patient, $appointment] = pendingClass();

    $this->actingAs($user)->post(route('evolutions.store'), [
        'evolution_type' => 'pilates',
        'paciente_id' => $patient->id,
        'agendamento_id' => $appointment->id,
        'data_atendimento' => $appointment->appointment_date->toDateString(),
        'estabilidade' => 'boa',
        'mobilidade' => 'boa',
        'forca' => 'adequada',
        'coordenacao' => 'boa',
        'tem_dor' => false,
        'tem_limitacao' => false,
        'tem_contraindicacao' => false,
    ])->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->get(route('evolutions.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page->has('pendingEvolutions', 0));
});
