<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records when a clinic user was last seen and on which screen, for the dev
 * admin "online users" page. Only page visits count (not API calls), dev
 * admins and impersonation sessions are left out, and the row is written at
 * most once a minute unless the screen changes.
 */
class TrackLastSeen
{
    private const REFRESH_SECONDS = 60;

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        /** @var User|null $user */
        $user = $request->user();

        if (! $user || $user->is_dev_admin || ! $request->isMethod('GET') || $request->is('api/*')
            || ($request->expectsJson() && ! $request->header('X-Inertia'))
            || $request->session()->has('impersonated_by')) {
            return $response;
        }

        $path = $request->getPathInfo().($request->query('patient') ? '?patient' : '');
        $stale = ! $user->last_seen_at || $user->last_seen_at->diffInSeconds(now()) >= self::REFRESH_SECONDS;

        if ($stale || $user->last_seen_path !== $path) {
            // Straight to the table: no model events and no updated_at bump.
            DB::table('users')->where('id', $user->id)->update([
                'last_seen_at' => now(),
                'last_seen_path' => mb_substr($path, 0, 255),
            ]);
        }

        return $response;
    }
}
