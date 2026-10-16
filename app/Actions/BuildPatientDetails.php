<?php

namespace App\Actions;

use App\Models\ClinicalProtocol;
use App\Models\CommercialPlan;
use App\Models\FinancialTransaction;
use App\Models\Patient;
use App\Models\User;

/**
 * Everything the patient details modal shows, opened from any screen of the
 * app (see the "patientDetails" shared prop).
 */
class BuildPatientDetails
{
    /**
     * @return array{patient: Patient, protocols: mixed, commercialPlans: mixed, financialSummary: array{total_received: float, total_pending: float, overdue_amount: float}|null}
     */
    public function __invoke(Patient $patient, User $user): array
    {
        // Each tab only reaches the browser for whoever may see it: the front
        // desk does not read the clinical record, nor professionals the
        // patient's payments.
        $canSeeEvolutions = $user->can('evolutions.manage.view');
        $canSeeMemberships = $user->can('memberships.manage.view');
        $canSeeFinancial = $user->can('financial.transactions.view');

        $patient->load(array_filter([
            'appointments' => fn ($q) => $q->orderBy('appointment_date', 'desc'),
            'evolutions' => $canSeeEvolutions ? fn ($q) => $q->orderBy('data_atendimento', 'desc') : null,
            'memberships' => $canSeeMemberships ? fn ($q) => $q->with('commercialPlan')->orderBy('end_date', 'desc') : null,
            'financialTransactions' => $canSeeFinancial ? fn ($q) => $q->orderBy('date', 'desc') : null,
            'documents' => fn ($q) => $q->orderBy('created_at', 'desc'),
            'recurringBookings' => fn ($q) => $q->active()->with('professional:id,name')
                ->orderBy('day_of_week')->orderBy('start_time'),
        ]));

        foreach (['evolutions' => $canSeeEvolutions, 'memberships' => $canSeeMemberships, 'financialTransactions' => $canSeeFinancial] as $relation => $allowed) {
            if (! $allowed) {
                $patient->setRelation($relation, $patient->newCollection());
            }
        }

        $patient->makeVisible(Patient::PRIVATE_FIELDS);

        // Names of the professionals taking turns on each fixed slot.
        $rotationNames = User::whereIn('id', $patient->recurringBookings->pluck('rotation_user_ids')->flatten()->filter())
            ->pluck('name', 'id');
        $patient->recurringBookings->each(fn ($booking) => $booking->setAttribute(
            'rotation_names',
            collect($booking->rotation_user_ids ?? [])->map(fn ($id) => $rotationNames[$id] ?? null)->filter()->values(),
        ));

        // Expose the monthly session quota usage on each membership card.
        $patient->memberships->each->append([
            'monthly_allowance', 'sessions_used_this_month', 'sessions_remaining_this_month',
        ]);

        $today = now()->toDateString();
        $financialSummary = $canSeeFinancial ? [
            'total_received' => (float) $patient->financialTransactions->where('type', 'income')->where('status', 'paid')->sum('amount'),
            'total_pending' => (float) $patient->financialTransactions->where('type', 'income')->whereIn('status', FinancialTransaction::OPEN_STATUSES)->sum('amount'),
            'overdue_amount' => (float) $patient->financialTransactions
                ->where('type', 'income')
                ->where('status', 'pending')
                ->filter(fn ($t) => $t->due_date && $t->due_date->toDateString() < $today)
                ->sum('amount'),
        ] : null;

        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name', 'total_sessions']);
        $commercialPlans = CommercialPlan::orderBy('name')->get(['id', 'name', 'price', 'billing_cycle', 'duration_months']);

        return [
            'patient' => $patient,
            'protocols' => $protocols,
            'commercialPlans' => $commercialPlans,
            'financialSummary' => $financialSummary,
        ];
    }
}
