<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Str;

class TenantController extends Controller
{
    public function index()
    {
        $tenants = Tenant::latest()->paginate(10);

        return Inertia::render('DevAdmin/Tenants/Index', [
            'tenants' => $tenants,
        ]);
    }

    public function create()
    {
        return Inertia::render('DevAdmin/Tenants/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'plan' => ['required', Rule::in(['free', 'basic', 'pro'])],
            'max_users' => ['required', 'integer', 'min:1'],
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);

        Tenant::create($validated);

        return redirect()->route('dev-admin.tenants.index')
            ->with('success', 'Organização criada com sucesso.');
    }

    public function show(Tenant $tenant)
    {
        $tenant->load('users');

        return Inertia::render('DevAdmin/Tenants/Show', [
            'tenant' => $tenant,
            'usageLogs' => $tenant->usageLogs()->latest('reference_date')->take(10)->get(),
        ]);
    }

    public function edit(Tenant $tenant)
    {
        return Inertia::render('DevAdmin/Tenants/Edit', [
            'tenant' => $tenant,
        ]);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'plan' => ['required', Rule::in(['free', 'basic', 'pro'])],
            'max_users' => ['required', 'integer', 'min:1'],
        ]);

        $tenant->update($validated);

        return redirect()->route('dev-admin.tenants.index')
            ->with('success', 'Organização atualizada com sucesso.');
    }

    public function toggleStatus(Tenant $tenant)
    {
        $newStatus = $tenant->status === 'active' ? 'suspended' : 'active';
        
        $tenant->update(['status' => $newStatus]);

        return back()->with('success', "Status da organização alterado para {$newStatus}.");
    }
}
