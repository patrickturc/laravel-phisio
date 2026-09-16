<?php

namespace App\Http\Controllers;

use App\Models\CommercialPlan;
use App\Models\FinancialTransaction;
use App\Models\Membership;
use App\Models\Patient;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MembershipController extends Controller
{
    public function index(Request $request)
    {
        $query = Membership::with('patient', 'commercialPlan')->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->whereHas('patient', function ($q) use ($request) {
                $q->whereLike('name', '%'.$request->search.'%');
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $memberships = $query->paginate(15)->withQueryString();
        $memberships->getCollection()->each->append(['sessions_total', 'sessions_used', 'sessions_remaining']);

        $patients = Patient::orderBy('name')->get(['id', 'name']);
        $commercialPlans = CommercialPlan::orderBy('name')->get(['id', 'name', 'price', 'duration_months', 'sessions_total']);

        return Inertia::render('memberships/index', [
            'memberships' => $memberships,
            'filters' => $request->only(['search', 'status']),
            'patients' => $patients,
            'commercialPlans' => $commercialPlans,
        ]);
    }

    public function create(Request $request)
    {
        // Creation happens via a sheet on the index; keep the URL from 404ing.
        return redirect()->route('memberships.index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'commercial_plan_id' => 'nullable|uuid|exists:commercial_plans,id',
            'plan_name' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:active,expired,cancelled',
            'billing_day' => 'nullable|integer|min:1|max:31',
        ]);

        $membership = DB::transaction(function () use ($validated) {
            $membership = Membership::create($validated);

            // Auto-create the first charge and mark the start month as billed so
            // the recurring-charges command does not generate a duplicate.
            if ($membership->price > 0) {
                $this->createMembershipCharge($membership, $membership->start_date);
                $membership->update(['last_billed_at' => $membership->start_date]);
            }

            return $membership;
        });

        return redirect()->route('memberships.index')->with('success', 'Matrícula criada com sucesso!');
    }

    public function show(Membership $membership)
    {
        $membership->load(['patient', 'commercialPlan', 'financialTransactions' => function ($q) {
            $q->orderBy('date', 'desc');
        }]);
        $membership->append([
            'sessions_total', 'sessions_used', 'sessions_remaining',
            'monthly_allowance', 'sessions_used_this_month', 'sessions_remaining_this_month',
        ]);

        $patients = Patient::orderBy('name')->get(['id', 'name']);
        $commercialPlans = CommercialPlan::orderBy('name')->get(['id', 'name', 'price', 'duration_months']);

        return Inertia::render('memberships/show', [
            'membership' => $membership,
            'patients' => $patients,
            'commercialPlans' => $commercialPlans,
        ]);
    }

    public function edit(Membership $membership)
    {
        // Editing happens via a sheet on the show page; keep the URL from 404ing.
        return redirect()->route('memberships.show', $membership);
    }

    public function update(Request $request, Membership $membership)
    {
        $validated = $request->validate([
            'commercial_plan_id' => 'nullable|uuid|exists:commercial_plans,id',
            'plan_name' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:active,expired,cancelled',
            'billing_day' => 'nullable|integer|min:1|max:31',
        ]);

        $membership->update($validated);

        return redirect()->route('memberships.index')->with('success', 'Matrícula atualizada com sucesso!');
    }

    public function destroy(Membership $membership)
    {
        // Delete pending financial transactions linked to this membership
        $membership->financialTransactions()->where('status', 'pending')->delete();
        $membership->delete();

        return redirect()->route('memberships.index')->with('success', 'Matrícula excluída.');
    }

    public function renew(Membership $membership)
    {
        if ($membership->status === 'cancelled') {
            return redirect()->route('memberships.show', $membership)
                ->with('error', 'Matrículas canceladas não podem ser renovadas.');
        }

        $membership->loadMissing('commercialPlan');

        $oldStart = Carbon::parse($membership->start_date);
        $oldEnd = Carbon::parse($membership->end_date);

        // Duration in whole months, preferring the plan's contracted duration
        // (renewing by raw day count drifts monthly plans out of alignment).
        $durationMonths = $membership->commercialPlan?->duration_months
            ?? max(1, $oldStart->diffInMonths($oldEnd));

        $newStart = $oldEnd->copy()->addDay();
        $newEnd = $newStart->copy()->addMonthsNoOverflow($durationMonths)->subDay();

        // Re-read the current plan price so renewals reflect price changes.
        $price = $membership->commercialPlan?->price ?? $membership->price;

        $newMembership = DB::transaction(function () use ($membership, $newStart, $newEnd, $price) {
            if ($membership->status === 'active') {
                $membership->update(['status' => 'expired']);
            }

            $newMembership = Membership::create([
                'patient_id' => $membership->patient_id,
                'commercial_plan_id' => $membership->commercial_plan_id,
                'plan_name' => $membership->plan_name,
                'start_date' => $newStart->format('Y-m-d'),
                'end_date' => $newEnd->format('Y-m-d'),
                'price' => $price,
                'status' => 'active',
                'billing_day' => $membership->billing_day,
            ]);

            if ($newMembership->price > 0) {
                $this->createMembershipCharge($newMembership, $newMembership->start_date);
                $newMembership->update(['last_billed_at' => $newMembership->start_date]);
            }

            return $newMembership;
        });

        return redirect()->route('memberships.show', $newMembership)->with('success', 'Matrícula renovada com sucesso!');
    }

    /**
     * Create the pending "Mensalidade" charge for a membership's billing cycle.
     */
    private function createMembershipCharge(Membership $membership, CarbonInterface $reference): void
    {
        $membership->loadMissing('commercialPlan', 'patient');
        $planName = $membership->commercialPlan?->name ?? $membership->plan_name ?? 'Plano';
        $patientName = $membership->patient?->name ?? 'Aluno';

        $dueDate = $membership->billing_day
            ? $reference->copy()->day(min($membership->billing_day, $reference->daysInMonth))
            : $reference->copy();

        FinancialTransaction::create([
            'type' => 'income',
            'amount' => $membership->price,
            'date' => $reference->copy(),
            'due_date' => $dueDate,
            'description' => "Mensalidade: {$planName} — {$patientName}",
            'category' => 'Mensalidade',
            'status' => 'pending',
            'patient_id' => $membership->patient_id,
            'membership_id' => $membership->id,
        ]);
    }
}
