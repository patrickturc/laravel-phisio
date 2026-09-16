<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::with('permissions')->orderBy('name')->get();
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
            'name' => 'required|string|max:255|unique:roles',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create(['name' => $validated['name'], 'guard_name' => 'web']);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return redirect()->route('roles.index')->with('success', 'Perfil criado com sucesso.');
    }

    public function update(Request $request, Role $role)
    {
        if ($role->name === 'Administrador') {
            return redirect()->route('roles.index')->with('error', 'O perfil Administrador não pode ser alterado.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role->update(['name' => $validated['name']]);

        $permissions = $validated['permissions'] ?? [];
        $role->syncPermissions($permissions);

        return redirect()->route('roles.index')->with('success', 'Perfil atualizado com sucesso.');
    }

    public function destroy(Role $role)
    {
        if ($role->name === 'Administrador') {
            return redirect()->route('roles.index')->with('error', 'O perfil Administrador não pode ser excluído.');
        }

        if ($role->users()->count() > 0) {
            return redirect()->route('roles.index')->with('error', 'Não é possível excluir um perfil que possui usuários vinculados.');
        }

        $role->delete();

        return redirect()->route('roles.index')->with('success', 'Perfil excluído com sucesso.');
    }
}
