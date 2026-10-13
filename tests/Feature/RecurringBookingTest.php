<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\RecurringBooking;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Permission;

/**
 * Logs in a receptionist-like user who can manage the agenda.
 */
function bookingDesk(): User
{
    $permissions = [
        'appointments.manage.view',
        'appointments.manage.create',
        'appointments.manage.edit',
        'appointments.manage.delete',
    ];

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);
    test()->actingAs($user);

    return $user;
}

function bookingProfessional(User $colleague, string $name): User
{
    Permission::findOrCreate('professional.attend', 'web');

    $professional = User::factory()->create(['tenant_id' => $colleague->tenant_id, 'name' => $name]);
    $professional->givePermissionTo('professional.attend');

    return $professional;
}

function bookingPatient(User $user, string $name): Patient
{
    return Patient::create(['name' => $name, 'type' => 'pilates', 'user_id' => $user->id]);
}

function bookingCapacity(User $user, int $capacity): void
{
    $user->tenant->update(['schedule_settings' => ['slot_capacity' => $capacity]]);
}

function bookFixed(Patient $patient, User $professional, array $overrides = []): TestResponse
{
    return test()->post('/recurring-bookings', array_merge([
        'mode' => 'fixed',
        'patient_id' => $patient->id,
        'user_id' => $professional->id,
        'day_of_week' => 1,
        'start_time' => '08:00',
        'starts_on' => '2026-10-12',
    ], $overrides));
}

function bookSingle(Patient $patient, User $professional, string $date = '2026-10-12', string $time = '08:00'): TestResponse
{
    return test()->post('/recurring-bookings', [
        'mode' => 'single',
        'patient_id' => $patient->id,
        'user_id' => $professional->id,
        'date' => $date,
        'start_time' => $time,
    ]);
}

/**
 * @return list<string>
 */
function bookedDates(RecurringBooking $booking): array
{
    return $booking->appointments()->orderBy('appointment_date')->get()
        ->map(fn (Appointment $a) => $a->appointment_date->toDateString())->all();
}

beforeEach(function () {
    $this->travelTo('2026-10-12 09:00'); // a Monday
});

test('a fixed slot books the patient every week, with their own professional, up to the horizon', function () {
    $desk = bookingDesk();
    $amanda = bookingProfessional($desk, 'Amanda');
    $anizia = bookingPatient($desk, 'Anizia');

    bookFixed($anizia, $amanda)->assertSessionHasNoErrors()->assertSessionHas('success');

    $booking = RecurringBooking::sole();
    expect(bookedDates($booking))->toBe([
        '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09',
        '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07',
    ]);

    $appointment = $booking->appointments()->first();
    expect($appointment->user_id)->toBe($amanda->id)
        ->and($appointment->type)->toBe('individual')
        ->and($appointment->recurrence_date->toDateString())->toBe($appointment->appointment_date->toDateString())
        ->and($appointment->patients()->pluck('patients.id')->all())->toBe([$anizia->id]);
});

test('patients of different professionals share the same time slot', function () {
    $desk = bookingDesk();
    $amanda = bookingProfessional($desk, 'Amanda');
    $silvana = bookingProfessional($desk, 'Silvana');

    bookSingle(bookingPatient($desk, 'Anizia'), $amanda)->assertSessionHasNoErrors();
    bookSingle(bookingPatient($desk, 'Maria'), $silvana)->assertSessionHasNoErrors();
    bookSingle(bookingPatient($desk, 'Eliete'), $silvana)->assertSessionHasNoErrors();

    expect(Appointment::where('appointment_date', '2026-10-12')->count())->toBe(3)
        ->and(Appointment::studentsInSlot($desk->tenant_id, '2026-10-12', '08:00'))->toBe(3);
});

test('the slot capacity refuses one patient too many', function () {
    $desk = bookingDesk();
    bookingCapacity($desk, 2);
    $amanda = bookingProfessional($desk, 'Amanda');

    bookSingle(bookingPatient($desk, 'A'), $amanda)->assertSessionHasNoErrors();
    bookSingle(bookingPatient($desk, 'B'), $amanda)->assertSessionHasNoErrors();
    bookSingle(bookingPatient($desk, 'C'), $amanda)
        ->assertSessionHasErrors(['start_time' => 'Horário lotado: 2/2 alunos.']);

    expect(Appointment::count())->toBe(2);
});

test('class students take places in the slot and cancelled ones free them', function () {
    $desk = bookingDesk();
    bookingCapacity($desk, 2);
    $amanda = bookingProfessional($desk, 'Amanda');
    $class = Appointment::create([
        'user_id' => $amanda->id,
        'type' => 'group',
        'max_participants' => 4,
        'appointment_date' => '2026-10-12',
        'start_time' => '08:00:00',
        'duration_minutes' => 50,
        'status' => 'scheduled',
    ]);
    $class->patients()->attach(bookingPatient($desk, 'Turma 1')->id, ['status' => 'scheduled']);
    $cancelled = bookingPatient($desk, 'Turma 2');
    $class->patients()->attach($cancelled->id, ['status' => 'scheduled']);

    bookSingle(bookingPatient($desk, 'Avulso'), $amanda)->assertSessionHasErrors('start_time');

    $class->patients()->updateExistingPivot($cancelled->id, ['status' => 'cancelled']);

    bookSingle(bookingPatient($desk, 'Avulso 2'), $amanda)->assertSessionHasNoErrors();
});

test('a fixed slot skips the weeks that are already full and says which', function () {
    $desk = bookingDesk();
    bookingCapacity($desk, 1);
    $amanda = bookingProfessional($desk, 'Amanda');
    bookSingle(bookingPatient($desk, 'Já marcado'), $amanda, '2026-10-19');

    bookFixed(bookingPatient($desk, 'Geovana'), $amanda)
        ->assertSessionHasNoErrors()
        ->assertSessionHas('warning', fn (string $warning) => str_contains($warning, '19/10'));

    expect(RecurringBooking::sole()->appointments()->count())->toBe(8);
});

test('a fixed slot is refused when no week has room', function () {
    $desk = bookingDesk();
    bookingCapacity($desk, 1);
    $amanda = bookingProfessional($desk, 'Amanda');
    bookFixed(bookingPatient($desk, 'Primeira'), $amanda)->assertSessionHasNoErrors();

    bookFixed(bookingPatient($desk, 'Segunda'), $amanda)->assertSessionHasErrors('start_time');

    expect(RecurringBooking::count())->toBe(1);
});

test('a patient cannot hold the same fixed slot twice', function () {
    $desk = bookingDesk();
    $amanda = bookingProfessional($desk, 'Amanda');
    $anizia = bookingPatient($desk, 'Anizia');
    bookFixed($anizia, $amanda);

    bookFixed($anizia, $amanda)->assertSessionHasErrors('start_time');
});

test('the professional and the patient must belong to the clinic', function () {
    $desk = bookingDesk();
    $outsider = bookingProfessional(User::factory()->create(), 'De fora');

    bookFixed(bookingPatient($desk, 'Anizia'), $outsider)->assertSessionHasErrors('user_id');
});

test('running the generator again only adds the week that entered the horizon', function () {
    $desk = bookingDesk();
    bookFixed(bookingPatient($desk, 'Anizia'), bookingProfessional($desk, 'Amanda'));

    $this->artisan('bookings:generate')->assertSuccessful();
    expect(Appointment::count())->toBe(9);

    $this->travelTo('2026-10-19 09:00');
    $this->artisan('bookings:generate')->assertSuccessful();
    expect(Appointment::count())->toBe(10);
});

test('cancelling one week keeps the fixed slot and the week is not recreated', function () {
    $desk = bookingDesk();
    bookFixed(bookingPatient($desk, 'Anizia'), bookingProfessional($desk, 'Amanda'));
    $week = Appointment::where('appointment_date', '2026-10-19')->sole();

    $this->delete("/appointments/{$week->id}")->assertSessionHas('success');

    expect($week->fresh()->status)->toBe('cancelled');
    $this->artisan('bookings:generate');
    expect(Appointment::count())->toBe(9);
});

test('rescheduling one week does not bring the original week back', function () {
    $desk = bookingDesk();
    bookFixed(bookingPatient($desk, 'Anizia'), bookingProfessional($desk, 'Amanda'));
    $week = Appointment::where('appointment_date', '2026-10-19')->sole();

    $this->postJson("/appointments/{$week->id}/reschedule", [
        'appointment_date' => '2026-10-20',
        'start_time' => '10:00',
        'update_mode' => 'single',
    ])->assertOk();

    $this->artisan('bookings:generate');
    expect(Appointment::where('appointment_date', '2026-10-19')->exists())->toBeFalse()
        ->and(Appointment::count())->toBe(9);
});

test('moving the fixed slot moves this and the next weeks, and future weeks follow', function () {
    $desk = bookingDesk();
    bookFixed(bookingPatient($desk, 'Anizia'), bookingProfessional($desk, 'Amanda'));
    $booking = RecurringBooking::sole();
    $week = Appointment::where('appointment_date', '2026-10-19')->sole();

    $this->postJson("/appointments/{$week->id}/reschedule", [
        'appointment_date' => '2026-10-21',
        'start_time' => '09:00',
        'update_mode' => 'future',
    ])->assertOk();

    expect(bookedDates($booking))->toBe([
        '2026-10-12', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11',
        '2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09',
    ])
        ->and($booking->fresh()->day_of_week)->toBe(3)
        ->and($booking->fresh()->startTime())->toBe('09:00');

    $this->artisan('bookings:generate');
    expect(Appointment::count())->toBe(9);
});

test('moving the fixed slot is refused when a target week is full', function () {
    $desk = bookingDesk();
    bookingCapacity($desk, 1);
    $amanda = bookingProfessional($desk, 'Amanda');
    bookFixed(bookingPatient($desk, 'Anizia'), $amanda);
    bookSingle(bookingPatient($desk, 'Ocupante'), $amanda, '2026-10-28', '09:00');
    $week = Appointment::where('appointment_date', '2026-10-19')->sole();

    $this->postJson("/appointments/{$week->id}/reschedule", [
        'appointment_date' => '2026-10-21',
        'start_time' => '09:00',
        'update_mode' => 'future',
    ])->assertStatus(422)->assertJsonPath('message', fn (string $message) => str_contains($message, '28/10'));

    expect($week->fresh()->appointment_date->toDateString())->toBe('2026-10-19');
});

test('ending a fixed slot removes only its upcoming weeks nobody attended', function () {
    $desk = bookingDesk();
    $amanda = bookingProfessional($desk, 'Amanda');
    $anizia = bookingPatient($desk, 'Anizia');
    bookFixed($anizia, $amanda);
    bookSingle(bookingPatient($desk, 'Outra'), $amanda, '2026-10-26');
    $booking = RecurringBooking::sole();
    $booking->appointments()->where('appointment_date', '2026-10-12')->sole()
        ->patients()->updateExistingPivot($anizia->id, ['status' => 'attended']);

    $this->travelTo('2026-10-14 09:00');
    $this->delete("/recurring-bookings/{$booking->id}")->assertSessionHas('success');

    expect(bookedDates($booking))->toBe(['2026-10-12'])
        ->and($booking->fresh()->ends_on->toDateString())->toBe('2026-10-13')
        ->and(Appointment::where('appointment_date', '2026-10-26')->count())->toBe(1);

    $this->artisan('bookings:generate');
    expect(bookedDates($booking))->toBe(['2026-10-12']);
});

test('"this and the next ones" on a fixed slot week ends the fixed slot', function () {
    $desk = bookingDesk();
    bookFixed(bookingPatient($desk, 'Anizia'), bookingProfessional($desk, 'Amanda'));
    $week = Appointment::where('appointment_date', '2026-11-02')->sole();

    $this->delete("/appointments/{$week->id}?delete_mode=future")->assertSessionHas('success');

    expect(RecurringBooking::sole()->ends_on->toDateString())->toBe('2026-11-01')
        ->and(Appointment::count())->toBe(3);
});

test('fixed slots of another clinic cannot be ended', function () {
    $desk = bookingDesk();
    bookFixed(bookingPatient($desk, 'Anizia'), bookingProfessional($desk, 'Amanda'));
    $booking = RecurringBooking::sole();

    bookingDesk(); // someone from another clinic

    $this->delete("/recurring-bookings/{$booking->id}")->assertNotFound();
});

test('the regular appointment form lets a professional see several patients at once', function () {
    $desk = bookingDesk();
    $amanda = bookingProfessional($desk, 'Amanda');
    $payload = fn (Patient $patient) => [
        'patient_ids' => [$patient->id],
        'type' => 'individual',
        'max_participants' => 1,
        'appointment_date' => '2026-10-13',
        'start_time' => '08:00',
        'duration_minutes' => 50,
        'user_id' => $amanda->id,
        'title' => null,
        'notes' => null,
    ];

    $this->post('/appointments', $payload(bookingPatient($desk, 'A')))->assertSessionHasNoErrors();
    $this->post('/appointments', $payload(bookingPatient($desk, 'B')))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('warning');

    expect(Appointment::where('appointment_date', '2026-10-13')->count())->toBe(2);
});
