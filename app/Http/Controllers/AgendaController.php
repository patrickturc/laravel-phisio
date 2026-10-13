<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Data for the agenda grid: one card per student, grouped by day and hour,
 * with the clinic's business hours and the week's indicators.
 */
class AgendaController extends Controller
{
    public function grid(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'view' => ['nullable', 'in:day,week,month'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $tenant = $this->tenant($request);
        $settings = $tenant->scheduleSettings();
        $capacity = (int) $settings['slot_capacity'];
        $view = $validated['view'] ?? 'week';
        $anchor = Carbon::parse($validated['date'] ?? Carbon::today());

        [$start, $end] = match ($view) {
            'day' => [$anchor->copy(), $anchor->copy()],
            'month' => [
                $anchor->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY),
                $anchor->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY),
            ],
            default => [$anchor->copy()->startOfWeek(Carbon::MONDAY), $anchor->copy()->endOfWeek(Carbon::SUNDAY)],
        };

        $appointments = Appointment::with(['patients', 'user', 'groupClass'])
            ->where('appointment_date', '>=', $start->toDateString())
            ->where('appointment_date', '<=', $end->toDateString())
            ->when($validated['user_id'] ?? null, fn ($query, $userId) => $query->where('user_id', $userId))
            ->orderBy('start_time')
            ->get();

        $cells = [];
        $classes = 0;
        $checkins = 0;

        foreach ($appointments as $appointment) {
            $time = substr((string) $appointment->start_time, 0, 5);
            $key = $appointment->appointment_date->toDateString().'|'.substr($time, 0, 2).':00';
            $cells[$key] ??= ['count' => 0, 'students' => []];
            $sessionCancelled = $appointment->status === 'cancelled';

            foreach ($appointment->patients as $patient) {
                $status = $sessionCancelled ? 'cancelled' : ($patient->pivot->status ?? 'scheduled');

                $cells[$key]['students'][] = [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $patient->id,
                    'patient_name' => $patient->name,
                    'nickname' => $patient->nickname,
                    'phone' => $patient->phone,
                    'professional_id' => $appointment->user_id,
                    'professional_name' => $appointment->user?->name,
                    'color' => $appointment->user?->agendaColor() ?? '#64748b',
                    'status' => $status,
                    'missed_justified' => (bool) $patient->pivot->missed_justified,
                    'time' => $time,
                    'duration_minutes' => $appointment->duration_minutes,
                    'type' => $appointment->type,
                    'group_class' => $appointment->groupClass?->name,
                    'room' => $appointment->room,
                    'recurring' => $appointment->recurring_booking_id !== null,
                    'reminded' => $patient->pivot->whatsapp_reminder_at !== null,
                    'confirmed' => $patient->pivot->confirmed_at !== null,
                ];

                if ($status !== 'cancelled') {
                    $cells[$key]['count']++;
                    $classes++;
                }

                if ($status === 'attended') {
                    $checkins++;
                }
            }
        }

        $days = [];
        $openSlots = 0;
        for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
            $hours = $settings['business_hours'][$day->dayOfWeek];
            $days[] = [
                'date' => $day->toDateString(),
                'weekday' => $day->dayOfWeek,
                'closed' => ! $hours['open'],
                'start' => $hours['start'],
                'end' => $hours['end'],
            ];

            if ($hours['open']) {
                $openSlots += $this->openHours($hours['start'], $hours['end'], $settings['breaks']);
            }
        }

        return response()->json([
            'view' => $view,
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'capacity' => $capacity,
            'days' => $days,
            'rows' => $this->rows($days, array_keys($cells)),
            'breaks' => $settings['breaks'],
            'cells' => (object) $cells,
            'stats' => [
                'classes' => $classes,
                'checkins' => $checkins,
                'occupancy' => $openSlots > 0 ? (int) round($classes / ($openSlots * $capacity) * 100) : 0,
            ],
        ]);
    }

    /**
     * Everyone with a class on one day (tomorrow by default), with what is
     * needed to send the WhatsApp reminder and track who confirmed.
     */
    public function reminders(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => ['nullable', 'date']]);

        $tenant = $this->tenant($request);
        $date = Carbon::parse($validated['date'] ?? Carbon::tomorrow())->toDateString();

        $rows = Appointment::with(['patients', 'user'])
            ->where('appointment_date', $date)
            ->where('status', '!=', 'cancelled')
            ->get()
            ->flatMap(fn (Appointment $appointment) => $appointment->patients
                ->reject(fn ($patient): bool => $patient->pivot->status === 'cancelled')
                ->map(fn ($patient): array => [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $patient->id,
                    'patient_name' => $patient->name,
                    'nickname' => $patient->nickname,
                    'phone' => $patient->phone,
                    'time' => substr((string) $appointment->start_time, 0, 5),
                    'professional_name' => $appointment->user?->name,
                    'room' => $appointment->room,
                    'reminded_at' => $patient->pivot->whatsapp_reminder_at,
                    'confirmed_at' => $patient->pivot->confirmed_at,
                ]))
            ->sortBy([['time', 'asc'], ['patient_name', 'asc']])
            ->values();

        return response()->json([
            'date' => $date,
            'rows' => $rows,
            'template' => $tenant->messageTemplates()['reminder'],
            'clinic_name' => $tenant->name,
        ]);
    }

    /**
     * Students already in a time slot, for the booking form.
     */
    public function occupancy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'time' => ['required', 'date_format:H:i'],
        ]);

        $tenant = $this->tenant($request);

        return response()->json([
            'count' => Appointment::studentsInSlot($tenant->id, Carbon::parse($validated['date'])->toDateString(), $validated['time']),
            'capacity' => $tenant->slotCapacity(),
        ]);
    }

    /**
     * Hour rows of the grid: from the earliest opening to the latest closing
     * among the days shown, widened to fit any appointment booked outside
     * business hours so nothing is hidden.
     *
     * @param  list<array{closed: bool, start: string, end: string}>  $days
     * @param  list<string>  $cellKeys  "YYYY-MM-DD|HH:00"
     * @return list<string>
     */
    private function rows(array $days, array $cellKeys): array
    {
        $hours = [];

        foreach ($days as $day) {
            if ($day['closed']) {
                continue;
            }

            $first = (int) substr($day['start'], 0, 2);
            $last = (int) ceil($this->minutes($day['end']) / 60) - 1;
            $hours = [...$hours, ...range($first, max($first, $last))];
        }

        foreach ($cellKeys as $key) {
            $hours[] = (int) substr($key, 11, 2);
        }

        if ($hours === []) {
            $hours = range(7, 19);
        }

        $hours = range(min($hours), max($hours));

        return array_map(fn (int $hour): string => sprintf('%02d:00', $hour), $hours);
    }

    /**
     * Whole hours a day is open for bookings, breaks excluded.
     *
     * @param  list<array{start: string, end: string}>  $breaks
     */
    private function openHours(string $start, string $end, array $breaks): int
    {
        $open = 0;

        for ($minute = $this->minutes($start); $minute + 60 <= $this->minutes($end); $minute += 60) {
            $inBreak = collect($breaks)->contains(
                fn (array $break): bool => $minute >= $this->minutes($break['start']) && $minute < $this->minutes($break['end'])
            );

            if (! $inBreak) {
                $open++;
            }
        }

        return $open;
    }

    private function minutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
    }

    private function tenant(Request $request): Tenant
    {
        $tenant = $request->user()->tenant;

        abort_if(! $tenant, 404);

        return $tenant;
    }
}
