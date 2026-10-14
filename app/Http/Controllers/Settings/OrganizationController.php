<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Rules\CpfCnpj;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    /**
     * Organization profile. This is where the "complete your registration"
     * reminder sends people, so it also reports what is still missing.
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if (! $tenant) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('settings/organization', [
            'tenant' => [
                ...$tenant->only([
                    'id', 'name', 'legal_name', 'document', 'state_registration',
                    'owner_name', 'owner_document',
                    'email', 'phone', 'whatsapp', 'website', 'instagram', 'bio', 'pix_key_type', 'pix_key',
                    'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
                    'technical_manager_name', 'technical_manager_document',
                ]),
                'owner_birthdate' => $tenant->owner_birthdate?->toDateString(),
            ],
            'images' => [
                'logo' => OrganizationImageController::urlFor($tenant, 'logo'),
                'owner-photo' => OrganizationImageController::urlFor($tenant, 'owner-photo'),
            ],
            'missingFields' => $tenant->missingProfileFields(),
            'requiredFields' => Tenant::REQUIRED_PROFILE_FIELDS,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if (! $tenant) {
            return redirect()->route('dashboard');
        }

        $input = $request->all();

        foreach (['document', 'technical_manager_document', 'owner_document'] as $field) {
            if (isset($input[$field]) && is_string($input[$field])) {
                $input[$field] = preg_replace('/\D/', '', $input[$field]) ?: null;
            }
        }

        if (isset($input['cep']) && is_string($input['cep'])) {
            $input['cep'] = preg_replace('/\D/', '', $input['cep']) ?: null;
        }

        if (isset($input['instagram']) && is_string($input['instagram'])) {
            $input['instagram'] = $this->instagramHandle($input['instagram']);
        }

        if (isset($input['pix_key']) && is_string($input['pix_key'])) {
            $input['pix_key'] = $this->normalizePixKey($input['pix_key_type'] ?? null, $input['pix_key']);
        }

        $validated = validator($input, [
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'owner_name' => ['nullable', 'string', 'max:255'],
            'owner_document' => ['nullable', 'string', 'size:11', new CpfCnpj],
            'owner_birthdate' => ['nullable', 'date', 'before:today'],
            'document' => ['required', 'string', 'max:20', new CpfCnpj, Rule::unique(Tenant::class, 'document')->ignore($tenant->id)],
            'state_registration' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'min:10', 'max:30'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'string', 'max:255'],
            'instagram' => ['nullable', 'string', 'regex:/^[A-Za-z0-9._]{1,30}$/'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'pix_key_type' => ['nullable', 'required_with:pix_key', Rule::in(['cpf_cnpj', 'phone', 'email', 'random'])],
            'pix_key' => ['nullable', 'string', 'max:77', function (string $attribute, mixed $value, \Closure $fail) use ($input) {
                $valid = match ($input['pix_key_type'] ?? null) {
                    'cpf_cnpj' => in_array(strlen($value), [11, 14], true) && validator([$attribute => $value], [$attribute => new CpfCnpj])->passes(),
                    'phone' => (bool) preg_match('/^\+55\d{10,11}$/', $value),
                    'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
                    'random' => (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $value),
                    default => true,
                };

                if (! $valid) {
                    $fail('Essa chave PIX não parece válida para o tipo escolhido.');
                }
            }],
            'cep' => ['required', 'string', 'size:8'],
            'street' => ['required', 'string', 'max:255'],
            'number' => ['required', 'string', 'max:50'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'size:2'],
            'technical_manager_name' => ['required', 'string', 'max:255'],
            'technical_manager_document' => ['required', 'string', 'max:50'],
        ], [
            'document.unique' => 'Já existe uma organização cadastrada com este CNPJ ou CPF.',
            'cep.size' => 'Informe um CEP válido com 8 dígitos.',
            'owner_document.size' => 'Informe um CPF válido.',
            'owner_birthdate.before' => 'A data de nascimento precisa ser anterior a hoje.',
            'instagram.regex' => 'Informe só o usuário do Instagram, por exemplo @suaclinica.',
            'pix_key_type.required_with' => 'Escolha o tipo da chave PIX.',
            'state.size' => 'Use a sigla do estado, com 2 letras.',
            'technical_manager_name.required' => 'Informe o responsável técnico da clínica.',
            'technical_manager_document.required' => 'Informe o registro profissional do responsável técnico (CREFITO).',
        ])->validate();

        $tenant->update($validated);
        $tenant->syncProfileCompletion();

        return back()->with(
            'success',
            $tenant->isProfileComplete()
                ? 'Cadastro concluído. Obrigado!'
                : 'Dados da organização atualizados.',
        );
    }

    /**
     * Store the PIX key the way PIX expects it: CPF/CNPJ as digits, phone as
     * +55 with area code, e-mail and random keys in lowercase.
     */
    private function normalizePixKey(?string $type, string $key): ?string
    {
        $key = trim($key);

        if ($key === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', $key);

        return match ($type) {
            'cpf_cnpj' => $digits,
            'phone' => match (true) {
                strlen($digits) === 10 || strlen($digits) === 11 => '+55'.$digits,
                str_starts_with($digits, '55') => '+'.$digits,
                default => $key,
            },
            'email', 'random' => strtolower($key),
            default => $key,
        };
    }

    /**
     * Reduce "@clinica", "instagram.com/clinica/" or a full profile URL to
     * the bare handle.
     */
    private function instagramHandle(string $value): ?string
    {
        $handle = preg_replace('#^(https?://)?(www\.)?instagram\.com/#i', '', trim($value));
        $handle = trim(explode('?', $handle)[0], "/@ \t");

        return $handle === '' ? null : $handle;
    }
}
