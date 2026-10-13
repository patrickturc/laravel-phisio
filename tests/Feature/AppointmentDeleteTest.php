<?php

use App\Models\Appointment;
use App\Models\GroupClass;
use App\Models\GroupClassSchedule;
use App\Models\Patient;
use App\Models\User;
use Spatie\Permission\Models\Permission;

function userWhoCanDeleteAppointments(): User
{
    Permission::findOrCreate('appointments.manage.delete', 'web');
    $user = User::factory()->create();
    $user->givePermissionTo('appointments.manage.delete');
    test()->actingAs($user);

    return $user;
}

function orphanGroupAppointment(User $user, Patient $patient, string $date): Appointment
{
    $appointment = Appointment::create([
        'user_id' => $user->id,
        'appointment_date' => $date,
        'start_time' => '18:00',
        'duration_minutes' => 50,
        'type' => 'group',
        'group_class_id' => null,
        'max_participants' => 4,
        'status' => 'scheduled',
    ]);
    $appointment->patients()->attach($patient->id, ['status' => 'scheduled']);

    return $appointment;
}

test('future-delete removes orphaned group appointments on the same weekday', function () {
    $user = userWhoCanDeleteAppointments();
    $patient = Patient::create(['name' => 'Atila', 'user_id' => $user->id]);

    // Three consecutive Mondays at 18:00, group type, no group class link.
    $first = orphanGroupAppointment($user, $patient, '2026-07-06');
    orphanGroupAppointment($user, $patient, '2026-07-13');
    orphanGroupAppointment($user, $patient, '2026-07-20');

    test()->delete(route('appointments.destroy', $first->id).'?delete_mode=future')
        ->assertRedirect(route('appointments.index'));

    expect(Appointment::count())->toBe(0);
});

test('future-delete does not touch a different weekday', function () {
    $user = userWhoCanDeleteAppointments();
    $patient = Patient::create(['name' => 'Atila', 'user_id' => $user->id]);

    $monday = orphanGroupAppointment($user, $patient, '2026-07-06');
    orphanGroupAppointment($user, $patient, '2026-07-08'); // Wednesday

    test()->delete(route('appointments.destroy', $monday->id).'?delete_mode=future');

    expect(Appointment::count())->toBe(1);
});

test('future-delete on a class appointment only removes that weekly slot of the class', function () {
    $user = userWhoCanDeleteAppointments();
    $patient = Patient::create(['name' => 'Aluno', 'user_id' => $user->id]);
    $class = GroupClass::create([
        'user_id' => $user->id,
        'name' => 'Pilates',
        'color' => '#8b5cf6',
        'max_participants' => 4,
        'status' => 'active',
    ]);
    $monday = GroupClassSchedule::create([
        'group_class_id' => $class->id, 'day_of_week' => 1, 'start_time' => '18:00', 'duration_minutes' => 50,
    ]);
    $wednesday = GroupClassSchedule::create([
        'group_class_id' => $class->id, 'day_of_week' => 3, 'start_time' => '18:00', 'duration_minutes' => 50,
    ]);

    $make = function (string $date, $schedule) use ($user, $class, $patient) {
        $appointment = Appointment::create([
            'user_id' => $user->id,
            'group_class_id' => $class->id,
            'schedule_id' => $schedule->id,
            'type' => 'group',
            'max_participants' => 4,
            'appointment_date' => $date,
            'start_time' => '18:00',
            'duration_minutes' => 50,
            'status' => 'scheduled',
        ]);
        $appointment->patients()->attach($patient->id, ['status' => 'scheduled']);

        return $appointment;
    };

    $first = $make('2026-10-12', $monday);
    $make('2026-10-19', $monday);
    $make('2026-10-14', $wednesday);
    $make('2026-10-21', $wednesday);

    $this->delete("/appointments/{$first->id}?delete_mode=future")->assertRedirect();

    expect(Appointment::where('schedule_id', $monday->id)->count())->toBe(0)
        ->and(Appointment::where('schedule_id', $wednesday->id)->count())->toBe(2);
});
