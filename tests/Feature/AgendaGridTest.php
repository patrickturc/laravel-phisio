<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Spatie\Permission\Models\Permission;

function gridViewer(): User
{
    Permission::findOrCreate('appointments.manage.view', 'web');

    $user = User::factory()->create();
    $user->givePermissionTo('appointments.manage.view');
    test()->actingAs($user);

    return $user;
}

function gridProfessional(User $colleague, string $name, ?string $color = null): User
{
    return User::factory()->create([
        'tenant_id' => $colleague->tenant_id,
        'name' => $name,
        'agenda_color' => $color,
    ]);
}

function gridBooking(User $professional, string $patientName, string $date, string $time, string $status = 'scheduled', string $type = 'individual'): Appointment
{
    $appointment = Appointment::create([
        'user_id' => $professional->id,
        'type' => $type,
        'max_participants' => 1,
        'appointment_date' => $date,
        'start_time' => $time,
        'duration_minutes' => 50,
        'status' => 'scheduled',
    ]);

    $patient = Patient::create(['name' => $patientName, 'user_id' => $professional->id]);
    $appointment->patients()->attach($patient->id, ['status' => $status]);

    return $appointment;
}

/**
 * Monday 08:00–10:00 only, two students per slot: 2 open slots, 4 places.
 */
function gridSmallClinic(User $user): void
{
    $hours = array_fill(0, 7, ['open' => false, 'start' => '08:00', 'end' => '10:00']);
    $hours[1]['open'] = true;

    $user->tenant->update(['schedule_settings' => ['business_hours' => $hours, 'slot_capacity' => 2]]);
}

test('the week grid groups students by day and hour with the week indicators', function () {
    $viewer = gridViewer();
    gridSmallClinic($viewer);
    $amanda = gridProfessional($viewer, 'Amanda', '#3b82f6');
    $silvana = gridProfessional($viewer, 'Silvana', '#f97316');

    gridBooking($amanda, 'Anizia', '2026-10-12', '08:00', 'attended');
    gridBooking($silvana, 'Maria', '2026-10-12', '08:00');
    gridBooking($silvana, 'Eliete', '2026-10-12', '09:00');
    gridBooking($amanda, 'Desmarcou', '2026-10-12', '09:00', 'cancelled');

    $response = $this->getJson('/api/appointments/grid?date=2026-10-14&view=week')->assertOk();

    expect($response->json('start'))->toBe('2026-10-12')
        ->and($response->json('end'))->toBe('2026-10-18')
        ->and($response->json('days'))->toHaveCount(7)
        ->and($response->json('days.0.closed'))->toBeFalse()
        ->and($response->json('days.6.closed'))->toBeTrue()
        ->and($response->json('rows'))->toBe(['08:00', '09:00'])
        ->and($response->json('capacity'))->toBe(2)
        ->and($response->json('cells.2026-10-12|08:00.count'))->toBe(2)
        ->and($response->json('cells.2026-10-12|08:00.students.0.patient_name'))->toBe('Anizia')
        ->and($response->json('cells.2026-10-12|08:00.students.0.professional_name'))->toBe('Amanda')
        ->and($response->json('cells.2026-10-12|08:00.students.0.color'))->toBe('#3b82f6')
        ->and($response->json('cells.2026-10-12|09:00.count'))->toBe(1)
        ->and($response->json('cells.2026-10-12|09:00.students'))->toHaveCount(2)
        ->and($response->json('stats'))->toBe(['classes' => 3, 'checkins' => 1, 'occupancy' => 75]);
});

test('appointments outside business hours widen the rows instead of disappearing', function () {
    $viewer = gridViewer();
    gridSmallClinic($viewer);
    gridBooking(gridProfessional($viewer, 'Amanda'), 'Noturna', '2026-10-13', '19:30');

    $response = $this->getJson('/api/appointments/grid?date=2026-10-13&view=week');

    expect($response->json('rows'))->toBe([
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
        '15:00', '16:00', '17:00', '18:00', '19:00',
    ])->and($response->json('cells.2026-10-13|19:00.students.0.time'))->toBe('19:30');
});

test('the grid can be filtered by professional', function () {
    $viewer = gridViewer();
    $amanda = gridProfessional($viewer, 'Amanda');
    gridBooking($amanda, 'Anizia', '2026-10-12', '08:00');
    gridBooking(gridProfessional($viewer, 'Silvana'), 'Maria', '2026-10-12', '08:00');

    $response = $this->getJson("/api/appointments/grid?date=2026-10-12&user_id={$amanda->id}");

    expect($response->json('cells.2026-10-12|08:00.students'))->toHaveCount(1)
        ->and($response->json('cells.2026-10-12|08:00.students.0.patient_name'))->toBe('Anizia');
});

test('the day and month views cover the right dates', function () {
    gridViewer();

    $day = $this->getJson('/api/appointments/grid?date=2026-10-14&view=day');
    $month = $this->getJson('/api/appointments/grid?date=2026-10-14&view=month');

    expect($day->json('days'))->toHaveCount(1)
        ->and($day->json('start'))->toBe('2026-10-14')
        ->and($month->json('start'))->toBe('2026-09-28')
        ->and($month->json('end'))->toBe('2026-11-01');
});

test('appointments of another clinic stay out of the grid', function () {
    $owner = gridViewer();
    gridBooking(gridProfessional($owner, 'Amanda'), 'Anizia', '2026-10-12', '08:00');

    gridViewer(); // someone from another clinic

    expect($this->getJson('/api/appointments/grid?date=2026-10-12')->json('cells'))->toBe([]);
});

test('the slot occupancy tells how many places are taken', function () {
    $viewer = gridViewer();
    $amanda = gridProfessional($viewer, 'Amanda');
    gridBooking($amanda, 'Anizia', '2026-10-12', '08:00:00');
    gridBooking($amanda, 'Maria', '2026-10-12', '08:00');

    $this->getJson('/api/appointments/slot-occupancy?date=2026-10-12&time=08:00')
        ->assertOk()
        ->assertExactJson(['count' => 2, 'capacity' => 6]);
});

test('the grid requires permission to view the agenda', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson('/api/appointments/grid')->assertForbidden();
});

function gridDesk(): User
{
    foreach (['appointments.manage.view', 'appointments.manage.edit', 'patients.manage.edit'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo(['appointments.manage.view', 'appointments.manage.edit', 'patients.manage.edit']);
    test()->actingAs($user);

    return $user;
}

test('grid cards carry the room, the phone and the reminder state', function () {
    $desk = gridDesk();
    $appointment = gridBooking(gridProfessional($desk, 'Amanda'), 'Anizia', '2026-10-12', '08:00');
    $appointment->update(['room' => 'Portal do Éden']);
    $patient = $appointment->patients()->first();
    $patient->update(['phone' => '(11) 98600-8482']);
    $appointment->patients()->updateExistingPivot($patient->id, ['confirmed_at' => now()]);

    $student = $this->getJson('/api/appointments/grid?date=2026-10-12')->json('cells.2026-10-12|08:00.students.0');

    expect($student)
        ->room->toBe('Portal do Éden')
        ->phone->toBe('(11) 98600-8482')
        ->reminded->toBeFalse()
        ->confirmed->toBeTrue();
});

test('the reminders list shows tomorrow classes by default, cancelled ones left out', function () {
    $this->travelTo('2026-10-12 10:00');
    $desk = gridDesk();
    $amanda = gridProfessional($desk, 'Amanda');
    gridBooking($amanda, 'Maria', '2026-10-13', '09:00');
    gridBooking($amanda, 'Anizia', '2026-10-13', '08:00');
    gridBooking($amanda, 'Desmarcou', '2026-10-13', '08:00', 'cancelled');
    gridBooking($amanda, 'Outro dia', '2026-10-14', '08:00');

    $response = $this->getJson('/api/appointments/reminders')->assertOk();

    expect($response->json('date'))->toBe('2026-10-13')
        ->and(collect($response->json('rows'))->pluck('patient_name')->all())->toBe(['Anizia', 'Maria'])
        ->and($response->json('rows.0.professional_name'))->toBe('Amanda')
        ->and($response->json('template'))->toContain('{primeiro_nome}');
});

test('the front desk records the reminder and the confirmation', function () {
    $desk = gridDesk();
    $appointment = gridBooking(gridProfessional($desk, 'Amanda'), 'Anizia', '2026-10-13', '08:00');
    $patientId = $appointment->patients()->first()->id;
    $url = "/appointments/{$appointment->id}/patients/{$patientId}";

    $this->postJson("{$url}/whatsapp-reminder")->assertOk();
    $this->postJson("{$url}/confirmation", ['confirmed' => true])->assertOk();

    $pivot = $appointment->patients()->first()->pivot;
    expect($pivot->whatsapp_reminder_at)->not->toBeNull()
        ->and($pivot->confirmed_at)->not->toBeNull()
        ->and($pivot->reminder_sent_at)->toBeNull();

    $this->postJson("{$url}/confirmation", ['confirmed' => false])->assertOk();
    expect($appointment->patients()->first()->pivot->confirmed_at)->toBeNull();
});

test('reminders can only be recorded for a patient of that class, with permission', function () {
    $desk = gridDesk();
    $appointment = gridBooking(gridProfessional($desk, 'Amanda'), 'Anizia', '2026-10-13', '08:00');
    $stranger = Patient::create(['name' => 'Outra', 'user_id' => $desk->id]);

    $this->postJson("/appointments/{$appointment->id}/patients/{$stranger->id}/whatsapp-reminder")->assertNotFound();

    $viewer = User::factory()->create(['tenant_id' => $desk->tenant_id]);
    $viewer->givePermissionTo('appointments.manage.view');
    $this->actingAs($viewer);
    $patientId = $appointment->patients()->first()->id;

    $this->postJson("/appointments/{$appointment->id}/patients/{$patientId}/confirmation", ['confirmed' => true])
        ->assertForbidden();
});

test('the clinic can reword the reminder message', function () {
    $desk = gridDesk();

    $this->patch('/message-templates', ['reminder' => 'Oi {primeiro_nome}, até {data}!'])->assertSessionHasNoErrors();

    expect($desk->tenant->fresh()->messageTemplates()['reminder'])->toBe('Oi {primeiro_nome}, até {data}!');
});
