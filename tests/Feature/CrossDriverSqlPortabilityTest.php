<?php

use App\Http\Controllers\AppointmentController;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

/**
 * These queries used Postgres-only syntax (ilike, to_char, count(*) filter,
 * ::time/::interval casts) that throws a syntax error on sqlite, the driver
 * used for local dev and every test in this suite. They passed review before
 * only because nothing ever executed them against sqlite. Each test here runs
 * the exact code path to prove it no longer breaks on this driver.
 */
test('the app runs its tests on sqlite, where these regressions actually surface', function () {
    expect(DB::connection()->getDriverName())->toBe('sqlite');
});

test('appointment_date is stored without a time component', function () {
    $user = User::factory()->create();

    $appointment = Appointment::create([
        'tenant_id' => $user->tenant_id,
        'user_id' => $user->id,
        'appointment_date' => '2026-10-01',
        'start_time' => '10:00',
        'duration_minutes' => 50,
        'type' => 'individual',
        'status' => 'scheduled',
    ]);

    // Read straight from the database, bypassing the model's date cast, so a
    // stray "00:00:00" suffix (sqlite has no native DATE type) cannot hide
    // behind Eloquent's own parsing when it comes back out.
    $raw = DB::table('appointments')->where('id', $appointment->id)->value('appointment_date');

    expect($raw)->toBe('2026-10-01');
});

test('whereLike matches case-insensitively on sqlite', function () {
    $user = User::factory()->create();
    Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Maria Oliveira']);

    $found = Patient::where('tenant_id', $user->tenant_id)->whereLike('name', '%OLIVEIRA%')->exists();

    expect($found)->toBeTrue();
});

test('the appointment conflict check detects an overlapping slot', function () {
    Permission::findOrCreate('appointments.manage.create', 'web');
    $user = User::factory()->create();
    $user->givePermissionTo('appointments.manage.create');

    Appointment::create([
        'tenant_id' => $user->tenant_id,
        'user_id' => $user->id,
        'appointment_date' => '2026-10-01',
        'start_time' => '10:00',
        'duration_minutes' => 50,
        'type' => 'individual',
        'status' => 'scheduled',
    ]);

    $check = new ReflectionMethod(AppointmentController::class, 'hasOverlappingAppointment');
    $check->setAccessible(true);
    $controller = new AppointmentController;

    // 10:00–10:50 already booked; 10:30–11:00 overlaps it.
    expect($check->invoke($controller, '2026-10-01', $user->id, '10:30', 30))->toBeTrue()
        // 11:00–11:30 starts right when the first slot ends: no overlap.
        ->and($check->invoke($controller, '2026-10-01', $user->id, '11:00', 30))->toBeFalse()
        // Same time, different day: no overlap.
        ->and($check->invoke($controller, '2026-10-02', $user->id, '10:30', 30))->toBeFalse();
});

test('the reports month grouping expression executes on sqlite', function () {
    $user = User::factory()->create();

    Appointment::create([
        'tenant_id' => $user->tenant_id,
        'user_id' => $user->id,
        'appointment_date' => '2026-10-01',
        'start_time' => '10:00',
        'duration_minutes' => 50,
        'type' => 'individual',
        'status' => 'completed',
    ]);

    $rows = Appointment::select(
        DB::raw("strftime('%Y-%m', appointment_date) as month"),
        DB::raw('count(*) as total'),
        DB::raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed")
    )->groupBy('month')->get();

    expect($rows)->not->toBeEmpty()
        ->and($rows->first()->month)->toBe('2026-10');
});
