<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

function clinicProfileAdmin(): User
{
    Permission::findOrCreate('settings.users.view', 'web');

    $user = User::factory()->create();
    $user->givePermissionTo('settings.users.view');
    test()->actingAs($user);

    return $user;
}

/**
 * @return array<string, mixed>
 */
function clinicProfilePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Sanare Pilates Studio',
        'document' => '111.444.777-35',
        'email' => 'contato@sanare.com.br',
        'phone' => '(11) 98281-9159',
        'cep' => '13308-497',
        'street' => 'Rua José Francisco dos Santos',
        'number' => '100',
        'neighborhood' => 'Centro',
        'city' => 'Itu',
        'state' => 'SP',
        'technical_manager_name' => 'Silvana Correia da Silva',
        'technical_manager_document' => 'CREFITO 425202-F',
    ], $overrides);
}

test('the profile saves the owner, bio and instagram', function () {
    $user = clinicProfileAdmin();

    $this->patch('/settings/organization', clinicProfilePayload([
        'owner_name' => 'Silvana Correia',
        'owner_document' => '529.982.247-25',
        'owner_birthdate' => '1990-07-26',
        'bio' => 'Pilates clínico desde 2015.',
        'instagram' => 'https://www.instagram.com/studio.silvana/?hl=pt',
    ]))->assertSessionHasNoErrors();

    $tenant = $user->tenant->fresh();

    expect($tenant->owner_name)->toBe('Silvana Correia')
        ->and($tenant->owner_document)->toBe('52998224725')
        ->and($tenant->owner_birthdate->toDateString())->toBe('1990-07-26')
        ->and($tenant->bio)->toBe('Pilates clínico desde 2015.')
        ->and($tenant->instagram)->toBe('studio.silvana');
});

test('the owner document must be a valid CPF', function (string $document) {
    clinicProfileAdmin();

    $this->patch('/settings/organization', clinicProfilePayload(['owner_document' => $document]))
        ->assertSessionHasErrors('owner_document');
})->with([
    'a CNPJ' => '11.222.333/0001-81',
    'wrong check digits' => '529.982.247-26',
]);

test('instagram only accepts a handle', function () {
    clinicProfileAdmin();

    $this->patch('/settings/organization', clinicProfilePayload(['instagram' => 'studio@gmail.com']))
        ->assertSessionHasErrors('instagram');
});

test('the owner personal data reaches the profile page but not every other page', function () {
    $user = clinicProfileAdmin();
    $user->tenant->update(['owner_document' => '52998224725', 'owner_birthdate' => '1990-07-26']);

    $this->get('/settings/organization')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('tenant.owner_document', '52998224725')
            ->where('tenant.owner_birthdate', '1990-07-26')
            ->missing('auth.user.tenant.owner_document')
            ->missing('auth.user.tenant.owner_birthdate')
        );
});

test('the dev admin internal notes about the clinic are not shared with its users', function () {
    $user = clinicProfileAdmin();
    $user->tenant->update(['notes' => 'Cliente atrasou duas faturas']);

    $this->get('/settings/organization')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('auth.user.tenant.name', $user->tenant->name)
            ->missing('auth.user.tenant.notes')
        );
});

test('uploading a logo stores it in the clinic folder and replaces the previous one', function () {
    Storage::fake();
    $user = clinicProfileAdmin();

    $this->post('/settings/organization/images/logo', ['image' => UploadedFile::fake()->image('logo.png', 400, 400)])
        ->assertSessionHasNoErrors();

    $first = $user->tenant->fresh()->logo_path;
    expect($first)->toStartWith("tenants/{$user->tenant_id}/branding/");
    Storage::assertExists($first);

    $this->post('/settings/organization/images/logo', ['image' => UploadedFile::fake()->image('logo.jpg', 400, 400)]);

    $second = $user->tenant->fresh()->logo_path;
    expect($second)->not->toBe($first);
    Storage::assertMissing($first);
    Storage::assertExists($second);

    $this->get('/settings/organization')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('images.logo', fn (string $url) => str_contains($url, '/settings/organization/images/logo?v='))
            ->where('images.owner-photo', null)
        );
});

test('images must be JPG or PNG up to 2 MB', function (UploadedFile $file) {
    Storage::fake();
    clinicProfileAdmin();

    $this->post('/settings/organization/images/owner-photo', ['image' => $file])
        ->assertSessionHasErrors('image');
})->with([
    'a pdf' => fn () => UploadedFile::fake()->create('foto.pdf', 100, 'application/pdf'),
    'a gif' => fn () => UploadedFile::fake()->image('foto.gif'),
    'over 2 MB' => fn () => UploadedFile::fake()->image('foto.png')->size(3000),
]);

test('removing the owner photo deletes the file', function () {
    Storage::fake();
    $user = clinicProfileAdmin();

    $this->post('/settings/organization/images/owner-photo', ['image' => UploadedFile::fake()->image('eu.jpg')]);
    $path = $user->tenant->fresh()->owner_photo_path;

    $this->delete('/settings/organization/images/owner-photo')->assertRedirect();

    expect($user->tenant->fresh()->owner_photo_path)->toBeNull();
    Storage::assertMissing($path);
});

test('the logo is served to any user of the clinic and to no one else', function () {
    Storage::fake();
    $admin = clinicProfileAdmin();
    $this->post('/settings/organization/images/logo', ['image' => UploadedFile::fake()->image('logo.png')]);

    $colleague = User::factory()->create(['tenant_id' => $admin->tenant_id]);
    $this->actingAs($colleague)->get('/settings/organization/images/logo')->assertOk();

    $outsider = User::factory()->create();
    $this->actingAs($outsider)->get('/settings/organization/images/logo')->assertNotFound();
});

test('changing the images requires the settings permission', function () {
    Storage::fake();
    $this->actingAs(User::factory()->create());

    $this->post('/settings/organization/images/logo', ['image' => UploadedFile::fake()->image('logo.png')])
        ->assertForbidden();
    $this->delete('/settings/organization/images/logo')->assertForbidden();
});

test('only the logo and the owner photo can be uploaded', function () {
    Storage::fake();
    clinicProfileAdmin();

    $this->post('/settings/organization/images/banner', ['image' => UploadedFile::fake()->image('x.png')])
        ->assertNotFound();
});

test('the PIX key is stored the way PIX expects it', function (string $type, string $typed, string $stored) {
    $user = clinicProfileAdmin();

    $this->patch('/settings/organization', clinicProfilePayload(['pix_key_type' => $type, 'pix_key' => $typed]))
        ->assertSessionHasNoErrors();

    expect($user->tenant->fresh()->pix_key)->toBe($stored);
})->with([
    'phone' => ['phone', '(11) 98281-9159', '+5511982819159'],
    'CPF' => ['cpf_cnpj', '529.982.247-25', '52998224725'],
    'e-mail' => ['email', 'Financeiro@Sanare.com.br', 'financeiro@sanare.com.br'],
    'random key' => ['random', '123E4567-E12B-12D1-A456-426655440000', '123e4567-e12b-12d1-a456-426655440000'],
]);

test('a PIX key must match its type', function () {
    clinicProfileAdmin();

    $this->patch('/settings/organization', clinicProfilePayload(['pix_key_type' => 'email', 'pix_key' => 'não é email']))
        ->assertSessionHasErrors('pix_key');
    $this->patch('/settings/organization', clinicProfilePayload(['pix_key' => 'financeiro@sanare.com.br']))
        ->assertSessionHasErrors('pix_key_type');
});
