<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    /**
     * Trial status page. Doubles as the wall shown once the trial is over,
     * which is why it sits outside the "tenant.active" middleware group.
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
                'access_status' => $tenant->accessStatus(),
                'is_on_trial' => $tenant->isOnTrial(),
                'is_trial_expired' => $tenant->isTrialExpired(),
                'trial_days_left' => $tenant->trialDaysLeft(),
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'requested_plan' => $tenant->requested_plan,
                'plan_requested_at' => $tenant->plan_requested_at?->toIso8601String(),
                'has_pending_plan_request' => $tenant->hasPendingPlanRequest(),
            ],
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

        if ($tenant->hasPaidPlan()) {
            return back()->with('warning', 'Sua organização já possui um plano ativo.');
        }

        $validated = $request->validate([
            'requested_plan' => ['required', Rule::in(['basic', 'pro'])],
            'plan_request_notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'requested_plan.required' => 'Escolha o plano desejado.',
        ]);

        $tenant->update([
            'requested_plan' => $validated['requested_plan'],
            'plan_request_notes' => $validated['plan_request_notes'] ?? null,
            'plan_requested_at' => now(),
        ]);

        return back()->with('success', 'Solicitação enviada. Nossa equipe entrará em contato para concluir a contratação.');
    }
}
