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
            'tenant' => $tenant->only([
                'id', 'name', 'legal_name', 'document', 'state_registration',
                'email', 'phone', 'whatsapp', 'website',
                'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
                'technical_manager_name', 'technical_manager_document',
            ]),
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

        foreach (['document', 'technical_manager_document'] as $field) {
            if (isset($input[$field]) && is_string($input[$field])) {
                $input[$field] = preg_replace('/\D/', '', $input[$field]) ?: null;
            }
        }

        if (isset($input['cep']) && is_string($input['cep'])) {
            $input['cep'] = preg_replace('/\D/', '', $input['cep']) ?: null;
        }

        $validated = validator($input, [
            'name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'document' => ['required', 'string', 'max:20', new CpfCnpj, Rule::unique(Tenant::class, 'document')->ignore($tenant->id)],
            'state_registration' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'min:10', 'max:30'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'string', 'max:255'],
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
}
