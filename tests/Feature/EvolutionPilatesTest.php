<?php

use App\Models\Evolution;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

function professionalWithEvolutionAccess(): User
{
    $permissions = [
        'evolutions.manage.view',
        'evolutions.manage.create',
        'evolutions.manage.edit',
        'evolutions.manage.delete',
    ];

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);
    test()->actingAs($user);

    return $user;
}

function pilatesPatient(User $user): Patient
{
    return Patient::create(['name' => 'Anizia de Jesus', 'type' => 'pilates', 'user_id' => $user->id]);
}

/**
 * @return array<string, mixed>
 */
function pilatesPayload(Patient $patient, array $overrides = []): array
{
    return array_merge([
        'evolution_type' => 'pilates',
        'paciente_id' => $patient->id,
        'data_atendimento' => '2026-10-13',
        'estabilidade' => 'boa',
        'mobilidade' => 'boa',
        'forca' => 'adequada',
        'coordenacao' => 'boa',
        'tem_dor' => false,
        'tem_limitacao' => false,
        'tem_contraindicacao' => false,
        'observacoes' => 'Reformer e chair, boa execução.',
    ], $overrides);
}

test('a pilates evolution stores the movement ratings and precautions', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $this->post('/evolutions', pilatesPayload($patient, [
        'tem_dor' => true,
        'dor_eva' => 4,
        'localizacao_dor' => 'lombar',
        'tem_contraindicacao' => true,
        'contraindicacao_detalhe' => 'Evitar flexão de tronco com carga.',
    ]))->assertRedirect()->assertSessionHasNoErrors();

    $evolution = Evolution::sole();

    expect($evolution->evolution_type)->toBe('pilates')
        ->and($evolution->estabilidade)->toBe('boa')
        ->and($evolution->forca)->toBe('adequada')
        ->and($evolution->tem_dor)->toBeTrue()
        ->and($evolution->dor_eva)->toBe(4)
        ->and($evolution->localizacao_dor)->toBe('lombar')
        ->and($evolution->tem_contraindicacao)->toBeTrue()
        ->and($evolution->contraindicacao_detalhe)->toBe('Evitar flexão de tronco com carga.')
        ->and($evolution->tipo_atendimento)->toBe('sessao')
        ->and($evolution->profissional_id)->toBe($user->id);
});

test('details of a question answered "Não" are discarded', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $this->post('/evolutions', pilatesPayload($patient, [
        'tem_dor' => false,
        'dor_eva' => 7,
        'localizacao_dor' => 'ombro',
        'tem_limitacao' => false,
        'limitacao_detalhe' => 'Não deveria ser salvo',
    ]))->assertSessionHasNoErrors();

    $evolution = Evolution::sole();

    expect($evolution->dor_eva)->toBeNull()
        ->and($evolution->localizacao_dor)->toBeNull()
        ->and($evolution->limitacao_detalhe)->toBeNull();
});

test('a pilates evolution requires every rating from its own scale', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $this->post('/evolutions', pilatesPayload($patient, [
        'estabilidade' => '',
        'forca' => 'boa', // "Boa" belongs to other scales, not to força
    ]))->assertSessionHasErrors(['estabilidade', 'forca']);

    expect(Evolution::count())->toBe(0);
});

test('an evolution without a type is still saved as soap', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $this->post('/evolutions', [
        'paciente_id' => $patient->id,
        'data_atendimento' => '2026-10-13',
        'tipo_atendimento' => 'avaliacao',
        'queixa_principal' => 'Dor lombar há 2 meses',
    ])->assertSessionHasNoErrors();

    expect(Evolution::sole()->evolution_type)->toBe('soap');
});

test('switching the type of an evolution clears what the previous form filled in', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $evolution = Evolution::create([
        'paciente_id' => $patient->id,
        'profissional_id' => $user->id,
        'data_atendimento' => '2026-10-13',
        'tipo_atendimento' => 'avaliacao',
        'evolution_type' => 'soap',
        'queixa_principal' => 'Dor lombar',
        'condutas_realizadas' => 'Liberação miofascial',
        'evolucao_status' => 'pendente',
    ]);

    $this->put("/evolutions/{$evolution->id}", pilatesPayload($patient))
        ->assertSessionHasNoErrors();

    $evolution->refresh();
    expect($evolution->evolution_type)->toBe('pilates')
        ->and($evolution->queixa_principal)->toBeNull()
        ->and($evolution->condutas_realizadas)->toBeNull()
        ->and($evolution->evolucao_status)->toBeNull()
        ->and($evolution->mobilidade)->toBe('boa');

    $this->put("/evolutions/{$evolution->id}", [
        'evolution_type' => 'simple',
        'paciente_id' => $patient->id,
        'data_atendimento' => '2026-10-13',
        'observacoes' => 'Só uma nota rápida.',
    ])->assertSessionHasNoErrors();

    $evolution->refresh();
    expect($evolution->evolution_type)->toBe('simple')
        ->and($evolution->mobilidade)->toBeNull()
        ->and($evolution->tem_dor)->toBeNull()
        ->and($evolution->observacoes)->toBe('Só uma nota rápida.');
});

test('the migration marks existing quick notes as "simple" and the rest as "soap"', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);
    $migration = require database_path('migrations/2027_01_07_000000_add_pilates_fields_to_evolutions_table.php');

    $migration->down();

    $row = [
        'tenant_id' => $user->tenant_id,
        'paciente_id' => $patient->id,
        'profissional_id' => $user->id,
        'data_atendimento' => '2026-10-01 00:00:00',
    ];
    DB::table('evolutions')->insert([...$row, 'id' => (string) Str::uuid(), 'observacoes' => 'Nota da aula']);
    DB::table('evolutions')->insert([...$row, 'id' => (string) Str::uuid(), 'queixa_principal' => 'Dor no joelho']);

    $migration->up();

    expect(Evolution::whereNotNull('observacoes')->sole()->evolution_type)->toBe('simple')
        ->and(Evolution::whereNotNull('queixa_principal')->sole()->evolution_type)->toBe('soap');
});

test('the pdf is generated for every evolution type', function (string $type, array $fields) {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $evolution = Evolution::create([
        'paciente_id' => $patient->id,
        'profissional_id' => $user->id,
        'data_atendimento' => '2026-10-13',
        'tipo_atendimento' => 'sessao',
        'evolution_type' => $type,
        ...$fields,
    ]);

    $this->get("/evolutions/{$evolution->id}/pdf")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
})->with([
    'soap' => ['soap', ['queixa_principal' => 'Dor lombar']],
    'simple' => ['simple', ['observacoes' => 'Nota rápida']],
    'pilates' => ['pilates', [
        'estabilidade' => 'boa', 'mobilidade' => 'regular', 'forca' => 'baixa', 'coordenacao' => 'excelente',
        'tem_dor' => true, 'dor_eva' => 3, 'tem_limitacao' => false, 'tem_contraindicacao' => false,
    ]],
]);

test('recent evolutions return the latest five of the patient, newest first', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    foreach (range(1, 6) as $day) {
        Evolution::create([
            'paciente_id' => $patient->id,
            'profissional_id' => $user->id,
            'data_atendimento' => sprintf('2026-10-%02d', $day),
            'tipo_atendimento' => 'sessao',
            'evolution_type' => 'pilates',
            'estabilidade' => 'boa',
        ]);
    }

    $response = $this->getJson("/api/patients/{$patient->id}/recent-evolutions")->assertOk();

    expect($response->json())->toHaveCount(5)
        ->and($response->json('0.data_atendimento'))->toStartWith('2026-10-06')
        ->and($response->json('0.professional.name'))->toBe($user->name);
});

test('recent evolutions of another clinic are not reachable', function () {
    $owner = professionalWithEvolutionAccess();
    $patient = pilatesPatient($owner);

    professionalWithEvolutionAccess(); // a user of a different tenant

    $this->getJson("/api/patients/{$patient->id}/recent-evolutions")->assertNotFound();
});

test('deleting from the history panel answers without redirecting', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);
    $evolution = Evolution::create([
        'paciente_id' => $patient->id,
        'profissional_id' => $user->id,
        'data_atendimento' => '2026-10-13',
        'evolution_type' => 'simple',
        'observacoes' => 'Nota',
    ]);

    $this->deleteJson("/evolutions/{$evolution->id}")->assertNoContent();

    expect(Evolution::count())->toBe(0)
        ->and(Evolution::withTrashed()->count())->toBe(1);
});

test('creating an evolution requires permission', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $patient = pilatesPatient($user);

    $this->post('/evolutions', pilatesPayload($patient))->assertForbidden();
});

test('heart rate and SpO2 keep only the number that was typed', function () {
    $user = professionalWithEvolutionAccess();
    $patient = pilatesPatient($user);

    $this->post('/evolutions', [
        'paciente_id' => $patient->id,
        'data_atendimento' => '2026-10-13',
        'tipo_atendimento' => 'sessao',
        'frequencia_cardiaca' => '72 bpm',
        'saturacao' => '98%',
    ])->assertSessionHasNoErrors();

    expect(Evolution::sole())
        ->frequencia_cardiaca->toBe(72)
        ->saturacao->toBe(98);

    $this->post('/evolutions', [
        'paciente_id' => $patient->id,
        'data_atendimento' => '2026-10-14',
        'tipo_atendimento' => 'sessao',
        'saturacao' => '140',
    ])->assertSessionHasErrors('saturacao');
});
