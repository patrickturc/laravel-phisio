<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\RecurringBooking;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * "Agendar horário": books one patient with one professional, either as a
 * fixed weekly slot ("Fixo") or on a single day ("Dia"). Several patients,
 * even of different professionals, share a time slot up to the clinic's
 * capacity per slot.
 */
class RecurringBookingController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        abort_if(! $tenant, 404);

        $validated = $request->validate([
            'mode' => ['required', Rule::in(['fixed', 'single'])],
            'patient_id' => ['required', 'uuid'],
            'user_id' => ['required', 'integer'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['nullable', 'integer', 'min:10', 'max:180'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'day_of_week' => ['nullable', 'required_if:mode,fixed', 'integer', 'between:0,6'],
            'starts_on' => ['nullable', 'required_if:mode,fixed', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'date' => ['nullable', 'required_if:mode,single', 'date'],
        ], [
            'day_of_week.required_if' => 'Escolha o dia da semana.',
            'starts_on.required_if' => 'Informe a partir de quando.',
            'ends_on.after_or_equal' => 'O fim precisa ser depois do início.',
            'date.required_if' => 'Escolha a data.',
        ]);

        // Both are tenant-scoped, so a patient or professional of another
        // clinic is simply not found.
        $patient = Patient::find($validated['patient_id']);
        $professional = User::professionals()->find($validated['user_id']);

        if (! $patient || ! $professional) {
            throw ValidationException::withMessages(array_filter([
                'patient_id' => $patient ? null : 'Escolha um paciente da clínica.',
                'user_id' => $professional ? null : 'Escolha um profissional da clínica.',
            ]));
        }

        $duration = $validated['duration_minutes'] ?? (int) $tenant->scheduleSettings()['default_duration'];

        return $validated['mode'] === 'single'
            ? $this->bookSingleDay($tenant, $patient, $professional, $validated, $duration)
            : $this->bookFixedSlot($tenant, $patient, $professional, $validated, $duration);
    }

    /**
     * End a fixed slot today: its upcoming appointments nobody attended yet
     * are removed, past ones stay in the history.
     */
    public function destroy(RecurringBooking $recurringBooking): RedirectResponse
    {
        $removed = $recurringBooking->endFrom(Carbon::today());

        return back()->with('success', "Horário fixo encerrado. {$removed} aula(s) futura(s) removida(s).");
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function bookSingleDay(Tenant $tenant, Patient $patient, User $professional, array $validated, int $duration): RedirectResponse
    {
        $date = Carbon::parse($validated['date']);
        $time = $validated['start_time'];

        $this->ensureRoom($tenant, $patient, $date->toDateString(), $time);

        DB::transaction(function () use ($patient, $professional, $validated, $date, $time, $duration) {
            $appointment = Appointment::create([
                'user_id' => $professional->id,
                'type' => 'individual',
                'max_participants' => 1,
                'appointment_date' => $date->toDateString(),
                'start_time' => $time,
                'duration_minutes' => $duration,
                'notes' => $validated['notes'] ?? null,
                'status' => 'scheduled',
            ]);

            $appointment->patients()->attach($patient->id, ['status' => 'scheduled']);
        });

        return back()->with('success', "Aula de {$patient->name} agendada para {$date->format('d/m')} às {$time}.");
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function bookFixedSlot(Tenant $tenant, Patient $patient, User $professional, array $validated, int $duration): RedirectResponse
    {
        $time = $validated['start_time'];
        $dayOfWeek = (int) $validated['day_of_week'];

        $duplicate = RecurringBooking::active()
            ->where('patient_id', $patient->id)
            ->where('day_of_week', $dayOfWeek)
            ->get()
            ->contains(fn (RecurringBooking $booking): bool => $booking->startTime() === $time);

        if ($duplicate) {
            throw ValidationException::withMessages([
                'start_time' => "{$patient->name} já tem um horário fixo neste dia e horário.",
            ]);
        }

        $result = DB::transaction(function () use ($tenant, $patient, $professional, $validated, $time, $dayOfWeek, $duration) {
            $booking = RecurringBooking::create([
                'tenant_id' => $tenant->id,
                'patient_id' => $patient->id,
                'user_id' => $professional->id,
                'day_of_week' => $dayOfWeek,
                'start_time' => $time,
                'duration_minutes' => $duration,
                'starts_on' => $validated['starts_on'],
                'ends_on' => $validated['ends_on'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            $result = $booking->generateAppointments();

            // Not a single week fits: don't leave an empty fixed slot behind.
            if ($result['created'] === 0 && ($result['full'] !== [] || $result['busy'] !== [])) {
                throw ValidationException::withMessages([
                    'start_time' => 'Não há vaga neste horário nas próximas semanas.',
                ]);
            }

            return $result;
        });

        $redirect = back()->with('success', "Horário fixo criado: {$result['created']} aula(s) agendada(s) nas próximas semanas.");

        $skipped = array_merge(
            $result['full'] === [] ? [] : ['horário lotado em '.$this->formatDates($result['full'])],
            $result['busy'] === [] ? [] : ['paciente já agendado em '.$this->formatDates($result['busy'])],
        );

        return $skipped === []
            ? $redirect
            : $redirect->with('warning', 'Algumas semanas ficaram de fora: '.implode('; ', $skipped).'.');
    }

    private function ensureRoom(Tenant $tenant, Patient $patient, string $date, string $time): void
    {
        if (Appointment::patientBookedAt($tenant->id, $patient->id, $date, $time)) {
            throw ValidationException::withMessages([
                'start_time' => "{$patient->name} já está agendado(a) neste horário.",
            ]);
        }

        $students = Appointment::studentsInSlot($tenant->id, $date, $time);
        $capacity = $tenant->slotCapacity();

        if ($students >= $capacity) {
            throw ValidationException::withMessages([
                'start_time' => "Horário lotado: {$students}/{$capacity} alunos.",
            ]);
        }
    }

    /**
     * @param  list<string>  $dates
     */
    private function formatDates(array $dates): string
    {
        return collect($dates)->map(fn (string $date): string => Carbon::parse($date)->format('d/m'))->implode(', ');
    }
}
