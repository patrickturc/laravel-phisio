<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => Storage::fake());

test('a user uploads a profile photo under the clinic folder', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->image('eu.jpg')])
        ->assertSessionHasNoErrors();

    $user->refresh();
    expect($user->avatar_path)->toStartWith("tenants/{$user->tenant_id}/avatars/")
        ->and($user->avatar)->toContain(route('users.avatar', $user))
        ->and($user->toArray())->not->toHaveKey('avatar_path');
    Storage::assertExists($user->avatar_path);
});

test('a new photo replaces and deletes the old one', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->image('a.png')]);
    $old = $user->fresh()->avatar_path;

    $this->actingAs($user)->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->image('b.png')]);

    Storage::assertMissing($old);
    Storage::assertExists($user->fresh()->avatar_path);
});

test('only JPG or PNG images up to 2 MB are accepted', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf')])
        ->assertSessionHasErrors('image');
    $this->actingAs($user)
        ->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->image('big.jpg')->size(3000)])
        ->assertSessionHasErrors('image');

    expect($user->fresh()->avatar_path)->toBeNull();
});

test('colleagues see the photo, other clinics do not', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->image('eu.jpg')]);

    $colleague = User::factory()->create(['tenant_id' => $user->tenant_id]);
    $outsider = User::factory()->create();

    $this->actingAs($colleague)->get(route('users.avatar', $user))->assertOk();
    $this->actingAs($outsider)->get(route('users.avatar', $user))->assertNotFound();
});

test('removing the photo deletes the file', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('profile.avatar.store'), ['image' => UploadedFile::fake()->image('eu.jpg')]);
    $path = $user->fresh()->avatar_path;

    $this->actingAs($user)->delete(route('profile.avatar.destroy'))->assertSessionHasNoErrors();

    Storage::assertMissing($path);
    expect($user->fresh()->avatar)->toBeNull();
});
