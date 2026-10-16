<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Who is using the system right now: clinic users seen recently, the screen
 * each one is on and their clinic.
 */
class OnlineUserController extends Controller
{
    /**
     * Time windows offered on the page, in minutes.
     */
    public const WINDOWS = [5, 30, 60, 1440];

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'window' => ['nullable', 'integer', Rule::in(self::WINDOWS)],
        ]);
        $window = (int) ($validated['window'] ?? 5);

        $users = User::query()
            ->whereNotNull('tenant_id')
            ->where('is_dev_admin', false)
            ->where('last_seen_at', '>=', now()->subMinutes($window))
            ->with(['tenant:id,name', 'roles:id,name'])
            ->orderByDesc('last_seen_at')
            ->get(['id', 'name', 'email', 'tenant_id', 'last_seen_at', 'last_seen_path'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->pluck('name')->implode(', ') ?: null,
                'tenant' => $user->tenant ? ['id' => $user->tenant->id, 'name' => $user->tenant->name] : null,
                'path' => $user->last_seen_path,
                'last_seen_at' => $user->last_seen_at?->toIso8601String(),
            ]);

        return Inertia::render('DevAdmin/Online/Index', [
            'users' => $users,
            'window' => $window,
            'windows' => self::WINDOWS,
            'clinics' => $users->pluck('tenant.id')->filter()->unique()->count(),
        ]);
    }
}
