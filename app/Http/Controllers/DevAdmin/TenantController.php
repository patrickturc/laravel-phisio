<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicalProtocol;
use App\Models\CommercialPlan;
use App\Models\Evolution;
use App\Models\FinancialTransaction;
use App\Models\GroupClass;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $filter = $request->string('filter')->toString();
        $search = $request->string('search')->toString();

        $tenants = Tenant::query()
            ->when($search !== '', fn ($query) => $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->when($filter === 'trial', fn ($query) => $query->onTrial())
            ->when($filter === 'trial_expired', fn ($query) => $query->trialExpired())
            ->when($filter === 'plan_requests', fn ($query) => $query->pendingPlanRequest())
            ->when($filter === 'self_registered', fn ($query) => $query->selfRegistered())
            ->when($filter === 'paid', fn ($query) => $query->whereIn('plan', Tenant::paidPlans()))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('DevAdmin/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => [
                'filter' => $filter ?: null,
                'search' => $search ?: null,
            ],
            'counts' => [
                'all' => Tenant::count(),
                'trial' => Tenant::onTrial()->count(),
                'trial_expired' => Tenant::trialExpired()->count(),
                'plan_requests' => Tenant::pendingPlanRequest()->count(),
                'self_registered' => Tenant::selfRegistered()->count(),
                'paid' => Tenant::whereIn('plan', Tenant::paidPlans())->count(),
            ],
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
            'legal_name' => ['nullable', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:255'],
            'state_registration' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'cep' => ['nullable', 'string', 'max:9'],
            'street' => ['nullable', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:50'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:2'],
            'technical_manager_name' => ['nullable', 'string', 'max:255'],
            'technical_manager_document' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'plan' => ['required', Rule::in(array_keys(config('plans.plans', [])))],
            'max_users' => ['required', 'integer', 'min:1'],
            'max_storage_mb' => ['nullable', 'integer', 'min:100'],
            'features' => ['nullable', 'array'],
            'admin_name' => ['nullable', 'string', 'max:255'],
            'admin_email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'admin_password' => ['nullable', 'string', 'min:8'],
        ]);

        $validated['slug'] = Str::slug($validated['name']).'-'.Str::random(4);
        if (empty($validated['max_storage_mb'])) {
            $validated['max_storage_mb'] = 1024;
        }

        $tenantData = collect($validated)->except(['admin_name', 'admin_email', 'admin_password'])->toArray();

        // Two dependent writes (tenant, then its first user): if the second
        // one failed after the first committed, the dev admin would be left
        // looking at a tenant with no way to sign in as it.
        DB::transaction(function () use ($tenantData, $validated): void {
            $tenant = Tenant::create($tenantData);

            if (! empty($validated['admin_email']) && ! empty($validated['admin_password'])) {
                $adminUser = User::create([
                    'tenant_id' => $tenant->id,
                    'name' => $validated['admin_name'] ?: 'Administrador',
                    'email' => $validated['admin_email'],
                    'password' => Hash::make($validated['admin_password']),
                    'is_dev_admin' => false,
                    'email_verified_at' => now(),
                ]);

                $adminUser->assignRole($this->ownerRole());
            }
        });

        return redirect()->route('dev-admin.tenants.index')
            ->with('success', 'Organização criada com sucesso.');
    }

    public function show(Tenant $tenant)
    {
        $tenant->load('users.roles');

        $totalPatients = Patient::where('tenant_id', $tenant->id)->count();
        $appointmentsThisMonth = Appointment::where('tenant_id', $tenant->id)
            ->whereMonth('appointment_date', now()->month)
            ->whereYear('appointment_date', now()->year)
            ->count();
        $totalEvolutions = Evolution::where('tenant_id', $tenant->id)->count();

        $lastAppointment = Appointment::where('tenant_id', $tenant->id)->latest('created_at')->value('created_at');
        $lastEvolution = Evolution::where('tenant_id', $tenant->id)->latest('created_at')->value('created_at');
        $lastPatient = Patient::where('tenant_id', $tenant->id)->latest('created_at')->value('created_at');

        $timestamps = array_filter([$lastAppointment, $lastEvolution, $lastPatient]);
        $lastActivityAt = ! empty($timestamps) ? max($timestamps) : null;
        $daysInactive = $lastActivityAt ? now()->diffInDays(Carbon::parse($lastActivityAt)) : null;

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
            'last_activity_text' => $lastActivityAt ? Carbon::parse($lastActivityAt)->diffForHumans() : 'Sem atividade recente',
            'health_status' => $healthStatus,
            'days_inactive' => $daysInactive,
        ];

        return Inertia::render('DevAdmin/Tenants/Show', [
            'tenant' => $tenant,
            'metrics' => $metrics,
            'usageLogs' => $tenant->usageLogs()->latest('reference_date')->take(10)->get(),
            'plans' => collect(config('plans.plans', []))
                ->map(fn (array $plan): array => [
                    'name' => $plan['name'],
                    'users' => $plan['users'],
                    'storage_mb' => $plan['storage_mb'],
                    'selectable' => (bool) ($plan['selectable'] ?? false),
                ])
                ->all(),
            'extraUserPrice' => (float) config('plans.extra_user_price'),
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
            'legal_name' => ['nullable', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:255'],
            'state_registration' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'cep' => ['nullable', 'string', 'max:9'],
            'street' => ['nullable', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:50'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:2'],
            'technical_manager_name' => ['nullable', 'string', 'max:255'],
            'technical_manager_document' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'plan' => ['required', Rule::in(array_keys(config('plans.plans', [])))],
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
            'users' => User::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get(['name', 'email', 'created_at'])->toArray(),
            'patients' => Patient::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'appointments' => Appointment::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'evolutions' => Evolution::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'financial_transactions' => FinancialTransaction::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'clinical_protocols' => ClinicalProtocol::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'group_classes' => GroupClass::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
            'commercial_plans' => CommercialPlan::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get()->toArray(),
        ];

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $filename = 'export-'.Str::slug($tenant->name).'-'.now()->format('Y-m-d-His').'.json';

        return response()->streamDownload(function () use ($json) {
            echo $json;
        }, $filename, [
            'Content-Type' => 'application/json',
        ]);
    }

    /**
     * Approve a pending plan request: move the organization onto the paid plan
     * and clear the trial, which is what unlocks the application again.
     */
    public function approvePlanRequest(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'plan' => ['required', Rule::in(Tenant::selectablePlans())],
            'extra_users' => ['nullable', 'integer', 'min:0', 'max:'.config('plans.max_extra_users')],
        ]);

        $extraUsers = $validated['extra_users'] ?? $tenant->requested_extra_users;

        // Two dependent writes: applying the plan and clearing the trial plus
        // the pending request. Half of it landing would leave the organization
        // on a paid plan that still looks like it is waiting for approval.
        DB::transaction(function () use ($tenant, $validated, $extraUsers): void {
            $tenant->applyPlan($validated['plan'], $extraUsers);

            $tenant->update([
                'status' => 'active',
                'trial_ends_at' => null,
                'requested_plan' => null,
                'requested_extra_users' => 0,
                'plan_requested_at' => null,
                'plan_request_notes' => null,
            ]);
        });

        $tenant->refresh();
        $planName = Tenant::planConfig($tenant->plan)['name'] ?? $tenant->plan;

        return back()->with('success', "Plano {$planName} ativado para {$tenant->name} com {$tenant->seatLimit()} usuários.");
    }

    /**
     * Dismiss a plan request without changing the plan. The organization stays
     * where it is (trial or expired) and can request again.
     */
    public function rejectPlanRequest(Tenant $tenant)
    {
        $tenant->update([
            'requested_plan' => null,
            'requested_extra_users' => 0,
            'plan_requested_at' => null,
            'plan_request_notes' => null,
        ]);

        return back()->with('success', 'Solicitação de plano descartada.');
    }

    /**
     * Give an organization more trial days, counted from today when the trial
     * has already lapsed.
     */
    public function extendTrial(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:180'],
        ]);

        $base = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture()
            ? $tenant->trial_ends_at
            : now();

        $tenant->update([
            'trial_started_at' => $tenant->trial_started_at ?? now(),
            'trial_ends_at' => $base->copy()->addDays($validated['days']),
        ]);

        return back()->with('success', "Trial estendido em {$validated['days']} dias.");
    }

    /**
     * The full-access role granted to a tenant's first admin, created with
     * every permission on a fresh install so it is never left empty. Mirrors
     * App\Actions\Fortify\CreateNewUser::ownerRole(), which does the same
     * for self-service signups — both paths must land on one shared role.
     */
    private function ownerRole(): Role
    {
        $role = Role::findOrCreate('Administrador', 'web');

        if ($role->permissions()->count() === 0) {
            $role->syncPermissions(Permission::where('guard_name', 'web')->get());
        }

        return $role;
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
            // Only real, already-seeded roles: an unrecognized name used to
            // auto-create a brand-new Spatie role with zero permissions,
            // which silently locked the new user out of everything.
            'role' => ['nullable', 'string', Rule::in(Role::pluck('name'))],
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_dev_admin' => false,
            'email_verified_at' => now(),
        ]);

        if (! empty($validated['role'])) {
            $user->assignRole($validated['role']);
        }

        return back()->with('success', "Usuário {$user->name} cadastrado com sucesso para esta organização.");
    }

    public function resetUserPassword(Request $request, Tenant $tenant, User $user)
    {
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Usuário não pertence a esta organização.');
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', "Senha do usuário {$user->name} redefinida com sucesso.");
    }
}
