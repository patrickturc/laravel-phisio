<?php

use App\Http\Controllers\GroupClassController;
use App\Models\Appointment;
use App\Models\GroupClass;
use App\Models\GroupClassSchedule;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

function userCanManageClasses(): User
{
    foreach (['group_classes.manage.edit', 'group_classes.manage.delete'] as $p) {
        Permission::findOrCreate($p, 'web');
    }
    $user = User::factory()->create();
    $user->givePermissionTo(['group_classes.manage.edit', 'group_classes.manage.delete']);
    test()->actingAs($user);

    return $user;
}

function classWithMondaySchedule(User $user): GroupClass
{
    $gc = GroupClass::create([
        'user_id' => $user->id,
        'name' => 'Pilates Segunda',
        'color' => '#8b5cf6',
        'max_participants' => 4,
        'status' => 'active',
    ]);
    GroupClassSchedule::create([
        'group_class_id' => $gc->id,
        'day_of_week' => 1, // Monday
        'start_time' => '18:00',
        'duration_minutes' => 50,
    ]);

    return $gc;
}

test('extend-active generates appointments for active classes up to the horizon', function () {
    $user = userCanManageClasses();
    $gc = classWithMondaySchedule($user);

    test()->post(route('group-classes.extend-active'))->assertRedirect();

    $count = Appointment::where('group_class_id', $gc->id)->count();
    $weeks = GroupClassController::HORIZON_WEEKS;

    // Roughly one appointment per week within the horizon (allow ±1 for the
    // partial weeks at each end).
    expect($count)->toBeGreaterThanOrEqual($weeks - 1)->toBeLessThanOrEqual($weeks + 1);
    // Every generated appointment is linked back to its schedule slot.
    expect(Appointment::where('group_class_id', $gc->id)->whereNotNull('schedule_id')->count())->toBe($count);
});

test('extend-active is idempotent (no duplicates on a second run)', function () {
    $user = userCanManageClasses();
    $gc = classWithMondaySchedule($user);

    test()->post(route('group-classes.extend-active'));
    $first = Appointment::where('group_class_id', $gc->id)->count();

    test()->post(route('group-classes.extend-active'));
    $second = Appointment::where('group_class_id', $gc->id)->count();

    expect($second)->toBe($first);
});

test('adding a student to a class adds them to future scheduled appointments', function () {
    $user = userCanManageClasses();
    $gc = classWithMondaySchedule($user);
    test()->post(route('group-classes.extend-active'));

    $futureCount = Appointment::where('group_class_id', $gc->id)->where('status', 'scheduled')->count();
    expect($futureCount)->toBeGreaterThan(0);

    $patient = Patient::create(['name' => 'Novo Aluno', 'user_id' => $user->id]);

    test()->put(route('group-classes.update', $gc->id), [
        'patient_ids' => [$patient->id],
    ])->assertRedirect();

    // The new student is now attached to every future scheduled class.
    $attachedCount = Appointment::where('group_class_id', $gc->id)
        ->where('status', 'scheduled')
        ->whereHas('patients', fn ($q) => $q->where('patients.id', $patient->id))
        ->count();

    expect($attachedCount)->toBe($futureCount);
});

test('removing a student drops them from future scheduled appointments only', function () {
    $user = userCanManageClasses();
    $gc = classWithMondaySchedule($user);
    $patient = Patient::create(['name' => 'Aluno', 'user_id' => $user->id]);
    $gc->patients()->attach($patient->id);
    test()->post(route('group-classes.extend-active'));

    // Mark the first class as attended — that must NOT be undone by removal.
    $first = Appointment::where('group_class_id', $gc->id)->orderBy('appointment_date')->first();
    $first->patients()->updateExistingPivot($patient->id, ['status' => 'attended']);

    test()->put(route('group-classes.update', $gc->id), ['patient_ids' => []])->assertRedirect();

    // Still attached to the attended class (history preserved)...
    expect($first->fresh()->patients()->where('patients.id', $patient->id)->exists())->toBeTrue();

    // ...but no longer enrolled (pivot "scheduled") in any future class.
    $stillEnrolled = DB::table('appointment_patient')
        ->join('appointments', 'appointments.id', '=', 'appointment_patient.appointment_id')
        ->where('appointments.group_class_id', $gc->id)
        ->where('appointment_patient.patient_id', $patient->id)
        ->where('appointment_patient.status', 'scheduled')
        ->count();
    expect($stillEnrolled)->toBe(0);
});

test('deleting a class soft-deletes it and never orphans its appointments', function () {
    $user = userCanManageClasses();
    $gc = classWithMondaySchedule($user);
    test()->post(route('group-classes.extend-active'));

    test()->delete(route('group-classes.destroy', $gc->id));

    // Class is soft-deleted; appointments keep their group_class_id link.
    expect(GroupClass::withTrashed()->find($gc->id)->trashed())->toBeTrue();
    expect(Appointment::whereNull('group_class_id')->where('type', 'group')->count())->toBe(0);
});

test('showing class details displays detailed absences', function () {
    $user = userCanManageClasses();
    Permission::findOrCreate('group_classes.manage.view', 'web');
    $user->givePermissionTo('group_classes.manage.view');

    $gc = classWithMondaySchedule($user);
    $patient = Patient::create(['name' => 'Aluno Faltoso', 'user_id' => $user->id]);
    $gc->patients()->attach($patient->id);

    // Create an appointment and mark the patient as missed
    $app = Appointment::create([
        'user_id' => $user->id,
        'group_class_id' => $gc->id,
        'title' => $gc->name,
        'type' => 'group',
        'max_participants' => $gc->max_participants,
        'appointment_date' => now()->subDay()->format('Y-m-d'),
        'start_time' => '18:00:00',
        'duration_minutes' => 50,
    ]);
    $app->patients()->attach($patient->id, ['status' => 'missed']);

    $response = test()->get(route('group-classes.show', $gc->id));
    $response->assertStatus(200);

    // Assert Inertia page receives the absences prop
    $response->assertInertia(fn (Assert $page) => $page
        ->component('group-classes/show')
        ->has('absences', 1)
        ->where('absences.0.patient_name', 'Aluno Faltoso')
        ->where('absences.0.appointment_date', $app->appointment_date->format('Y-m-d'))
    );
});

test('editing a class without choosing a professional keeps its professional', function () {
    $owner = userCanManageClasses();
    $gc = classWithMondaySchedule($owner);

    // A colleague toggles the class off: the form sends no user_id.
    $colleague = User::factory()->create(['tenant_id' => $owner->tenant_id]);
    $colleague->givePermissionTo('group_classes.manage.edit');
    $this->actingAs($colleague);

    $this->put("/group-classes/{$gc->id}", ['status' => 'inactive'])->assertRedirect();

    expect($gc->fresh()->user_id)->toBe($owner->id);
});

test('changing the class professional moves its upcoming classes to them', function () {
    $owner = userCanManageClasses();
    $gc = classWithMondaySchedule($owner);
    $newProfessional = User::factory()->create(['tenant_id' => $owner->tenant_id]);
    $upcoming = Appointment::create([
        'user_id' => $owner->id,
        'group_class_id' => $gc->id,
        'type' => 'group',
        'max_participants' => 4,
        'appointment_date' => now()->addWeek()->toDateString(),
        'start_time' => '18:00',
        'duration_minutes' => 50,
        'status' => 'scheduled',
    ]);

    $this->put("/group-classes/{$gc->id}", ['user_id' => $newProfessional->id])->assertRedirect();

    expect($gc->fresh()->user_id)->toBe($newProfessional->id)
        ->and($upcoming->fresh()->user_id)->toBe($newProfessional->id);
});
