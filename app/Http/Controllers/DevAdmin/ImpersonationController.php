<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a tenant.
     */
    public function impersonate(Request $request, Tenant $tenant): RedirectResponse
    {
        $originalAdminId = Auth::id();

        // Find a tenant user to impersonate (prefer tenant admin or any active user)
        $targetUser = $tenant->users()
            ->where('is_dev_admin', false)
            ->first();

        if (! $targetUser) {
            return back()->with('error', 'Esta organização ainda não possui usuários cadastrados para acesso.');
        }

        session()->put('impersonated_by', $originalAdminId);
        session()->put('impersonated_tenant_id', $tenant->id);

        Auth::login($targetUser);

        return redirect()->route('dashboard')
            ->with('success', "Acessando como {$targetUser->name} ({$tenant->name}).");
    }

    /**
     * Leave impersonation and return to Dev Admin.
     */
    public function leave(Request $request): RedirectResponse
    {
        if (! session()->has('impersonated_by')) {
            return redirect()->route('dashboard');
        }

        $originalAdminId = session()->pull('impersonated_by');
        $tenantId = session()->pull('impersonated_tenant_id');

        $originalAdmin = User::withoutGlobalScopes()->find($originalAdminId);

        if ($originalAdmin && $originalAdmin->is_dev_admin) {
            Auth::login($originalAdmin);

            if ($tenantId) {
                return redirect()->route('dev-admin.tenants.show', $tenantId)
                    ->with('success', 'Você retornou com sucesso ao painel Dev Admin.');
            }

            return redirect()->route('dev-admin.dashboard');
        }

        return redirect()->route('login');
    }
}
