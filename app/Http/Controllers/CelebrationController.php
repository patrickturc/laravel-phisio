<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class CelebrationController extends Controller
{
    /**
     * Birthdays or enrollment anniversaries of one month, plus the clinic's
     * message templates for congratulating patients on WhatsApp.
     */
    public function index(Request $request): Response
    {
        $tab = $request->query('tab') === 'enrollment' ? 'enrollment' : 'birthdays';
        $month = (int) $request->query('month', (string) now()->month);
        if ($month < 1 || $month > 12) {
            $month = now()->month;
        }

        $patients = $this->celebrationsOf($tab === 'enrollment' ? 'enrollment_date' : 'birthdate');

        // An enrollment anniversary only counts from the first full year.
        if ($tab === 'enrollment') {
            $patients = $patients->filter(fn (array $row): bool => $row['years'] >= 1);
        }

        $monthCounts = array_fill(1, 12, 0);
        foreach ($patients as $row) {
            $monthCounts[$row['month']]++;
        }

        $rows = $patients
            ->where('month', $month)
            ->sortBy([['day', 'asc'], ['name', 'asc']])
            ->map(fn (array $row): array => collect($row)->except('month')->all())
            ->values();

        $tenant = $request->user()->tenant;

        return Inertia::render('celebrations/index', [
            'tab' => $tab,
            'month' => $month,
            'currentMonth' => now()->month,
            'rows' => $rows,
            'monthCounts' => array_values($monthCounts),
            'templates' => $tenant?->messageTemplates() ?? Tenant::DEFAULT_MESSAGE_TEMPLATES,
            'clinicName' => $tenant?->name ?? config('app.name'),
        ]);
    }

    /**
     * Every patient with the given date filled in, with the month, day and
     * how many years it completes this year. Filtering by month happens in
     * PHP because extracting a month differs between sqlite and Postgres,
     * and a clinic's patient list is small.
     *
     * @return Collection<int, array{id: string, name: string, nickname: ?string, phone: ?string, month: int, day: int, years: int}>
     */
    private function celebrationsOf(string $column): Collection
    {
        $year = now()->year;

        return Patient::whereNotNull($column)
            ->orderBy('name')
            ->get(['id', 'name', 'nickname', 'phone', $column])
            ->map(fn (Patient $patient): array => [
                'id' => $patient->id,
                'name' => $patient->name,
                'nickname' => $patient->nickname,
                'phone' => $patient->phone,
                'month' => $patient->{$column}->month,
                'day' => $patient->{$column}->day,
                'years' => $year - $patient->{$column}->year,
            ]);
    }
}
