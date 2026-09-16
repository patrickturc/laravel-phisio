<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    /**
     * Trial status and plan catalogue. Doubles as the wall shown once the trial
     * is over, which is why it sits outside the "tenant.active" middleware.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if (! $tenant) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('subscription/index', [
            'tenant' => [
                'name' => $tenant->name,
                'plan' => $tenant->plan,
                'plan_name' => Tenant::planConfig($tenant->plan)['name'] ?? $tenant->plan,
                'access_status' => $tenant->accessStatus(),
                'is_on_trial' => $tenant->isOnTrial(),
                'is_trial_expired' => $tenant->isTrialExpired(),
                'trial_days_left' => $tenant->trialDaysLeft(),
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'requested_plan' => $tenant->requested_plan,
                'requested_extra_users' => $tenant->requested_extra_users,
                'plan_requested_at' => $tenant->plan_requested_at?->toIso8601String(),
                'has_pending_plan_request' => $tenant->hasPendingPlanRequest(),
                'seat_limit' => $tenant->seatLimit(),
                'seats_in_use' => $tenant->seatsInUse(),
                'extra_users' => $tenant->extra_users,
                'profile_complete' => $tenant->isProfileComplete(),
            ],
            'plans' => $this->catalogue(),
            'includedFeatures' => config('plans.included_features', []),
            'extraUserPrice' => (float) config('plans.extra_user_price'),
            'maxExtraUsers' => (int) config('plans.max_extra_users'),
            'contactEmail' => config('app.contact_email'),
            'canManage' => $request->user()->can('settings.users.view'),
        ]);
    }

    /**
     * Register the organization's interest in a paid plan. Activation itself is
     * manual: a dev admin reviews the request and switches the plan over.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        if (! $tenant) {
            return redirect()->route('dashboard');
        }

        if (! $request->user()->can('settings.users.view')) {
            return back()->with('error', 'Apenas administradores da organização podem solicitar um plano.');
        }

        // Billing needs the full company record, so the profile has to be
        // finished before a plan can be requested.
        if (! $tenant->isProfileComplete()) {
            return redirect()->route('organization.edit')
                ->with('warning', 'Complete o cadastro da clínica antes de contratar um plano.');
        }

        $validated = $request->validate([
            'requested_plan' => ['required', Rule::in(Tenant::selectablePlans())],
            'requested_extra_users' => ['nullable', 'integer', 'min:0', 'max:'.config('plans.max_extra_users')],
            'plan_request_notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'requested_plan.required' => 'Escolha o plano desejado.',
            'requested_plan.in' => 'Escolha um dos planos disponíveis.',
            'requested_extra_users.max' => 'Fale com a equipe para contratar mais assentos de uma vez.',
        ]);

        $plan = Tenant::planConfig($validated['requested_plan']);
        $extra = (int) ($validated['requested_extra_users'] ?? 0);

        if (! ($plan['allows_extra_users'] ?? false)) {
            $extra = 0;
        }

        // Asking for fewer seats than the team already occupies would lock
        // people out the moment the plan is activated.
        $seats = (int) ($plan['users'] ?? 1) + $extra;

        if ($seats < $tenant->seatsInUse()) {
            return back()->withErrors([
                'requested_extra_users' => "Sua equipe já usa {$tenant->seatsInUse()} assentos. Escolha um plano maior ou adicione usuários.",
            ]);
        }

        $tenant->update([
            'requested_plan' => $validated['requested_plan'],
            'requested_extra_users' => $extra,
            'plan_request_notes' => $validated['plan_request_notes'] ?? null,
            'plan_requested_at' => now(),
        ]);

        return back()->with('success', 'Solicitação enviada. Nossa equipe entrará em contato para concluir a contratação.');
    }

    /**
     * Plans the organization can pick from, as shown on the pricing cards.
     *
     * @return list<array<string, mixed>>
     */
    private function catalogue(): array
    {
        return collect(config('plans.plans', []))
            ->filter(fn (array $plan): bool => (bool) ($plan['selectable'] ?? false))
            ->map(fn (array $plan, string $key): array => [
                'key' => $key,
                'name' => $plan['name'],
                'tagline' => $plan['tagline'],
                'users' => $plan['users'],
                'storage_mb' => $plan['storage_mb'],
                'price' => $plan['price'],
                'allows_extra_users' => (bool) ($plan['allows_extra_users'] ?? false),
            ])
            ->values()
            ->all();
    }
}
