<?php

use App\Models\Appointment;
use App\Models\FinancialTransaction;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\RecurringBooking;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Permission;

function billingDesk(): User
{
    $permissions = ['memberships.manage.view', 'memberships.manage.create', 'memberships.manage.edit', 'memberships.manage.delete'];

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);
    test()->actingAs($user);

    return $user;
}

/**
 * @return array<string, mixed>
 */
function enrollmentPayload(Patient $patient, array $overrides = []): array
{
    return array_merge([
        'patient_id' => $patient->id,
        'plan_name' => 'Pilates 2x',
        'start_date' => '2026-10-13',
        'end_date' => null,
        'price' => 160,
        'status' => 'active',
        'billing_cycle' => 'monthly',
        'first_due_date' => '2026-10-13',
    ], $overrides);
}

/**
 * @return list<string>
 */
function chargeDueDates(Membership $membership): array
{
    return FinancialTransaction::where('membership_id', $membership->id)->orderBy('due_date')->get()
        ->map(fn (FinancialTransaction $t) => $t->due_date->toDateString())->all();
}

beforeEach(function () {
    $this->travelTo('2026-10-13 09:00');
});

test('a weekly membership is charged every week, a cycle ahead at most', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Anizia', 'user_id' => $desk->id]);

    $this->post('/memberships', enrollmentPayload($patient, ['billing_cycle' => 'weekly', 'price' => 45]))
        ->assertSessionHasNoErrors();
    $membership = Membership::sole();

    expect(chargeDueDates($membership))->toBe(['2026-10-13'])
        ->and($membership->next_billing_date->toDateString())->toBe('2026-10-20');

    $this->artisan('charges:generate');
    expect(chargeDueDates($membership))->toBe(['2026-10-13']);

    $this->travelTo('2026-10-14 06:00');
    $this->artisan('charges:generate');
    expect(chargeDueDates($membership))->toBe(['2026-10-13', '2026-10-20']);
});

test('a quarterly membership keeps its day of the month', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Maria', 'user_id' => $desk->id]);

    $this->post('/memberships', enrollmentPayload($patient, ['billing_cycle' => 'quarterly', 'first_due_date' => '2026-10-31']))
        ->assertSessionHasNoErrors();
    $membership = Membership::sole();

    expect($membership->next_billing_date->toDateString())->toBe('2027-01-31');

    $this->travelTo('2027-01-02 06:00');
    $this->artisan('charges:generate');

    expect(chargeDueDates($membership))->toBe(['2026-10-31', '2027-01-31'])
        ->and(Membership::nextDueAfter(now()->setDate(2027, 1, 31), 'monthly', 31)->toDateString())->toBe('2027-02-28');
});

test('a single-charge membership is charged once', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Pacote', 'user_id' => $desk->id]);

    $this->post('/memberships', enrollmentPayload($patient, ['billing_cycle' => null, 'end_date' => '2027-01-13']))
        ->assertSessionHasNoErrors();

    $this->travelTo('2026-11-14 06:00');
    $this->artisan('charges:generate');

    expect(chargeDueDates(Membership::sole()))->toBe(['2026-10-13']);
});

test('an open-ended membership never expires and keeps billing', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Contínua', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient))->assertSessionHasNoErrors();
    $membership = Membership::sole();

    $this->travelTo('2027-03-01 06:00');
    $this->artisan('charges:generate');

    expect($membership->fresh()->status)->toBe('active')
        ->and($membership->fresh()->end_date)->toBeNull()
        ->and(chargeDueDates($membership))->toContain('2027-03-13')
        ->and(Membership::activeForAttendance($patient->id, '2027-03-02')?->id)->toBe($membership->id);
});

test('charges stop at the end date and the membership then expires', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Com fim', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient, ['end_date' => '2026-11-30']))->assertSessionHasNoErrors();
    $membership = Membership::sole();

    $this->travelTo('2026-11-01 06:00');
    $this->artisan('charges:generate');
    $this->travelTo('2026-12-01 06:00');
    $this->artisan('charges:generate');

    expect(chargeDueDates($membership))->toBe(['2026-10-13', '2026-11-13'])
        ->and($membership->fresh()->status)->toBe('expired');
});

test('the daily command bills each membership to its own clinic', function () {
    Tenant::factory()->create(); // another clinic, created first
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Da clínica', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient));

    Auth::logout(); // the scheduler runs with nobody logged in
    $this->travelTo('2026-11-01 06:00');
    $this->artisan('charges:generate');

    expect(FinancialTransaction::withoutGlobalScopes()->where('membership_id', Membership::withoutGlobalScopes()->sole()->id)->pluck('tenant_id')->unique()->all())
        ->toBe([$desk->tenant_id]);
});

test('a paused membership is not charged, and resumes on its return date', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Viajando', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient, ['end_date' => '2027-06-30']));
    $membership = Membership::sole();

    $this->post("/memberships/{$membership->id}/pause", ['paused_until' => '2026-12-01'])
        ->assertSessionHasNoErrors();
    expect($membership->fresh()->status)->toBe('paused');

    $this->travelTo('2026-11-01 06:00');
    $this->artisan('charges:generate');
    expect(chargeDueDates($membership))->toBe(['2026-10-13']);

    $this->travelTo('2026-12-01 06:00');
    $this->artisan('charges:generate');

    $membership->refresh();
    expect($membership->status)->toBe('active')
        ->and(chargeDueDates($membership))->toBe(['2026-10-13', '2026-12-13'])
        ->and($membership->end_date->toDateString())->toBe('2027-08-18'); // 49 days paused
});

test('pausing classes takes the fixed-slot weeks off the agenda until the patient returns', function () {
    $desk = billingDesk();
    $professional = User::factory()->create(['tenant_id' => $desk->tenant_id]);
    $patient = Patient::create(['name' => 'Anizia', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient));
    $booking = RecurringBooking::create([
        'patient_id' => $patient->id,
        'user_id' => $professional->id,
        'day_of_week' => 1,
        'start_time' => '08:00',
        'duration_minutes' => 50,
        'starts_on' => '2026-10-13',
    ]);
    $booking->generateAppointments();
    $weeks = fn () => $booking->appointments()->orderBy('appointment_date')->get()
        ->map(fn (Appointment $a) => $a->appointment_date->toDateString())->all();
    expect($weeks())->toHaveCount(8); // 19/10 … 07/12

    $this->post('/memberships/'.Membership::sole()->id.'/pause', ['paused_until' => '2026-11-03', 'pauses_classes' => true])
        ->assertSessionHas('success');

    expect($weeks())->toBe(['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07']);

    $booking->generateAppointments();
    expect($weeks())->not->toContain('2026-10-26');

    $this->post('/memberships/'.Membership::sole()->id.'/resume')->assertSessionHas('success');
    expect($weeks())->toContain('2026-10-19', '2026-10-26', '2026-11-02');
});

test('only active memberships can be paused, and pausing needs permission', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Cancelada', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient, ['status' => 'cancelled']));
    $membership = Membership::sole();

    $this->post("/memberships/{$membership->id}/pause")->assertSessionHas('error');

    $viewer = User::factory()->create(['tenant_id' => $desk->tenant_id]);
    $viewer->givePermissionTo('memberships.manage.view');
    $this->actingAs($viewer)->post("/memberships/{$membership->id}/pause")->assertForbidden();
});

test('renewing keeps the billing cycle and open-ended memberships are not renewed', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Renova', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient, ['billing_cycle' => 'biweekly', 'end_date' => '2026-11-12']));
    $fixed = Membership::sole();

    $this->post("/memberships/{$fixed->id}/renew")->assertRedirect();
    $renewed = Membership::where('id', '!=', $fixed->id)->sole();
    expect($renewed->billing_cycle)->toBe('biweekly');

    $openEnded = Patient::create(['name' => 'Contínua', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($openEnded));
    $continuous = Membership::where('patient_id', $openEnded->id)->sole();

    $this->post("/memberships/{$continuous->id}/renew")->assertSessionHas('error');
});

test('switching a membership to a single charge stops the recurring charges', function () {
    $desk = billingDesk();
    $patient = Patient::create(['name' => 'Troca', 'user_id' => $desk->id]);
    $this->post('/memberships', enrollmentPayload($patient));
    $membership = Membership::sole();

    $this->put("/memberships/{$membership->id}", [
        'plan_name' => 'Pilates 2x',
        'start_date' => '2026-10-13',
        'price' => 160,
        'status' => 'active',
        'billing_cycle' => null,
    ])->assertSessionHasNoErrors();

    expect($membership->fresh()->billing_cycle)->toBeNull()
        ->and($membership->fresh()->billing_day)->toBeNull();

    $this->travelTo('2026-11-14 06:00');
    $this->artisan('charges:generate');
    expect(chargeDueDates($membership))->toBe(['2026-10-13']);
});
