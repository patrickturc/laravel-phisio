<?php

namespace App\Http\Controllers;

use App\Models\CommercialPlan;
use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CommercialPlanController extends Controller
{
    public function index()
    {
        $plans = CommercialPlan::orderBy('name')->get();

        return Inertia::render('commercial-plans/index', ['plans' => $plans]);
    }

    public function create()
    {
        // Creation happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('commercial-plans.index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:fisioterapia,pilates,teste',
            'price' => 'required|numeric|min:0',
            'billing_cycle' => ['nullable', Rule::in(array_keys(Membership::BILLING_CYCLES))],
            'duration_months' => 'nullable|integer|min:1',
            'sessions_total' => 'nullable|integer|min:1',
            'sessions_per_week' => 'nullable|integer|min:1|max:7',
            'description' => 'nullable|string|max:1000',
        ]);

        CommercialPlan::create($validated);

        return redirect()->route('commercial-plans.index')->with('success', 'Plano comercial criado com sucesso!');
    }

    public function edit(CommercialPlan $commercialPlan)
    {
        // Editing happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('commercial-plans.index');
    }

    public function update(Request $request, CommercialPlan $commercialPlan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:fisioterapia,pilates,teste',
            'price' => 'required|numeric|min:0',
            'billing_cycle' => ['nullable', Rule::in(array_keys(Membership::BILLING_CYCLES))],
            'duration_months' => 'nullable|integer|min:1',
            'sessions_total' => 'nullable|integer|min:1',
            'sessions_per_week' => 'nullable|integer|min:1|max:7',
            'description' => 'nullable|string|max:1000',
        ]);

        $commercialPlan->update($validated);

        return redirect()->route('commercial-plans.index')->with('success', 'Plano comercial atualizado com sucesso!');
    }

    public function destroy(CommercialPlan $commercialPlan)
    {
        $commercialPlan->delete();

        return redirect()->route('commercial-plans.index')->with('success', 'Plano comercial excluído.');
    }
}
