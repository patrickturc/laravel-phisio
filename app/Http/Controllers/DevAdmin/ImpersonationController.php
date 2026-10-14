<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a tenant: as the user picked in the panel, or else
     * as the clinic's administrator, so support sees what the owner sees.
     */
    public function impersonate(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate(['user_id' => ['nullable', 'integer']]);

        $users = fn () => $tenant->users()->where('is_dev_admin', false)->orderBy('id');

        $targetUser = isset($validated['user_id'])
            ? $users()->whereKey($validated['user_id'])->first()
            : ($users()->whereHas('roles', fn ($query) => $query->where('name', 'Administrador'))->first()
                ?? $users()->first());

        if (! $targetUser) {
            return back()->with('error', isset($validated['user_id'])
                ? 'Usuário não encontrado nesta organização.'
                : 'Esta organização ainda não possui usuários cadastrados para acesso.');
        }

        Log::notice('Dev admin impersonation started', [
            'dev_admin_id' => Auth::id(),
            'tenant_id' => $tenant->id,
            'user_id' => $targetUser->id,
            'ip' => $request->ip(),
        ]);

        session()->put('impersonated_by', Auth::id());
        session()->put('impersonated_tenant_id', $tenant->id);

        Auth::login($targetUser);

        // Land on a page the user can open: not every role sees the dashboard.
        // can() (not hasPermissionTo) so a permission missing from the
        // database just means "no".
        $landing = $targetUser->can('dashboard.view')
            ? route('dashboard')
            : ($targetUser->can('appointments.manage.view') ? route('appointments.index') : route('profile.edit'));

        return redirect($landing)
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

        Log::notice('Dev admin impersonation ended', [
            'dev_admin_id' => $originalAdminId,
            'tenant_id' => $tenantId,
            'user_id' => Auth::id(),
        ]);

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
