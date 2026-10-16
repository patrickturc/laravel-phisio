<?php

use App\Models\Appointment;
use App\Models\Evolution;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

/**
 * A stand-in for the old single-clinic database: a second in-memory sqlite
 * with the same tables and columns as this one, minus tenant_id.
 */
function legacyDatabase(): Connection
{
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    $legacy = DB::connection('legacy');

    $tables = ['users', 'roles', 'model_has_roles', 'commercial_plans', 'clinical_protocols', 'recurring_expenses', 'patients', 'group_classes', 'group_class_schedules', 'group_class_patient', 'memberships', 'appointments', 'appointment_patient', 'evolutions', 'financial_transactions', 'financial_transaction_logs', 'patient_documents'];

    // Columns added after the old install was split off (compared against
    // both production schemas).
    $newOnly = [
        'tenant_id', 'is_dev_admin', 'agenda_color', 'agenda_availability', 'billing_cycle', 'enrollment_date',
        'next_billing_date', 'paused_at', 'paused_until', 'pauses_classes', 'recurring_booking_id',
        'recurrence_date', 'room', 'whatsapp_reminder_at', 'confirmed_at', 'evolution_type', 'estabilidade',
        'mobilidade', 'forca', 'coordenacao', 'tem_dor', 'tem_limitacao', 'limitacao_detalhe',
        'tem_contraindicacao', 'contraindicacao_detalhe', 'payment_method',
    ];

    foreach ($tables as $table) {
        $columns = collect(Schema::getColumnListing($table))->reject(fn ($column) => in_array($column, $newOnly, true))
            ->map(fn ($column) => '"'.$column.'"')->implode(', ');
        $legacy->statement("create table \"{$table}\" ({$columns})");
    }

    return $legacy;
}

function seedLegacyClinic(Connection $legacy): array
{
    $now = now()->toDateTimeString();
    $legacy->table('users')->insert([
        ['id' => 1, 'name' => 'Dona', 'email' => 'dona@legacy.test', 'password' => Hash::make('segredo-antigo'), 'created_at' => $now, 'updated_at' => $now],
        ['id' => 2, 'name' => 'Fisio', 'email' => 'fisio@legacy.test', 'password' => Hash::make('outra'), 'created_at' => $now, 'updated_at' => $now],
    ]);
    $legacy->table('roles')->insert([['id' => 1, 'name' => 'Administrador', 'guard_name' => 'web'], ['id' => 2, 'name' => 'Fisioterapeuta', 'guard_name' => 'web']]);
    $legacy->table('model_has_roles')->insert([
        ['role_id' => 1, 'model_type' => 'App\\Models\\User', 'model_id' => 1],
        ['role_id' => 2, 'model_type' => 'App\\Models\\User', 'model_id' => 2],
    ]);

    $patientId = (string) Str::uuid();
    $appointmentId = (string) Str::uuid();
    $legacy->table('patients')->insert(['id' => $patientId, 'name' => 'Ana', 'type' => 'pilates', 'user_id' => 2, 'cpf' => '52998224725', 'created_at' => '2025-03-10 10:00:00', 'updated_at' => $now]);
    $legacy->table('memberships')->insert(['id' => (string) Str::uuid(), 'patient_id' => $patientId, 'plan_name' => 'Mensal', 'price' => 300, 'start_date' => '2025-04-01', 'status' => 'active', 'billing_day' => 10, 'created_at' => $now, 'updated_at' => $now]);
    $legacy->table('appointments')->insert(['id' => $appointmentId, 'user_id' => 2, 'appointment_date' => '2026-10-01', 'start_time' => '09:00', 'duration_minutes' => 50, 'type' => 'individual', 'status' => 'completed', 'max_participants' => 1, 'created_at' => $now, 'updated_at' => $now]);
    $legacy->table('appointment_patient')->insert(['id' => 1, 'appointment_id' => $appointmentId, 'patient_id' => $patientId, 'status' => 'attended', 'created_at' => $now, 'updated_at' => $now]);
    $legacy->table('evolutions')->insert(['id' => (string) Str::uuid(), 'paciente_id' => $patientId, 'profissional_id' => 2, 'agendamento_id' => $appointmentId, 'data_atendimento' => '2026-10-01', 'tipo_atendimento' => 'sessao', 'observacoes' => 'Boa evolução', 'created_at' => $now, 'updated_at' => $now]);

    return ['patient' => $patientId, 'appointment' => $appointmentId];
}

beforeEach(function () {
    Permission::findOrCreate('dashboard.view', 'web');
    Permission::findOrCreate('professional.attend', 'web');
});

test('the clinic, its users and its data are imported into a new tenant', function () {
    $ids = seedLegacyClinic(legacyDatabase());

    $this->artisan('import:legacy-clinic', ['--name' => 'Studio B', '--notes' => 'Vitalício', '--write' => true])
        ->assertSuccessful();

    $tenant = Tenant::where('name', 'Studio B')->firstOrFail();
    $owner = User::where('email', 'dona@legacy.test')->firstOrFail();
    $physio = User::where('email', 'fisio@legacy.test')->firstOrFail();
    $patient = Patient::withoutGlobalScopes()->findOrFail($ids['patient']);

    expect($tenant->plan)->toBe('pro')
        ->and($tenant->isOnTrial())->toBeFalse()
        ->and($tenant->notes)->toBe('Vitalício')
        ->and($owner->tenant_id)->toBe($tenant->id)
        ->and(Hash::check('segredo-antigo', $owner->password))->toBeTrue()
        ->and($owner->roles->sole()->tenant_id)->toBe($tenant->id)
        ->and($owner->hasRole(Role::ADMIN))->toBeTrue()
        ->and($physio->hasRole('Fisioterapeuta'))->toBeTrue()
        // Same patient id, owner remapped to the new user ids.
        ->and($patient->tenant_id)->toBe($tenant->id)
        ->and($patient->user_id)->toBe($physio->id)
        ->and($patient->getAttributes()['cpf'])->toBe('52998224725')
        // Backfills the newer migrations did for existing data.
        ->and($patient->enrollment_date->toDateString())->toBe('2025-04-01')
        ->and(Membership::withoutGlobalScopes()->where('patient_id', $patient->id)->value('billing_cycle'))->toBe('monthly');

    $appointment = Appointment::withoutGlobalScopes()->findOrFail($ids['appointment']);
    expect($appointment->user_id)->toBe($physio->id)
        ->and($appointment->patients()->withoutGlobalScopes()->pluck('patients.id')->all())->toBe([$patient->id])
        ->and(DB::table('appointment_patient')->where('appointment_id', $appointment->id)->value('tenant_id'))->toBe($tenant->id);

    $evolution = Evolution::withoutGlobalScopes()->where('paciente_id', $patient->id)->sole();
    expect($evolution->profissional_id)->toBe($physio->id)
        ->and($evolution->evolution_type)->toBe('simple');
});

test('without --write nothing is saved', function () {
    seedLegacyClinic(legacyDatabase());

    $this->artisan('import:legacy-clinic', ['--name' => 'Studio B'])
        ->expectsOutputToContain('Simulação concluída')
        ->assertSuccessful();

    expect(Tenant::where('name', 'Studio B')->exists())->toBeFalse()
        ->and(User::where('email', 'dona@legacy.test')->exists())->toBeFalse()
        ->and(Patient::withoutGlobalScopes()->count())->toBe(0);
});

test('an e-mail already in use stops the import unless it is mapped', function () {
    seedLegacyClinic(legacyDatabase());
    User::factory()->create(['email' => 'dona@legacy.test', 'tenant_id' => null, 'is_dev_admin' => true]);

    expect(fn () => $this->artisan('import:legacy-clinic', ['--name' => 'Studio B', '--write' => true])->run())
        ->toThrow(RuntimeException::class, 'dona@legacy.test');
    expect(Tenant::where('name', 'Studio B')->exists())->toBeFalse();

    $this->artisan('import:legacy-clinic', [
        '--name' => 'Studio B',
        '--email-map' => ['dona@legacy.test=dona+studiob@legacy.test'],
        '--write' => true,
    ])->assertSuccessful();

    expect(User::where('email', 'dona+studiob@legacy.test')->first()->tenant->name)->toBe('Studio B');
});
