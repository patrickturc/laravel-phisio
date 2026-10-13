<?php

use App\Models\Membership;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

/**
 * @param  list<string>  $permissions
 */
function celebrationsUser(array $permissions = ['patients.manage.view']): User
{
    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);
    test()->actingAs($user);

    return $user;
}

function celebratedPatient(User $user, string $name, array $attributes = []): Patient
{
    return Patient::create(['name' => $name, 'user_id' => $user->id, ...$attributes]);
}

test('birthdays of the chosen month are listed by day with the age being turned', function () {
    $this->travelTo('2026-10-13');
    $user = celebrationsUser();
    celebratedPatient($user, 'Anizia de Jesus Silva', ['birthdate' => '1990-10-09', 'phone' => '(11) 98600-8482']);
    celebratedPatient($user, 'Edilaine Feitosa', ['birthdate' => '1985-10-04']);
    celebratedPatient($user, 'Edivana Maura', ['birthdate' => '1990-11-02']);
    celebratedPatient($user, 'Sem Data');

    $this->get('/celebrations?month=10')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('celebrations/index')
            ->where('tab', 'birthdays')
            ->where('month', 10)
            ->has('rows', 2)
            ->where('rows.0.name', 'Edilaine Feitosa')
            ->where('rows.0.day', 4)
            ->where('rows.0.years', 41)
            ->where('rows.1.name', 'Anizia de Jesus Silva')
            ->where('rows.1.phone', '(11) 98600-8482')
            ->has('monthCounts', 12)
            ->where('monthCounts.9', 2)
            ->where('monthCounts.10', 1)
        );
});

test('the current month is shown when none is chosen', function () {
    $this->travelTo('2026-03-15');
    $user = celebrationsUser();
    celebratedPatient($user, 'Maria de Fátima', ['birthdate' => '2000-03-20']);

    $this->get('/celebrations')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('month', 3)
            ->where('currentMonth', 3)
            ->has('rows', 1)
        );
});

test('enrollment anniversaries only list patients completing at least one year', function () {
    $this->travelTo('2026-10-13');
    $user = celebrationsUser();
    celebratedPatient($user, 'Geovana Silva', ['enrollment_date' => '2023-10-20']);
    celebratedPatient($user, 'Joselia de Abreu', ['enrollment_date' => '2026-10-01']);
    celebratedPatient($user, 'Sônia Isabel', ['enrollment_date' => '2025-09-05']);

    $this->get('/celebrations?tab=enrollment&month=10')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('tab', 'enrollment')
            ->has('rows', 1)
            ->where('rows.0.name', 'Geovana Silva')
            ->where('rows.0.years', 3)
            ->where('monthCounts.8', 1)
            ->where('monthCounts.9', 1)
        );
});

test('patients of another clinic are not listed', function () {
    $this->travelTo('2026-10-13');
    $owner = celebrationsUser();
    celebratedPatient($owner, 'Nilza Bellon', ['birthdate' => '1970-10-10']);

    celebrationsUser(); // a user of a different tenant

    $this->get('/celebrations?month=10')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('rows', 0));
});

test('the page requires permission to view patients', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/celebrations')->assertForbidden();
});

test('the clinic can save its own message and go back to the default', function () {
    $user = celebrationsUser(['patients.manage.view', 'patients.manage.edit']);

    $this->get('/celebrations')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('templates.birthday', Tenant::DEFAULT_MESSAGE_TEMPLATES['birthday'])
    );

    $this->patch('/celebrations/templates', ['birthday' => 'Parabéns, {primeiro_nome}!'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->get('/celebrations')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('templates.birthday', 'Parabéns, {primeiro_nome}!')
        ->where('templates.enrollment', Tenant::DEFAULT_MESSAGE_TEMPLATES['enrollment'])
    );

    $this->patch('/celebrations/templates', ['birthday' => '']);

    expect($user->tenant->fresh()->messageTemplates()['birthday'])
        ->toBe(Tenant::DEFAULT_MESSAGE_TEMPLATES['birthday']);
});

test('saving a message template requires permission to edit patients', function () {
    celebrationsUser(['patients.manage.view']);

    $this->patch('/celebrations/templates', ['birthday' => 'Oi'])->assertForbidden();
});

test('a new patient is enrolled today unless a date is given', function () {
    $this->travelTo('2026-10-13 15:00');
    $user = celebrationsUser(['patients.manage.view', 'patients.manage.create']);

    expect(celebratedPatient($user, 'Sem data')->enrollment_date->toDateString())->toBe('2026-10-13');

    $this->post('/patients', [
        'name' => 'Com data',
        'type' => 'pilates',
        'enrollment_date' => '2020-02-01',
    ])->assertSessionHasNoErrors();

    expect(Patient::where('name', 'Com data')->sole()->enrollment_date->toDateString())->toBe('2020-02-01');
});

test('patient dates reach the frontend as plain Y-m-d', function () {
    $user = celebrationsUser();
    $patient = celebratedPatient($user, 'Ana', ['birthdate' => '1990-10-09', 'enrollment_date' => '2024-01-15']);

    expect($patient->fresh()->toArray())
        ->birthdate->toBe('1990-10-09')
        ->enrollment_date->toBe('2024-01-15');
});

test('the migration fills the enrollment date from the first membership or the registration day', function () {
    $user = celebrationsUser();
    $member = celebratedPatient($user, 'Com matrículas');
    $newcomer = celebratedPatient($user, 'Sem matrícula');

    foreach (['2025-03-01', '2024-06-10'] as $start) {
        Membership::create([
            'patient_id' => $member->id,
            'plan_name' => 'Pilates 2x',
            'start_date' => $start,
            'end_date' => '2026-12-31',
            'price' => 160,
            'status' => 'active',
        ]);
    }
    DB::table('patients')->where('id', $newcomer->id)->update(['created_at' => '2023-05-05 10:00:00']);

    $migration = require database_path('migrations/2027_01_08_000000_add_enrollment_date_to_patients_table.php');
    $migration->down();
    $migration->up();

    expect(DB::table('patients')->where('id', $member->id)->value('enrollment_date'))->toBe('2024-06-10')
        ->and(DB::table('patients')->where('id', $newcomer->id)->value('enrollment_date'))->toBe('2023-05-05');
});
