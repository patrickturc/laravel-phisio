<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Each user's own profile photo. Files live under the clinic's folder and are
 * only served to people of the same clinic (route binding is tenant scoped).
 */
class AvatarController extends Controller
{
    public function show(User $user): StreamedResponse
    {
        abort_if(! $user->avatar_path || ! Storage::exists($user->avatar_path), 404);

        return Storage::response($user->avatar_path, null, ['Cache-Control' => 'private, max-age=604800']);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ], [
            'image.required' => 'Escolha uma imagem.',
            'image.image' => 'Envie uma imagem JPG ou PNG.',
            'image.mimes' => 'Envie uma imagem JPG ou PNG.',
            'image.max' => 'A imagem deve ter no máximo 2 MB.',
        ]);

        $user = $request->user();
        $previous = $user->avatar_path;
        $folder = $user->tenant_id ? "tenants/{$user->tenant_id}/avatars" : 'platform/avatars';

        $user->forceFill(['avatar_path' => $request->file('image')->store($folder)])->save();

        if ($previous) {
            Storage::delete($previous);
        }

        return back()->with('success', 'Foto de perfil atualizada.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::delete($user->avatar_path);
            $user->forceFill(['avatar_path' => null])->save();
        }

        return back()->with('success', 'Foto de perfil removida.');
    }
}
