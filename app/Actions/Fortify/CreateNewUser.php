<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\CpfCnpj;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Role granted to the person who signs the organization up.
     */
    private const OWNER_ROLE = 'Administrador';

    /**
     * Validate and create a newly registered organization plus its first user.
     *
     * Self-service signup always creates a brand new tenant on a trial — there
     * is no public way to join an existing organization, that is done by the
     * organization's own admin under Settings.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $this->ensureNotRateLimited();

        // Strip the document down to digits before validating, otherwise the
        // uniqueness check compares "11.222.333/0001-81" against the stored
        // "11222333000181" and lets a duplicate through.
        if (isset($input['document']) && is_string($input['document'])) {
            $input['document'] = $this->normalizeDocument($input['document']);
        }

        // Only what is needed to open a real account and reach the customer.
        // Address and technical manager are collected afterwards, through the
        // "complete your registration" reminder inside the app.
        Validator::make($input, [
            'organization_name' => ['required', 'string', 'max:255'],
            'document' => ['required', 'string', 'max:20', new CpfCnpj, Rule::unique(Tenant::class, 'document')],
            ...$this->profileRules(),
            'phone' => ['required', 'string', 'min:10', 'max:30'],
            'password' => $this->passwordRules(),
            'terms' => ['accepted'],
        ], [
            'organization_name.required' => 'Informe o nome da sua clínica ou estúdio.',
            'document.required' => 'Informe o CNPJ da clínica ou o seu CPF.',
            'document.unique' => 'Já existe uma organização cadastrada com este CNPJ ou CPF.',
            'phone.required' => 'Informe um telefone para contato.',
            'phone.min' => 'Informe um telefone válido com DDD.',
            'terms.accepted' => 'É necessário aceitar os termos de uso para continuar.',
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $tenant = Tenant::create([
                'name' => $input['organization_name'],
                'slug' => $this->uniqueSlug($input['organization_name']),
                'email' => $input['email'],
                'phone' => $input['phone'],
                'document' => $input['document'],
                'status' => 'active',
                'plan' => 'free',
                'max_users' => (int) (Tenant::planConfig('free')['users'] ?? 3),
                'max_storage_mb' => (int) (Tenant::planConfig('free')['storage_mb'] ?? 1024),
                'self_registered' => true,
                'trial_started_at' => now(),
                'trial_ends_at' => now()->addDays(Tenant::TRIAL_DAYS),
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'is_dev_admin' => false,
                'email_verified_at' => now(),
            ]);

            $user->assignRole($this->ownerRole());

            return $user;
        });
    }

    /**
     * Fortify does not throttle its register route, so cap signups per IP to
     * keep the public form from being used to mass-create organizations.
     *
     * @throws ValidationException
     */
    private function ensureNotRateLimited(): void
    {
        $key = 'register:'.request()->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.',
            ]);
        }

        RateLimiter::hit($key, 3600);
    }

    /**
     * Store documents as digits only so the uniqueness check cannot be beaten
     * by typing the same CNPJ with different punctuation.
     */
    private function normalizeDocument(string $document): string
    {
        return preg_replace('/\D/', '', $document) ?? $document;
    }

    /**
     * Build a slug that does not collide with an existing organization.
     */
    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'clinica';
        $slug = $base;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base.'-'.Str::lower(Str::random(4));
        }

        return $slug;
    }

    /**
     * The full-access role, created with every permission on a fresh install so
     * the first signup is never left without access.
     */
    private function ownerRole(): Role
    {
        $role = Role::findOrCreate(self::OWNER_ROLE, 'web');

        if ($role->permissions()->count() === 0) {
            $role->syncPermissions(Permission::where('guard_name', 'web')->get());
        }

        return $role;
    }
}
