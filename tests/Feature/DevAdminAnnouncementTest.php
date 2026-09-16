<?php

use App\Models\SystemAnnouncement;
use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Permission;

test('dev admin can create, toggle and delete announcements', function () {
    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    $this->actingAs($devAdmin);

    // 1. Create global announcement
    $response = $this->post(route('dev-admin.announcements.store'), [
        'title' => 'Manutenção no Servidor',
        'message' => 'O sistema passará por manutenção programada às 23h.',
        'type' => 'warning',
        'target_tenant_id' => null,
        'is_active' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('system_announcements', [
        'title' => 'Manutenção no Servidor',
        'type' => 'warning',
        'is_active' => true,
    ]);

    $announcement = SystemAnnouncement::where('title', 'Manutenção no Servidor')->first();

    // 2. Toggle status
    $toggleResponse = $this->post(route('dev-admin.announcements.toggle-status', $announcement->id));
    $toggleResponse->assertRedirect();
    $announcement->refresh();
    expect($announcement->is_active)->toBeFalse();

    // 3. Delete announcement
    $deleteResponse = $this->delete(route('dev-admin.announcements.destroy', $announcement->id));
    $deleteResponse->assertRedirect();
    $this->assertDatabaseMissing('system_announcements', [
        'id' => $announcement->id,
    ]);
});

test('tenant users receive relevant active announcements in inertia payload', function () {
    $tenantA = Tenant::factory()->create(['name' => 'Clínica A']);
    $tenantB = Tenant::factory()->create(['name' => 'Clínica B']);

    Permission::findOrCreate('dashboard.view', 'web');

    $userA = User::factory()->create([
        'tenant_id' => $tenantA->id,
        'is_dev_admin' => false,
    ]);
    $userA->givePermissionTo('dashboard.view');

    // 1. Create global announcement
    $global = SystemAnnouncement::create([
        'title' => 'Aviso Global',
        'message' => 'Para todos',
        'type' => 'info',
        'target_tenant_id' => null,
        'is_active' => true,
    ]);

    // 2. Create targeted announcement for Tenant A
    $targetedA = SystemAnnouncement::create([
        'title' => 'Aviso para Clínica A',
        'message' => 'Apenas Clínica A',
        'type' => 'danger',
        'target_tenant_id' => $tenantA->id,
        'is_active' => true,
    ]);

    // 3. Create targeted announcement for Tenant B
    $targetedB = SystemAnnouncement::create([
        'title' => 'Aviso para Clínica B',
        'message' => 'Apenas Clínica B',
        'type' => 'warning',
        'target_tenant_id' => $tenantB->id,
        'is_active' => true,
    ]);

    // 4. Inactive announcement
    $inactive = SystemAnnouncement::create([
        'title' => 'Aviso Inativo',
        'message' => 'Ninguém deve ver',
        'type' => 'info',
        'target_tenant_id' => null,
        'is_active' => false,
    ]);

    // Act as user A on dashboard
    $this->actingAs($userA);
    $response = $this->get(route('dashboard'));

    $response->assertOk();
    $announcements = $response->viewData('page')['props']['announcements'];

    $titles = collect($announcements)->pluck('title')->toArray();

    expect($titles)->toContain('Aviso Global');
    expect($titles)->toContain('Aviso para Clínica A');
    expect($titles)->not->toContain('Aviso para Clínica B');
    expect($titles)->not->toContain('Aviso Inativo');
});

test('dev admin can open the announcements panel', function () {
    $devAdmin = User::factory()->create([
        'is_dev_admin' => true,
        'tenant_id' => null,
    ]);

    $this->actingAs($devAdmin)
        ->get(route('dev-admin.announcements.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('DevAdmin/Announcements/Index'));
});

test('tenants serialize safely when only some columns are selected', function () {
    Tenant::factory()->create();

    // The announcements panel loads its tenant picker with get(['id','name']).
    // Appended attributes must not assume every column was selected.
    $rows = Tenant::orderBy('name')->get(['id', 'name'])->toArray();

    expect($rows[0])->toHaveKeys(['id', 'name', 'access_status'])
        ->and($rows[0]['access_status'])->toBeNull();
});
