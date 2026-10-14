<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    /**
     * Role names only have to be unique within the clinic.
     */
    private function uniqueNameRule(): Unique
    {
        return Rule::unique('roles', 'name')
            ->where('guard_name', 'web')
            ->where('tenant_id', Role::currentTenantId());
    }

    /**
     * Non-administrators may only work with roles made of permissions they
     * hold themselves, so editing roles cannot raise anyone's access.
     *
     * @param  iterable<string>  $permissions
     */
    private function outOfReach(Request $request, iterable $permissions): ?RedirectResponse
    {
        if ($request->user()->canGrant($permissions)) {
            return null;
        }

        return back()->with('error', 'Você só pode gerenciar perfis com permissões que você também tem.');
    }

    public function index()
    {
        $roles = Role::forTenant(Role::currentTenantId())->with('permissions')->orderBy('name')->get();
        $permissions = Permission::orderBy('name')->get();

        // Group permissions by module
        $groupedPermissions = [];
        foreach ($permissions as $p) {
            $parts = explode('.', $p->name);
            $module = $parts[0];
            if (! isset($groupedPermissions[$module])) {
                $groupedPermissions[$module] = [];
            }
            $groupedPermissions[$module][] = $p;
        }

        return Inertia::render('settings/roles/index', [
            'roles' => $roles,
            'groupedPermissions' => $groupedPermissions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', $this->uniqueNameRule()],
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if ($response = $this->outOfReach($request, $validated['permissions'] ?? [])) {
            return $response;
        }

        $role = Role::create(['name' => $validated['name'], 'guard_name' => 'web']);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return redirect()->route('roles.index')->with('success', 'Perfil criado com sucesso.');
    }

    public function update(Request $request, Role $role)
    {
        if ($role->name === Role::ADMIN) {
            return redirect()->route('roles.index')->with('error', 'O perfil Administrador não pode ser alterado.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', $this->uniqueNameRule()->ignore($role->id)],
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if ($response = $this->outOfReach($request, [...$role->permissions->pluck('name'), ...($validated['permissions'] ?? [])])) {
            return $response;
        }

        $role->update(['name' => $validated['name']]);

        $permissions = $validated['permissions'] ?? [];
        $role->syncPermissions($permissions);

        return redirect()->route('roles.index')->with('success', 'Perfil atualizado com sucesso.');
    }

    public function destroy(Request $request, Role $role)
    {
        if ($response = $this->outOfReach($request, $role->permissions->pluck('name'))) {
            return $response;
        }

        if ($role->name === Role::ADMIN) {
            return redirect()->route('roles.index')->with('error', 'O perfil Administrador não pode ser excluído.');
        }

        if ($role->users()->count() > 0) {
            return redirect()->route('roles.index')->with('error', 'Não é possível excluir um perfil que possui usuários vinculados.');
        }

        $role->delete();

        return redirect()->route('roles.index')->with('success', 'Perfil excluído com sucesso.');
    }
}
