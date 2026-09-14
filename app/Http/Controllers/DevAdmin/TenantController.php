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
            'max_storage_mb' => ['nullable', 'integer', 'min:100'],
            'features' => ['nullable', 'array'],
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(4);
        if (empty($validated['max_storage_mb'])) {
            $validated['max_storage_mb'] = 1024;
        }

        Tenant::create($validated);

        return redirect()->route('dev-admin.tenants.index')
            ->with('success', 'Organização criada com sucesso.');
    }

    public function show(Tenant $tenant)
    {
        $tenant->load('users.roles');

        $totalPatients = \App\Models\Patient::where('tenant_id', $tenant->id)->count();
        $appointmentsThisMonth = \App\Models\Appointment::where('tenant_id', $tenant->id)
            ->whereMonth('appointment_date', now()->month)
            ->whereYear('appointment_date', now()->year)
            ->count();
        $totalEvolutions = \App\Models\Evolution::where('tenant_id', $tenant->id)->count();

        $lastAppointment = \App\Models\Appointment::where('tenant_id', $tenant->id)->latest('created_at')->value('created_at');
        $lastEvolution = \App\Models\Evolution::where('tenant_id', $tenant->id)->latest('created_at')->value('created_at');
        $lastPatient = \App\Models\Patient::where('tenant_id', $tenant->id)->latest('created_at')->value('created_at');

        $timestamps = array_filter([$lastAppointment, $lastEvolution, $lastPatient]);
        $lastActivityAt = ! empty($timestamps) ? max($timestamps) : null;
        $daysInactive = $lastActivityAt ? now()->diffInDays(\Carbon\Carbon::parse($lastActivityAt)) : null;

        $healthStatus = 'active';
        if ($daysInactive === null || $daysInactive > 20) {
            $healthStatus = 'risk';
        } elseif ($daysInactive > 7) {
            $healthStatus = 'attention';
        }

        $metrics = [
            'total_patients' => $totalPatients,
            'appointments_this_month' => $appointmentsThisMonth,
            'total_evolutions' => $totalEvolutions,
            'last_activity_text' => $lastActivityAt ? \Carbon\Carbon::parse($lastActivityAt)->diffForHumans() : 'Sem atividade recente',
            'health_status' => $healthStatus,
            'days_inactive' => $daysInactive,
        ];

        return Inertia::render('DevAdmin/Tenants/Show', [
            'tenant' => $tenant,
            'metrics' => $metrics,
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
            'max_storage_mb' => ['nullable', 'integer', 'min:100'],
            'features' => ['nullable', 'array'],
        ]);

        $tenant->update($validated);

        return redirect()->route('dev-admin.tenants.index')
            ->with('success', 'Organização atualizada com sucesso.');
    }

    public function export(Tenant $tenant)
    {
        $data = [
            'tenant' => $tenant->makeHidden(['id'])->toArray(),
            'exported_at' => now()->toIso8601String(),
            'users' => \App\Models\User::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get(['name', 'email', 'created_at'])->toArray(),
            'patients' => \App\Models\Patient::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'appointments' => \App\Models\Appointment::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'evolutions' => \App\Models\Evolution::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'financial_transactions' => \App\Models\FinancialTransaction::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'clinical_protocols' => \App\Models\ClinicalProtocol::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'group_classes' => \App\Models\GroupClass::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'commercial_plans' => \App\Models\CommercialPlan::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
        ];

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $filename = 'export-' . Str::slug($tenant->name) . '-' . now()->format('Y-m-d-His') . '.json';

        return response()->streamDownload(function () use ($json) {
            echo $json;
        }, $filename, [
            'Content-Type' => 'application/json',
        ]);
    }

    public function toggleStatus(Tenant $tenant)
    {
        $newStatus = $tenant->status === 'active' ? 'suspended' : 'active';
        
        $tenant->update(['status' => $newStatus]);

        return back()->with('success', "Status da organização alterado para {$newStatus}.");
    }

    public function storeUser(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', 'string'],
        ]);

        $user = \App\Models\User::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
            'is_dev_admin' => false,
            'email_verified_at' => now(),
        ]);

        if (! empty($validated['role'])) {
            $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => $validated['role'], 'guard_name' => 'web']);
            $user->assignRole($role);
        }

        return back()->with('success', "Usuário {$user->name} cadastrado com sucesso para esta organização.");
    }

    public function resetUserPassword(Request $request, Tenant $tenant, \App\Models\User $user)
    {
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Usuário não pertence a esta organização.');
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
        ]);

        return back()->with('success', "Senha do usuário {$user->name} redefinida com sucesso.");
    }
}
