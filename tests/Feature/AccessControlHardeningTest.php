<?php

use App\Models\Appointment;
use App\Models\Evolution;
use App\Models\FinancialTransaction;
use App\Models\Patient;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

/**
 * @param  list<string>  $permissions
 */
function userWith(array $permissions, ?Tenant $tenant = null): User
{
    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create($tenant ? ['tenant_id' => $tenant->id] : []);
    $user->givePermissionTo($permissions);

    return $user;
}

/**
 * A clinic whose default roles exist, with its Administrador.
 */
function hardeningClinic(): User
{
    foreach ([
        'dashboard.view', 'patients.manage.view', 'patients.manage.edit',
        'evolutions.manage.view', 'financial.transactions.view', 'financial.transactions.edit',
        'settings.users.view', 'settings.users.create', 'settings.users.edit', 'settings.users.delete',
        'settings.roles.view', 'settings.roles.create', 'settings.roles.edit',
    ] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $tenant = Tenant::factory()->create(['status' => 'active', 'max_users' => 20]);
    $admin = User::factory()->create(['tenant_id' => $tenant->id]);
    $admin->assignRole(Role::ownerFor($tenant));

    return $admin;
}

/**
 * Someone allowed to manage users who is not an administrador.
 */
function userManager(User $admin): User
{
    $role = Role::create(['name' => 'Gerente', 'tenant_id' => $admin->tenant_id]);
    $role->syncPermissions(['patients.manage.view', 'settings.users.view', 'settings.users.create', 'settings.users.edit', 'settings.users.delete', 'settings.roles.view', 'settings.roles.edit']);

    $manager = User::factory()->create(['tenant_id' => $admin->tenant_id]);
    $manager->assignRole($role);

    return $manager;
}

function patientWithRecords(Tenant $tenant, User $professional): Patient
{
    $patient = Patient::create([
        'tenant_id' => $tenant->id,
        'user_id' => $professional->id,
        'name' => 'Ana Paciente',
        'cpf' => '52998224725',
        'health_notes' => 'Hérnia de disco L4-L5',
    ]);

    Evolution::create([
        'tenant_id' => $tenant->id,
        'paciente_id' => $patient->id,
        'profissional_id' => $professional->id,
        'data_atendimento' => now()->toDateString(),
        'tipo_atendimento' => 'sessao',
        'evolution_type' => 'simple',
        'observacoes' => 'Dor lombar irradiada',
    ]);

    FinancialTransaction::create([
        'tenant_id' => $tenant->id,
        'patient_id' => $patient->id,
        'type' => 'income',
        'description' => 'Mensalidade',
        'amount' => 300,
        'date' => now()->toDateString(),
        'status' => 'pending',
    ]);

    return $patient;
}

// ── Patient record ───────────────────────────────────────────────────────

test('the front desk sees the patient but not the clinical record or finances', function () {
    $reception = userWith(['patients.manage.view']);
    $patient = patientWithRecords($reception->tenant, $reception);

    $this->actingAs($reception)
        ->get(route('patients.show', $patient))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('patient.evolutions', 0)
            ->has('patient.financial_transactions', 0)
            ->has('patient.memberships', 0)
            ->where('financialSummary', null)
            ->where('patient.cpf', '52998224725'));
});

test('a professional sees the clinical record but not the finances', function () {
    $physio = userWith(['patients.manage.view', 'evolutions.manage.view']);
    $patient = patientWithRecords($physio->tenant, $physio);

    $this->actingAs($physio)
        ->get(route('patients.show', $patient))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('patient.evolutions', 1)
            ->has('patient.financial_transactions', 0));
});

test('personal and health data stay out of every other screen', function () {
    $user = userWith(['patients.manage.view']);
    $patient = patientWithRecords($user->tenant, $user);

    expect($patient->fresh()->toArray())
        ->toHaveKey('name')
        ->not->toHaveKeys(['cpf', 'rg', 'health_notes', 'address', 'emergency_contact_phone']);
});

// ── Users and roles ──────────────────────────────────────────────────────

test('a non-admin cannot change an administrador e-mail or password', function () {
    $admin = hardeningClinic();
    $manager = userManager($admin);

    $this->actingAs($manager)->put(route('users.update', $admin), [
        'name' => $admin->name,
        'email' => 'tomado@example.com',
        'password' => 'novaSenha123',
        'role' => Role::ADMIN,
    ])->assertSessionHas('error');

    expect($admin->fresh()->email)->not->toBe('tomado@example.com');

    $this->actingAs($manager)->delete(route('users.destroy', $admin))->assertSessionHas('error');
    expect($admin->fresh())->not->toBeNull();
});

test('a non-admin can only hand out roles within their own permissions', function () {
    $admin = hardeningClinic();
    $manager = userManager($admin);

    // Fisioterapeuta reads the clinical record, which the manager cannot.
    $this->actingAs($manager)->post(route('users.store'), [
        'name' => 'Fisio',
        'email' => 'fisio@example.com',
        'password' => 'password123',
        'role' => 'Fisioterapeuta',
    ])->assertSessionHasErrors('role');

    $narrow = Role::create(['name' => 'Consulta', 'tenant_id' => $admin->tenant_id]);
    $narrow->syncPermissions(['patients.manage.view']);

    $this->actingAs($manager)->post(route('users.store'), [
        'name' => 'Consulta',
        'email' => 'consulta@example.com',
        'password' => 'password123',
        'role' => 'Consulta',
    ])->assertSessionHasNoErrors();

    expect(User::where('email', 'consulta@example.com')->first()->tenant_id)->toBe($admin->tenant_id);
});

test('nobody can change their own role from the users screen', function () {
    $admin = hardeningClinic();
    $manager = userManager($admin);
    Role::create(['name' => 'Consulta', 'tenant_id' => $admin->tenant_id])->syncPermissions(['patients.manage.view']);

    $this->actingAs($manager)->put(route('users.update', $manager), [
        'name' => $manager->name,
        'email' => $manager->email,
        'role' => 'Consulta',
    ])->assertSessionHasErrors('role');

    expect($manager->fresh()->hasRole('Gerente'))->toBeTrue();
});

test('a non-admin cannot add permissions they lack to a role', function () {
    $admin = hardeningClinic();
    $manager = userManager($admin);

    $this->actingAs($manager)->put(route('roles.update', Role::forTenant($admin->tenant_id)->where('name', 'Gerente')->first()), [
        'name' => 'Gerente',
        'permissions' => ['patients.manage.view', 'settings.users.view', 'settings.users.create', 'settings.users.edit', 'settings.users.delete', 'settings.roles.view', 'settings.roles.edit', 'financial.transactions.view'],
    ])->assertSessionHas('error');

    expect($manager->fresh()->can('financial.transactions.view'))->toBeFalse();
});

// ── Message templates ────────────────────────────────────────────────────

test('billing messages need the financial permission', function () {
    $reception = userWith(['patients.manage.edit']);

    $this->actingAs($reception)
        ->patch(route('message-templates.update'), ['billing_due' => 'Pague para a chave golpe@example.com'])
        ->assertForbidden();

    $this->actingAs($reception)
        ->patch(route('message-templates.update'), ['birthday' => 'Parabéns, {primeiro_nome}!'])
        ->assertSessionHasNoErrors();

    expect($reception->tenant->fresh()->message_templates)->toBe(['birthday' => 'Parabéns, {primeiro_nome}!']);
});

// ── References to another clinic ─────────────────────────────────────────

test('an appointment cannot be booked for another clinic professional or patient', function () {
    $user = userWith(['appointments.manage.create']);
    $outsider = User::factory()->create();
    $foreignPatient = Patient::create(['tenant_id' => $outsider->tenant_id, 'user_id' => $outsider->id, 'name' => 'Outra clínica']);
    $patient = Patient::create(['tenant_id' => $user->tenant_id, 'user_id' => $user->id, 'name' => 'Daqui']);

    $payload = [
        'patient_ids' => [$patient->id],
        'type' => 'individual',
        'max_participants' => 1,
        'appointment_date' => now()->addDay()->toDateString(),
        'start_time' => '09:00',
        'duration_minutes' => 50,
    ];

    $this->actingAs($user)->post(route('appointments.store'), [...$payload, 'user_id' => $outsider->id])
        ->assertSessionHasErrors('user_id');
    $this->actingAs($user)->post(route('appointments.store'), [...$payload, 'patient_ids' => [$foreignPatient->id]])
        ->assertSessionHasErrors('patient_ids.0');

    expect(Appointment::withoutGlobalScopes()->count())->toBe(0);
});

test('a class cannot be assigned to another clinic professional', function () {
    $user = userWith(['group_classes.manage.create']);
    $outsider = User::factory()->create();

    $this->actingAs($user)->post(route('group-classes.store'), [
        'name' => 'Pilates manhã',
        'max_participants' => 4,
        'user_id' => $outsider->id,
        'schedules' => [['day_of_week' => 1, 'start_time' => '08:00', 'duration_minutes' => 50]],
    ])->assertSessionHasErrors('user_id');
});

test('the calendar feed only lists the professional clinic appointments', function () {
    $professional = User::factory()->create(['calendar_token' => Str::random(40)]);
    $other = Tenant::factory()->create();

    foreach ([$professional->tenant_id, $other->id] as $tenantId) {
        Appointment::create([
            'tenant_id' => $tenantId,
            'user_id' => $professional->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'start_time' => '10:00',
            'duration_minutes' => 50,
            'type' => 'individual',
            'status' => 'scheduled',
            'title' => $tenantId === $other->id ? 'Injetado' : 'Daqui',
        ]);
    }

    $ics = $this->get(route('calendar.feed', $professional->calendar_token))->assertOk()->getContent();

    expect(substr_count($ics, 'BEGIN:VEVENT'))->toBe(1);

    $professional->tenant->update(['status' => 'suspended']);

    $this->get(route('calendar.feed', $professional->calendar_token))->assertNotFound();
});

// ── Dev admins and suspended clinics ─────────────────────────────────────

test('a dev admin is sent to the panel instead of clinic pages', function () {
    Permission::findOrCreate('settings.users.view', 'web');
    Permission::findOrCreate('dashboard.view', 'web');
    $devAdmin = User::factory()->create(['tenant_id' => null, 'is_dev_admin' => true]);
    $devAdmin->givePermissionTo(['settings.users.view', 'dashboard.view']);

    $this->actingAs($devAdmin)->get(route('dashboard'))->assertRedirect(route('dev-admin.dashboard'));
    $this->actingAs($devAdmin)->get(route('users.index'))->assertRedirect(route('dev-admin.dashboard'));
});

test('a suspended clinic cannot manage its users', function () {
    $admin = hardeningClinic();
    $admin->tenant->update(['status' => 'suspended']);

    $this->actingAs($admin)->get(route('users.index'))->assertRedirect(route('login'));
});
