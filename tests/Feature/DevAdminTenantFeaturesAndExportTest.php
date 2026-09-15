<?php

use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;

test('dev admin can export tenant data as JSON', function () {
    $tenant = Tenant::factory()->create(['name' => 'Clínica Exportavel']);
    $user = User::factory()->create([
        'tenant_id' => $tenant->id,
        'name' => 'Dr. Responsável',
        'email' => 'resp@exportavel.com',
    ]);
    $patient = Patient::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'name' => 'Paciente Teste',
    ]);

    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    $this->actingAs($devAdmin);
    $response = $this->get(route('dev-admin.tenants.export', $tenant->id));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/json');

    $content = $response->streamedContent();
    $decoded = json_decode($content, true);

    expect($decoded)->toHaveKey('tenant');
    expect($decoded)->toHaveKey('users');
    expect($decoded)->toHaveKey('patients');
    expect($decoded['users'])->toHaveCount(1);
    expect($decoded['users'][0]['email'])->toBe('resp@exportavel.com');
    expect($decoded['patients'])->toHaveCount(1);
    expect($decoded['patients'][0]['name'])->toBe('Paciente Teste');
});

test('dev admin can update tenant feature flags and storage quota', function () {
    $tenant = Tenant::factory()->create([
        'max_storage_mb' => 1024,
        'features' => null,
    ]);

    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    $this->actingAs($devAdmin);
    $response = $this->put(route('dev-admin.tenants.update', $tenant->id), [
        'name' => $tenant->name,
        'plan' => $tenant->plan,
        'max_users' => $tenant->max_users,
        'max_storage_mb' => 5120,
        'features' => [
            'financial' => false,
            'group_classes' => true,
            'clinical_protocols' => false,
            'reports' => true,
            'evolution_photos' => true,
        ],
    ]);

    $response->assertRedirect(route('dev-admin.tenants.index'));

    $tenant->refresh();
    expect($tenant->max_storage_mb)->toBe(5120);
    expect($tenant->hasFeature('financial'))->toBeFalse();
    expect($tenant->hasFeature('group_classes'))->toBeTrue();
    expect($tenant->hasFeature('clinical_protocols'))->toBeFalse();
});

test('dev admin can create a tenant with complete address, clinic details and initial admin user', function () {
    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    $this->actingAs($devAdmin);
    $response = $this->post(route('dev-admin.tenants.store'), [
        'name' => 'FisioVida Reabilitação',
        'legal_name' => 'FisioVida Saúde e Reabilitação Ltda',
        'document' => '12.345.678/0001-90',
        'state_registration' => '987654321',
        'email' => 'contato@fisiovida.com.br',
        'phone' => '(11) 3333-4444',
        'whatsapp' => '(11) 98888-7777',
        'website' => 'https://fisiovida.com.br',
        'cep' => '01310-100',
        'street' => 'Avenida Paulista',
        'number' => '1000',
        'complement' => 'Conjunto 52',
        'neighborhood' => 'Bela Vista',
        'city' => 'São Paulo',
        'state' => 'SP',
        'technical_manager_name' => 'Dra. Roberta Santos',
        'technical_manager_document' => 'CREFITO-3/99999-F',
        'notes' => 'Cliente migrado de outro software.',
        'plan' => 'pro',
        'max_users' => 10,
        'max_storage_mb' => 2048,
        'admin_name' => 'Dra. Roberta Santos',
        'admin_email' => 'roberta@fisiovida.com.br',
        'admin_password' => 'segredo1234',
    ]);

    $response->assertRedirect(route('dev-admin.tenants.index'));

    $this->assertDatabaseHas('tenants', [
        'name' => 'FisioVida Reabilitação',
        'legal_name' => 'FisioVida Saúde e Reabilitação Ltda',
        'cep' => '01310-100',
        'street' => 'Avenida Paulista',
        'city' => 'São Paulo',
        'state' => 'SP',
        'whatsapp' => '(11) 98888-7777',
        'technical_manager_name' => 'Dra. Roberta Santos',
    ]);

    $tenant = Tenant::where('name', 'FisioVida Reabilitação')->first();
    expect($tenant->formatted_address)->toContain('Avenida Paulista, 1000');
    expect($tenant->formatted_address)->toContain('São Paulo - SP');

    // Admin user was created
    $this->assertDatabaseHas('users', [
        'tenant_id' => $tenant->id,
        'email' => 'roberta@fisiovida.com.br',
    ]);
});

