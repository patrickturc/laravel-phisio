<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        $user = auth()->user();

        // Dev admins bypass tenant checks
        if ($user->is_dev_admin) {
            return $next($request);
        }

        $tenant = $user->tenant;

        if (! $tenant || ! $tenant->isActive()) {
            auth()->logout();
            
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Sua organização está inativa ou suspensa. Entre em contato com o suporte.');
        }

        return $next($request);
    }
}
