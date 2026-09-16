<?php

namespace App\Http\Controllers;

use App\Models\ClinicalProtocol;
use App\Models\CommercialPlan;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $query = Patient::with('activeMembership')->orderBy('name');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->whereLike('name', '%'.$request->search.'%')
                    ->orWhereLike('nickname', '%'.$request->search.'%')
                    ->orWhereLike('cpf', '%'.$request->search.'%')
                    ->orWhereLike('email', '%'.$request->search.'%');
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $patients = $query->paginate(20)->withQueryString();

        return Inertia::render('patients/index', [
            'patients' => $patients,
            'filters' => $request->only(['search', 'type']),
        ]);
    }

    public function create()
    {
        return redirect()->route('patients.index', ['create' => 'true']);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nickname' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            // Ignore soft-deleted patients so a reused CPF/e-mail isn't blocked.
            'email' => 'nullable|email|max:255|unique:patients,email,NULL,id,deleted_at,NULL',
            'birthdate' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'type' => 'required|in:pilates,physiotherapy',
            'cpf' => 'nullable|string|max:14|unique:patients,cpf,NULL,id,deleted_at,NULL',
            'rg' => 'nullable|string|max:20',
            'profession' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'health_notes' => 'nullable|string|max:2000',
            'cep' => 'nullable|string|max:10',
            'street' => 'nullable|string|max:255',
            'number' => 'nullable|string|max:20',
            'complement' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:2',
        ], [
            'email.unique' => 'Já existe um paciente com este e-mail.',
            'cpf.unique' => 'Já existe um paciente com este CPF.',
        ]);

        $validated['user_id'] = auth()->id();
        Patient::create($validated);

        return redirect()->route('patients.index')
            ->with('success', 'Paciente cadastrado com sucesso!');
    }

    public function show(Patient $patient)
    {
        $patient->load([
            'appointments' => fn ($q) => $q->orderBy('appointment_date', 'desc'),
            'evolutions' => fn ($q) => $q->orderBy('data_atendimento', 'desc'),
            'memberships' => fn ($q) => $q->with('commercialPlan')->orderBy('end_date', 'desc'),
            'financialTransactions' => fn ($q) => $q->orderBy('date', 'desc'),
            'documents' => fn ($q) => $q->orderBy('created_at', 'desc'),
        ]);

        // Expose the monthly session quota usage on each membership card.
        $patient->memberships->each->append([
            'monthly_allowance', 'sessions_used_this_month', 'sessions_remaining_this_month',
        ]);

        $today = now()->toDateString();
        $financialSummary = [
            'total_received' => (float) $patient->financialTransactions->where('type', 'income')->where('status', 'paid')->sum('amount'),
            'total_pending' => (float) $patient->financialTransactions->where('type', 'income')->where('status', 'pending')->sum('amount'),
            'overdue_amount' => (float) $patient->financialTransactions
                ->where('type', 'income')
                ->where('status', 'pending')
                ->filter(fn ($t) => $t->due_date && $t->due_date->toDateString() < $today)
                ->sum('amount'),
        ];

        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name', 'total_sessions']);
        $commercialPlans = CommercialPlan::orderBy('name')->get(['id', 'name', 'price', 'duration_months']);

        return Inertia::render('patients/show', [
            'patient' => $patient,
            'protocols' => $protocols,
            'commercialPlans' => $commercialPlans,
            'financialSummary' => $financialSummary,
        ]);
    }

    public function edit(Patient $patient)
    {
        // Editing happens via a sheet on the index/show; keep the URL from 404ing.
        return redirect()->route('patients.index');
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'nickname' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            // Unique among active patients, ignoring this patient's own record.
            'email' => 'nullable|email|max:255|unique:patients,email,'.$patient->id.',id,deleted_at,NULL',
            'birthdate' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'type' => 'sometimes|required|in:pilates,physiotherapy',
            'cpf' => 'nullable|string|max:14|unique:patients,cpf,'.$patient->id.',id,deleted_at,NULL',
            'rg' => 'nullable|string|max:20',
            'profession' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'health_notes' => 'nullable|string|max:2000',
            'cep' => 'nullable|string|max:10',
            'street' => 'nullable|string|max:255',
            'number' => 'nullable|string|max:20',
            'complement' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:2',
        ], [
            'email.unique' => 'Já existe um paciente com este e-mail.',
            'cpf.unique' => 'Já existe um paciente com este CPF.',
        ]);

        $patient->update($validated);

        return redirect()->route('patients.show', $patient)
            ->with('success', 'Paciente atualizado com sucesso!');
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return redirect()->route('patients.index')
            ->with('success', 'Paciente excluído com sucesso!');
    }
}
