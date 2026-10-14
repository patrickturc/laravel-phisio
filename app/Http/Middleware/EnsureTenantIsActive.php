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
     * Pass "allow-expired-trial" on the pages an organization needs to buy a
     * plan (clinic profile, billing), which an expired trial redirects to.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        /** @var User $user */
        $user = auth()->user();

        // Dev admins belong to no clinic: on clinic pages every query would
        // mix all clinics' data. They reach a clinic by impersonating it.
        if ($user->is_dev_admin) {
            return redirect()->route('dev-admin.dashboard');
        }

        // Support keeps access to a clinic it is impersonating, even a
        // suspended one.
        if ($request->session()->has('impersonated_by')) {
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
        if ($tenant->isTrialExpired() && $mode !== 'allow-expired-trial') {
            return redirect()->route('subscription.index');
        }

        return $next($request);
    }
}
