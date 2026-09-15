<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        /** @var User $user */
        $user = auth()->user();

        // Dev admins bypass tenant checks, including while impersonating a
        // tenant user for support.
        if ($user->is_dev_admin || $request->session()->has('impersonated_by')) {
            return $next($request);
        }

        $tenant = $user->tenant;

        if (! $tenant || ! $tenant->isActive()) {
            auth()->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Sua organização está inativa ou suspensa. Entre em contato com o suporte.');
        }

        // Trial is over and no plan was activated: keep the session alive but
        // route everything to the subscription page, where a plan is requested.
        if ($tenant->isTrialExpired()) {
            return redirect()->route('subscription.index');
        }

        return $next($request);
    }
}
