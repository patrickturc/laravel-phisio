<?php

use App\Models\Patient;
use App\Models\PatientDocument;
use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Builds a user in its own organization, holding every permission, so the only
 * thing that can stop a cross-tenant read is the tenant scope itself.
 */
function isolatedUser(): User
{
    $tenant = Tenant::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    foreach (['patients.manage.view', 'patients.manage.edit', 'dashboard.view'] as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $role = Role::findOrCreate('Administrador', 'web');
    $role->givePermissionTo(['patients.manage.view', 'patients.manage.edit', 'dashboard.view']);
    $user->assignRole($role);

    return $user;
}

test('a patient from another organization is not reachable by id', function () {
    $mine = isolatedUser();
    $theirs = isolatedUser();

    $foreignPatient = Patient::withoutGlobalScopes()->create([
        'tenant_id' => $theirs->tenant_id,
        'user_id' => $theirs->id,
        'name' => 'Paciente Alheio',
    ]);

    $this->actingAs($mine)
        ->get("/patients/{$foreignPatient->id}")
        ->assertNotFound();
});

test('a document from another organization cannot be downloaded or previewed', function () {
    $mine = isolatedUser();
    $theirs = isolatedUser();

    $foreignPatient = Patient::withoutGlobalScopes()->create([
        'tenant_id' => $theirs->tenant_id,
        'user_id' => $theirs->id,
        'name' => 'Paciente Alheio',
    ]);

    $foreignDocument = PatientDocument::withoutGlobalScopes()->create([
        'tenant_id' => $theirs->tenant_id,
        'patient_id' => $foreignPatient->id,
        'file_path' => 'patients/documents/secret.pdf',
        'original_name' => 'secret.pdf',
        'mime_type' => 'application/pdf',
        'size' => 100,
    ]);

    $this->actingAs($mine)
        ->get("/patients/documents/{$foreignDocument->id}/download")
        ->assertNotFound();

    $this->actingAs($mine)
        ->get("/patients/documents/{$foreignDocument->id}/preview")
        ->assertNotFound();
});

test('a tenant admin cannot reach the dev admin area', function () {
    $user = isolatedUser();

    $this->actingAs($user)
        ->get(route('dev-admin.tenants.index'))
        ->assertForbidden();
});

test('a tenant cannot activate its own plan through the dev admin route', function () {
    $user = isolatedUser();
    $user->tenant->update(['plan' => 'free']);

    $this->actingAs($user)
        ->post(route('dev-admin.tenants.approve-plan', $user->tenant), ['plan' => 'pro'])
        ->assertForbidden();

    expect($user->tenant->fresh()->plan)->toBe('free');
});
