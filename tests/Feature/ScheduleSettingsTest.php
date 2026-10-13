<?php

use App\Models\Tenant;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function agendaManager(bool $canManageSettings = true): User
{
    $permissions = ['appointments.manage.view'];
    if ($canManageSettings) {
        $permissions[] = 'appointments.settings.manage';
    }

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);
    test()->actingAs($user);

    return $user;
}

function teamMember(User $colleague, string $name): User
{
    Permission::findOrCreate('professional.attend', 'web');

    $user = User::factory()->create(['tenant_id' => $colleague->tenant_id, 'name' => $name]);
    $user->givePermissionTo('professional.attend');

    return $user;
}

/**
 * @return array<string, mixed>
 */
function scheduleSettingsPayload(array $overrides = []): array
{
    $hours = array_fill(0, 7, ['open' => true, 'start' => '07:00', 'end' => '19:00']);
    $hours[0] = ['open' => false, 'start' => '08:00', 'end' => '12:00'];

    return array_merge([
        'business_hours' => $hours,
        'breaks' => [['start' => '11:00', 'end' => '14:00']],
        'slot_capacity' => 4,
        'default_duration' => 55,
    ], $overrides);
}

test('the clinic saves its business hours, breaks, capacity and team colours', function () {
    $manager = agendaManager();
    $amanda = teamMember($manager, 'Amanda');

    $this->patch('/settings/schedule', scheduleSettingsPayload(['colors' => [$amanda->id => '#ff6600']]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $settings = $manager->tenant->fresh()->scheduleSettings();
    expect($settings['slot_capacity'])->toBe(4)
        ->and($settings['default_duration'])->toBe(55)
        ->and($settings['business_hours'][0]['open'])->toBeFalse()
        ->and($settings['business_hours'][1]['end'])->toBe('19:00')
        ->and($settings['breaks'])->toBe([['start' => '11:00', 'end' => '14:00']])
        ->and($amanda->fresh()->agendaColor())->toBe('#ff6600');
});

test('clinics without settings get the defaults', function () {
    $manager = agendaManager();

    expect($manager->tenant->scheduleSettings())->toBe(Tenant::DEFAULT_SCHEDULE_SETTINGS)
        ->and($manager->tenant->slotCapacity())->toBe(6);
});

test('closing must come after opening', function () {
    agendaManager();
    $payload = scheduleSettingsPayload();
    $payload['business_hours'][2] = ['open' => true, 'start' => '18:00', 'end' => '08:00'];
    $payload['breaks'] = [['start' => '14:00', 'end' => '11:00']];

    $this->patch('/settings/schedule', $payload)
        ->assertSessionHasErrors(['business_hours.2.end', 'breaks.0.end']);
});

test('changing the agenda settings requires permission', function () {
    agendaManager(canManageSettings: false);

    $this->patch('/settings/schedule', scheduleSettingsPayload())->assertForbidden();
});

test('colours of another clinic professionals are left alone', function () {
    $manager = agendaManager();
    $outsider = teamMember(User::factory()->create(), 'De fora');

    $this->patch('/settings/schedule', scheduleSettingsPayload(['colors' => [$outsider->id => '#000000']]))
        ->assertSessionHasNoErrors();

    expect($outsider->fresh()->agenda_color)->toBeNull();
});

test('the agenda page receives the settings and each professional colour', function () {
    $manager = agendaManager();
    $amanda = teamMember($manager, 'Amanda');
    $amanda->update(['agenda_color' => '#123456']);
    $silvana = teamMember($manager, 'Silvana');

    $this->get('/appointments')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('appointments/index')
            ->where('scheduleSettings.slot_capacity', 6)
            ->where('users.0.name', 'Amanda')
            ->where('users.0.color', '#123456')
            ->where('users.1.color', $silvana->agendaColor())
        );
});

test('the migration grants the agenda settings to administrators', function () {
    $admin = Role::findOrCreate('Administrador', 'web');
    $migration = require database_path('migrations/2027_01_10_000003_add_agenda_settings_permission.php');

    $migration->up();

    expect($admin->fresh()->hasPermissionTo('appointments.settings.manage'))->toBeTrue();
});
