<?php

namespace App\Http\Controllers;

use App\Models\RecurringExpense;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecurringExpenseController extends Controller
{
    public function index()
    {
        $expenses = RecurringExpense::orderBy('description')->get();

        return Inertia::render('recurring-expenses/index', [
            'expenses' => $expenses,
        ]);
    }

    public function create()
    {
        // Creation happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('recurring-expenses.index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'category' => 'nullable|string|max:100',
            'recurrence' => 'required|in:monthly,quarterly,yearly',
            'day_of_month' => 'required|integer|min:1|max:31',
        ]);

        $validated['is_active'] = true;

        RecurringExpense::create($validated);

        return redirect()->route('recurring-expenses.index')->with('success', 'Gasto recorrente cadastrado!');
    }

    public function edit(RecurringExpense $recurringExpense)
    {
        // Editing happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('recurring-expenses.index');
    }

    public function update(Request $request, RecurringExpense $recurringExpense)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'category' => 'nullable|string|max:100',
            'recurrence' => 'required|in:monthly,quarterly,yearly',
            'day_of_month' => 'required|integer|min:1|max:31',
            'is_active' => 'boolean',
        ]);

        $recurringExpense->update($validated);

        return redirect()->route('recurring-expenses.index')->with('success', 'Gasto recorrente atualizado!');
    }

    public function destroy(RecurringExpense $recurringExpense)
    {
        $recurringExpense->delete();

        return redirect()->route('recurring-expenses.index')->with('success', 'Gasto recorrente excluído.');
    }

    public function toggleActive(RecurringExpense $recurringExpense)
    {
        $recurringExpense->update(['is_active' => ! $recurringExpense->is_active]);

        return redirect()->back()->with('success', $recurringExpense->is_active ? 'Gasto ativado!' : 'Gasto desativado!');
    }
}
