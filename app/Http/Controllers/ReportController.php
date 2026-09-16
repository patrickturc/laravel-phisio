<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Evolution;
use App\Models\Patient;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $now = Carbon::now();

        $patientQuery = Patient::query();
        $appointmentQuery = Appointment::query();
        $evolutionQuery = Evolution::query();

        if ($startDate && $endDate) {
            $patientQuery->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59']);
            $appointmentQuery->whereBetween('appointment_date', [$startDate, $endDate]);
            $evolutionQuery->whereBetween('data_atendimento', [$startDate, $endDate]);
        }

        // Patients stats
        $totalPatients = $patientQuery->count();
        $pilatesCount = (clone $patientQuery)->where('type', 'pilates')->count();
        $physioCount = (clone $patientQuery)->where('type', 'physiotherapy')->count();

        // Summary stats
        $totalAppointments = $appointmentQuery->count();
        $completedAppointments = (clone $appointmentQuery)->where('status', 'completed')->count();
        $cancelledAppointments = (clone $appointmentQuery)->where('status', 'cancelled')->count();
        $totalEvolutions = $evolutionQuery->count();

        // Top patients by appointment count (filtered)
        $topPatients = Patient::withCount(['appointments' => function ($query) use ($startDate, $endDate) {
            if ($startDate && $endDate) {
                $query->whereBetween('appointment_date', [$startDate, $endDate]);
            }
        }])
            ->orderBy('appointments_count', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'type']);

        // Charts data
        $chartStartDate = $startDate ? Carbon::parse($startDate)->startOfMonth() : $now->copy()->subMonths(11)->startOfMonth();
        $chartEndDate = $endDate ? Carbon::parse($endDate)->endOfMonth() : $now->copy()->endOfMonth();

        $monthExpression = $this->monthTruncExpression('appointment_date');

        $appointmentsPerMonth = Appointment::select(
            DB::raw("{$monthExpression} as month"),
            DB::raw('count(*) as total'),
            // count(*) filter (where ...) is Postgres-only; SUM(CASE WHEN ...)
            // is the portable equivalent and runs the same on sqlite/MySQL.
            DB::raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
            DB::raw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled"),
            DB::raw("SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled")
        )
            ->whereBetween('appointment_date', [$chartStartDate->format('Y-m-d'), $chartEndDate->format('Y-m-d')])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $evolutionMonthExpression = $this->monthTruncExpression('data_atendimento');

        $evolutionsPerMonth = Evolution::select(
            DB::raw("{$evolutionMonthExpression} as month"),
            DB::raw('count(*) as total')
        )
            ->whereBetween('data_atendimento', [$chartStartDate->format('Y-m-d'), $chartEndDate->format('Y-m-d')])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return Inertia::render('reports/index', [
            'stats' => [
                'totalPatients' => $totalPatients,
                'pilatesCount' => $pilatesCount,
                'physioCount' => $physioCount,
                'totalAppointments' => $totalAppointments,
                'completedAppointments' => $completedAppointments,
                'cancelledAppointments' => $cancelledAppointments,
                'totalEvolutions' => $totalEvolutions,
                'completionRate' => $totalAppointments > 0 ? round(($completedAppointments / $totalAppointments) * 100) : 0,
            ],
            'appointmentsPerMonth' => $appointmentsPerMonth,
            'evolutionsPerMonth' => $evolutionsPerMonth,
            'topPatients' => $topPatients,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * SQL expression that truncates a date column to "YYYY-MM", written for
     * whichever driver is active. to_char() is Postgres-only and breaks
     * outright on sqlite (used in dev/tests), where strftime() is the
     * equivalent; MySQL gets DATE_FORMAT().
     */
    private function monthTruncExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'mysql', 'mariadb' => "DATE_FORMAT({$column}, '%Y-%m')",
            default => "to_char({$column}, 'YYYY-MM')",
        };
    }

    public function pdf(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $appointmentQuery = Appointment::query();
        if ($startDate && $endDate) {
            $appointmentQuery->whereBetween('appointment_date', [$startDate, $endDate]);
        }

        $totalAppointments = $appointmentQuery->count();
        $completedAppointments = (clone $appointmentQuery)->where('status', 'completed')->count();
        $cancelledAppointments = (clone $appointmentQuery)->where('status', 'cancelled')->count();

        $completionRate = $totalAppointments > 0 ? round(($completedAppointments / $totalAppointments) * 100) : 0;

        $pdf = Pdf::loadView('reports.pdf', [
            'startDate' => $startDate ? Carbon::parse($startDate)->format('d/m/Y') : 'Início',
            'endDate' => $endDate ? Carbon::parse($endDate)->format('d/m/Y') : 'Hoje',
            'totalAppointments' => $totalAppointments,
            'completedAppointments' => $completedAppointments,
            'cancelledAppointments' => $cancelledAppointments,
            'completionRate' => $completionRate,
        ]);

        return $pdf->download('relatorio_atendimentos.pdf');
    }
}
