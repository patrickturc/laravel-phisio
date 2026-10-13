<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Logo and owner photo of the clinic profile. Files live under the tenant's
 * own folder and are only served to users of that tenant.
 */
class OrganizationImageController extends Controller
{
    /**
     * Uploadable images, mapped to the tenant column that holds the path.
     *
     * @var array<string, string>
     */
    public const IMAGES = [
        'logo' => 'logo_path',
        'owner-photo' => 'owner_photo_path',
    ];

    private const LABELS = [
        'logo' => 'Logo',
        'owner-photo' => 'Foto do proprietário',
    ];

    /**
     * URL of the image, versioned by its path so a replaced image is never
     * served from the browser cache. Null when nothing was uploaded.
     */
    public static function urlFor(Tenant $tenant, string $image): ?string
    {
        $path = $tenant->{self::IMAGES[$image]};

        return $path
            ? route('organization.images.show', $image).'?v='.substr(md5($path), 0, 8)
            : null;
    }

    public function show(Request $request, string $image): StreamedResponse
    {
        $path = $this->tenant($request)->{self::IMAGES[$image]};

        abort_if(! $path || ! Storage::exists($path), 404);

        return Storage::response($path, null, ['Cache-Control' => 'private, max-age=604800']);
    }

    public function store(Request $request, string $image): RedirectResponse
    {
        $tenant = $this->tenant($request);

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ], [
            'image.required' => 'Escolha uma imagem.',
            'image.image' => 'Envie uma imagem JPG ou PNG.',
            'image.mimes' => 'Envie uma imagem JPG ou PNG.',
            'image.max' => 'A imagem deve ter no máximo 2 MB.',
        ]);

        $column = self::IMAGES[$image];
        $previous = $tenant->{$column};

        $tenant->update([
            $column => $request->file('image')->store("tenants/{$tenant->id}/branding"),
        ]);

        if ($previous) {
            Storage::delete($previous);
        }

        return back()->with('success', self::LABELS[$image].' atualizada.');
    }

    public function destroy(Request $request, string $image): RedirectResponse
    {
        $tenant = $this->tenant($request);
        $column = self::IMAGES[$image];

        if ($tenant->{$column}) {
            Storage::delete($tenant->{$column});
            $tenant->update([$column => null]);
        }

        return back()->with('success', self::LABELS[$image].' removida.');
    }

    private function tenant(Request $request): Tenant
    {
        $tenant = $request->user()->tenant;

        abort_if(! $tenant, 404);

        return $tenant;
    }
}
