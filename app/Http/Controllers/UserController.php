<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\Rules\Exists;
use Inertia\Inertia;

class UserController extends Controller
{
    private const ADMIN_ROLE = Role::ADMIN;

    /**
     * Only the clinic's own roles can be handed out.
     */
    private function roleRule(): Exists
    {
        return Rule::exists('roles', 'name')
            ->where('guard_name', 'web')
            ->where('tenant_id', Role::currentTenantId());
    }

    /**
     * Only an Administrador may hand out the Administrador role. Prevents a
     * non-admin holding settings.users.* from escalating themselves or others.
     */
    private function assertCanAssignRole(string $role): ?RedirectResponse
    {
        if ($role === self::ADMIN_ROLE && ! auth()->user()->hasRole(self::ADMIN_ROLE)) {
            return back()
                ->withErrors(['role' => 'Apenas administradores podem atribuir o perfil Administrador.'])
                ->withInput();
        }

        $permissions = Role::findByName($role, 'web')->permissions->pluck('name');

        if (! auth()->user()->canGrant($permissions)) {
            return back()
                ->withErrors(['role' => 'Você não pode atribuir um perfil com permissões que você não tem.'])
                ->withInput();
        }

        return null;
    }

    /**
     * Changing someone's e-mail or password lets you sign in as them, so only
     * users with at least the same access may edit or remove them.
     */
    private function assertCanManage(User $user): ?RedirectResponse
    {
        if ($user->is(auth()->user()) || auth()->user()->canGrant($user->getAllPermissions()->pluck('name'))) {
            return null;
        }

        return back()->with('error', 'Você não pode alterar um usuário com permissões que você não tem.');
    }

    /**
     * Guard against leaving the system with no Administrador (the acting user
     * demoting/removing the last one and locking everyone out).
     */
    private function isLastAdmin(User $user): bool
    {
        return $user->hasRole(self::ADMIN_ROLE)
            && User::role(self::ADMIN_ROLE)->count() <= 1;
    }

    public function index()
    {
        $users = User::with('roles')->orderBy('name')->paginate(10);
        $roles = Role::forTenant(Role::currentTenantId())->orderBy('name')->get();

        return Inertia::render('settings/users/index', [
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    /**
     * Stop the organization from going past the seats its plan pays for. The
     * limit lives on the tenant so a dev admin can still grant an exception.
     */
    private function assertSeatAvailable(): ?RedirectResponse
    {
        $tenant = auth()->user()->tenant;

        if (! $tenant || $tenant->hasSeatAvailable()) {
            return null;
        }

        return back()
            ->withErrors([
                'email' => "Seu plano permite {$tenant->seatLimit()} usuários e todos já estão em uso. Contrate usuários adicionais para liberar novos acessos.",
            ])
            ->withInput();
    }

    public function store(Request $request)
    {
        if ($response = $this->assertSeatAvailable()) {
            return $response;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Rules\Password::defaults()],
            'role' => ['required', 'string', $this->roleRule()],
        ]);

        if ($response = $this->assertCanAssignRole($validated['role'])) {
            return $response;
        }

        $user = User::create([
            'tenant_id' => auth()->user()->tenant_id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        return redirect()->route('users.index')->with('success', 'Usuário criado com sucesso.');
    }

    public function update(Request $request, User $user)
    {
        if ($response = $this->assertCanManage($user)) {
            return $response;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$user->id,
            'password' => ['nullable', Rules\Password::defaults()],
            'role' => ['required', 'string', $this->roleRule()],
        ]);

        if ($response = $this->assertCanAssignRole($validated['role'])) {
            return $response;
        }

        if ($user->is($request->user()) && ! $user->hasRole($validated['role'])) {
            return back()
                ->withErrors(['role' => 'Você não pode alterar o seu próprio perfil.'])
                ->withInput();
        }

        // Block demoting the last remaining administrator.
        if ($validated['role'] !== self::ADMIN_ROLE && $this->isLastAdmin($user)) {
            return back()
                ->withErrors(['role' => 'Não é possível remover o perfil do único administrador do sistema.'])
                ->withInput();
        }

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
        ];

        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        // Sync roles (replaces existing ones)
        $user->syncRoles([$validated['role']]);

        return redirect()->route('users.index')->with('success', 'Usuário atualizado com sucesso.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return redirect()->route('users.index')->with('error', 'Você não pode excluir a si mesmo.');
        }

        if ($this->isLastAdmin($user)) {
            return redirect()->route('users.index')->with('error', 'Não é possível excluir o único administrador do sistema.');
        }

        if ($response = $this->assertCanManage($user)) {
            return $response;
        }

        $user->delete();

        return redirect()->route('users.index')->with('success', 'Usuário excluído com sucesso.');
    }
}
