<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Evolution;
use App\Models\FinancialTransaction;
use App\Models\GroupClass;
use App\Models\Membership;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $requestedDate = $request->query('date');

        if (! $requestedDate) {
            $today = now()->toDateString();
            $nextAppointment = Appointment::where('appointment_date', '>=', $today)
                ->orderBy('appointment_date', 'asc')
                ->first();
            $selectedDate = $nextAppointment ? $nextAppointment->appointment_date->format('Y-m-d') : $today;
        } else {
            $selectedDate = $requestedDate;
        }
        $carbon = Carbon::parse($selectedDate);

        // Build the week (Mon-Sun) around the selected date
        $startOfWeek = $carbon->copy()->startOfWeek(Carbon::MONDAY);
        $weekDays = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $startOfWeek->copy()->addDays($i);
            $weekDays[] = [
                'date' => $day->toDateString(),
                'dayName' => $day->locale('pt_BR')->isoFormat('ddd'),
                'dayNumber' => $day->day,
                'isToday' => $day->isToday(),
                'isSelected' => $day->toDateString() === $selectedDate,
            ];
        }

        $totalPatients = Patient::count();

        $dayAppointments = Appointment::with('patients')
            ->whereDate('appointment_date', $selectedDate)
            ->where(function ($query) {
                $query->where('type', '!=', 'group')
                    ->orWhereHas('patients');
            })
            ->orderBy('start_time')
            ->get();

        $pendingEvolutions = Evolution::where('evolucao_status', 'pendente')->count();

        $today = now();
        $nextWeek = now()->addDays(7);

        $upcomingBirthdays = Patient::whereNotNull('birthdate')->get(['id', 'name', 'birthdate'])->filter(function ($patient) use ($today, $nextWeek) {
            $birthdayThisYear = $patient->birthdate->copy()->year($today->year);
            if ($birthdayThisYear->isBefore($today->startOfDay())) {
                $birthdayThisYear->addYear();
            }

            return $birthdayThisYear->between($today->startOfDay(), $nextWeek->endOfDay());
        })->map(function ($patient) use ($today) {
            $birthdayThisYear = $patient->birthdate->copy()->year($today->year);
            if ($birthdayThisYear->isBefore($today->startOfDay())) {
                $birthdayThisYear->addYear();
            }

            return [
                'id' => $patient->id,
                'name' => $patient->name,
                'birthdate' => $patient->birthdate->format('Y-m-d'),
                'isToday' => $birthdayThisYear->isToday(),
                'daysToBirthday' => $today->startOfDay()->diffInDays($birthdayThisYear, false),
                'age_turning' => $birthdayThisYear->year - $patient->birthdate->year,
            ];
        })->sortBy('daysToBirthday')->values();

        $currentMonth = now()->month;
        $currentYear = now()->year;

        $financialSummary = [
            'income' => FinancialTransaction::where('type', 'income')->where('status', 'paid')->whereMonth('date', $currentMonth)->whereYear('date', $currentYear)->sum('amount'),
            'expense' => FinancialTransaction::where('type', 'expense')->where('status', 'paid')->whereMonth('date', $currentMonth)->whereYear('date', $currentYear)->sum('amount'),
            'pending_income' => FinancialTransaction::where('type', 'income')->open()->whereMonth('date', $currentMonth)->whereYear('date', $currentYear)->sum('amount'),
            'pending_expense' => FinancialTransaction::where('type', 'expense')->open()->whereMonth('date', $currentMonth)->whereYear('date', $currentYear)->sum('amount'),
        ];

        // Growth Indicators
        $lastMonth = now()->subMonth();
        $newPatientsThisMonth = Patient::whereMonth('created_at', $currentMonth)->whereYear('created_at', $currentYear)->count();
        $newPatientsLastMonth = Patient::whereMonth('created_at', $lastMonth->month)->whereYear('created_at', $lastMonth->year)->count();

        $revenueThisMonth = $financialSummary['income'];
        $revenueLastMonth = FinancialTransaction::where('type', 'income')->where('status', 'paid')->whereMonth('date', $lastMonth->month)->whereYear('date', $lastMonth->year)->sum('amount');

        $appointmentsThisMonth = Appointment::whereMonth('appointment_date', $currentMonth)->whereYear('appointment_date', $currentYear)->count();
        $completedThisMonth = Appointment::where('status', 'completed')->whereMonth('appointment_date', $currentMonth)->whereYear('appointment_date', $currentYear)->count();
        $completionRateThisMonth = $appointmentsThisMonth > 0 ? round(($completedThisMonth / $appointmentsThisMonth) * 100) : 0;

        $appointmentsLastMonth = Appointment::whereMonth('appointment_date', $lastMonth->month)->whereYear('appointment_date', $lastMonth->year)->count();
        $completedLastMonth = Appointment::where('status', 'completed')->whereMonth('appointment_date', $lastMonth->month)->whereYear('appointment_date', $lastMonth->year)->count();
        $completionRateLastMonth = $appointmentsLastMonth > 0 ? round(($completedLastMonth / $appointmentsLastMonth) * 100) : 0;

        // Active classes whose generated appointments are running low (less
        // than two weeks ahead), so the user can extend them from the dashboard.
        $lowThreshold = now()->addDays(14)->toDateString();
        $classesNeedingExtension = GroupClass::where('status', 'active')
            ->whereHas('schedules')
            ->withMax('appointments', 'appointment_date')
            ->get()
            ->filter(function ($groupClass) use ($lowThreshold) {
                return $groupClass->appointments_max_appointment_date === null
                    || $groupClass->appointments_max_appointment_date < $lowThreshold;
            })
            ->map(function ($groupClass) {
                return [
                    'id' => $groupClass->id,
                    'name' => $groupClass->name,
                    'color' => $groupClass->color,
                    'last_appointment_date' => $groupClass->appointments_max_appointment_date,
                ];
            })
            ->values();

        $activeMemberships = Membership::where('status', 'active')->count();
        $expiringMemberships = Membership::where('status', 'active')->where('end_date', '<=', now()->addDays(7))->where('end_date', '>=', now())->count();

        $calcChange = fn ($current, $previous) => $previous > 0 ? round((($current - $previous) / $previous) * 100) : ($current > 0 ? 100 : 0);

        $growthIndicators = [
            'newPatients' => ['current' => $newPatientsThisMonth, 'change' => $calcChange($newPatientsThisMonth, $newPatientsLastMonth)],
            'revenue' => ['current' => $revenueThisMonth, 'change' => $calcChange($revenueThisMonth, $revenueLastMonth)],
            'completionRate' => ['current' => $completionRateThisMonth, 'change' => $completionRateThisMonth - $completionRateLastMonth],
            'activeMemberships' => ['current' => $activeMemberships, 'expiring' => $expiringMemberships],
        ];

        return Inertia::render('dashboard', [
            'totalPatients' => $totalPatients,
            'dayAppointments' => $dayAppointments,
            'dayCount' => $dayAppointments->count(),
            'pendingEvolutions' => $pendingEvolutions,
            'upcomingBirthdays' => $upcomingBirthdays,
            'selectedDate' => $selectedDate,
            'weekDays' => $weekDays,
            'weekLabel' => $startOfWeek->locale('pt_BR')->isoFormat('D [de] MMM').' — '.$startOfWeek->copy()->addDays(6)->locale('pt_BR')->isoFormat('D [de] MMM, YYYY'),
            'financialSummary' => $financialSummary,
            'growthIndicators' => $growthIndicators,
            'classesNeedingExtension' => $classesNeedingExtension,
        ]);
    }
}
