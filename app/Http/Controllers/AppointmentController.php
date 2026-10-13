<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicalProtocol;
use App\Models\GroupClass;
use App\Models\GroupClassSchedule;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Appointment::with('patients')
            ->orderBy('appointment_date', 'desc')
            ->orderBy('start_time');

        if ($request->filled('date_from')) {
            $query->where('appointment_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('appointment_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('patients', function ($sub) use ($request) {
                    $sub->whereLike('name', '%'.$request->search.'%');
                })->orWhereLike('title', '%'.$request->search.'%');
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $appointments = $query->paginate(15)->withQueryString();

        $patients = Patient::orderBy('name')->get(['id', 'name']);
        $groupClasses = GroupClass::orderBy('name')->get(['id', 'name', 'color', 'max_participants']);
        // Only users flagged as treating professionals (permission-based, so it
        // survives renaming the role) can be the "Profissional Responsável".
        $users = User::professionals()->orderBy('name')->get(['id', 'name', 'agenda_color'])
            ->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name, 'color' => $user->agendaColor()]);

        return Inertia::render('appointments/index', [
            'appointments' => $appointments,
            'filters' => $request->only(['date_from', 'date_to', 'search', 'user_id']),
            'patients' => $patients,
            'groupClasses' => $groupClasses,
            'users' => $users,
            'scheduleSettings' => $request->user()->tenant?->scheduleSettings() ?? Tenant::DEFAULT_SCHEDULE_SETTINGS,
        ]);
    }

    public function create(Request $request)
    {
        return redirect()->route('appointments.index', [
            'create' => 'true',
            'patient_id' => $request->query('patient_id'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_ids' => 'required|array',
            'patient_ids.*' => 'uuid|exists:patients,id',
            'type' => 'required|in:individual,group',
            'group_class_id' => 'nullable|required_if:type,group|uuid|exists:group_classes,id',
            'title' => 'nullable|string|max:255',
            'max_participants' => 'required|integer|min:1',
            'appointment_date' => 'required|date',
            'start_time' => 'required',
            'duration_minutes' => 'required|integer|min:10|max:180',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|in:scheduled,completed,cancelled',
            'is_recurring' => 'nullable|boolean',
            'recurrence_end_date' => 'nullable|required_if:is_recurring,true|date|after_or_equal:appointment_date',
        ]);

        if (count($validated['patient_ids']) > $validated['max_participants']) {
            return back()->withErrors(['patient_ids' => 'O número de alunos excede a capacidade máxima da turma.'])->withInput();
        }

        // Validate memberships
        $invalidPatients = [];
        $exhaustedPatients = [];
        foreach ($validated['patient_ids'] as $patientId) {
            $patient = Patient::find($patientId);
            $activeMembership = Membership::where('patient_id', $patientId)
                ->where('status', 'active')
                ->where('end_date', '>=', now()->startOfDay())
                ->whereHas('commercialPlan', function ($q) {
                    $q->whereIn('category', ['pilates', 'teste']);
                })
                ->with('commercialPlan')
                ->first();

            if (! $activeMembership && $validated['type'] === 'group') {
                $invalidPatients[] = $patient->name;
            } elseif ($activeMembership && $activeMembership->sessions_remaining_this_month === 0) {
                $exhaustedPatients[] = $patient->name;
            }
        }

        if (count($invalidPatients) > 0) {
            $names = implode(', ', $invalidPatients);

            return back()->withErrors(['patient_ids' => "Os seguintes pacientes não possuem um plano ativo de Pilates ou Aula Teste: $names."])->withInput();
        }

        $userId = $request->user_id ?? auth()->id();
        $isRecurring = $request->boolean('is_recurring');
        $endDate = $isRecurring ? Carbon::parse($validated['recurrence_end_date']) : Carbon::parse($validated['appointment_date']);
        $currentDate = Carbon::parse($validated['appointment_date']);

        $createdCount = 0;
        $conflictCount = 0;
        $overlapCount = 0;

        DB::beginTransaction();
        try {
            while ($currentDate->lessThanOrEqualTo($endDate)) {
                $dateString = $currentDate->format('Y-m-d');

                // The time slot's capacity is what blocks a booking now; the
                // same professional seeing several patients at once is allowed
                // and only flagged.
                $conflictMessage = $this->slotConflict(
                    $request,
                    $dateString,
                    $validated['start_time'],
                    $validated['patient_ids'],
                );

                if ($this->hasOverlappingAppointment($dateString, $userId, $validated['start_time'], (int) $validated['duration_minutes'])) {
                    $overlapCount++;
                }

                if ($conflictMessage !== null) {
                    if ($createdCount === 0 && ! $isRecurring) {
                        DB::rollBack();

                        return back()->withErrors(['start_time' => $conflictMessage])->withInput();
                    }
                    $conflictCount++;
                } else {
                    $appointment = Appointment::create([
                        'title' => $validated['title'],
                        'type' => $validated['type'],
                        'group_class_id' => $validated['group_class_id'] ?? null,
                        'max_participants' => $validated['max_participants'],
                        'appointment_date' => $dateString,
                        'start_time' => $validated['start_time'],
                        'duration_minutes' => $validated['duration_minutes'],
                        'notes' => $validated['notes'],
                        'status' => $validated['status'] ?? 'scheduled',
                        'user_id' => $userId,
                    ]);

                    foreach ($validated['patient_ids'] as $patientId) {
                        $appointment->patients()->attach($patientId, ['status' => 'scheduled']);
                    }

                    $createdCount++;
                }

                $currentDate->addWeek();
                if (! $isRecurring) {
                    break;
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        $message = 'Agendamento criado com sucesso!';
        if ($isRecurring) {
            $message = "Foram criados $createdCount agendamentos.";
            if ($conflictCount > 0) {
                $message .= " Atenção: $conflictCount agendamento(s) ignorados por horário lotado ou paciente já agendado.";
            }
        }

        $warnings = [];
        if (count($exhaustedPatients) > 0) {
            $names = implode(', ', $exhaustedPatients);
            $warnings[] = "⚠️ Cota mensal de aulas já atingida: $names. Esta é uma aula extra (fora da cota do plano).";
        }
        if ($overlapCount > 0) {
            $warnings[] = 'O profissional já tem outro atendimento no mesmo horário.';
        }

        $redirect = redirect()->route('appointments.index')->with('success', $message);

        return $warnings ? $redirect->with('warning', implode(' ', $warnings)) : $redirect;
    }

    public function details(Appointment $appointment)
    {
        $appointment->load('patients');

        return response()->json($appointment);
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'appointment_date' => 'required|date',
            'start_time' => 'required',
            'update_mode' => 'nullable|in:single,future',
        ]);

        $updateMode = $validated['update_mode'] ?? 'single';
        $newDate = Carbon::parse($validated['appointment_date']);
        $newTime = substr($validated['start_time'], 0, 5);

        if ($updateMode === 'future' && $appointment->recurring_booking_id) {
            return $this->rescheduleRecurringBooking($request, $appointment, $newDate, $newTime);
        }

        if ($updateMode === 'future' && $appointment->type === 'group' && $appointment->group_class_id) {
            DB::beginTransaction();
            try {
                $oldDate = $appointment->appointment_date;
                $oldTime = $appointment->start_time;
                $oldDayOfWeek = Carbon::parse($oldDate)->dayOfWeek; // 0 (Sun) - 6 (Sat)

                $newDateObj = Carbon::parse($validated['appointment_date']);
                $newDayOfWeek = $newDateObj->dayOfWeek;
                $newTime = $validated['start_time'];

                $daysDiff = Carbon::parse($oldDate)->startOfDay()->diffInDays($newDateObj->startOfDay(), false);

                // Prefer matching by the originating schedule slot (robust);
                // fall back to weekday/time matching for legacy appointments.
                if ($appointment->schedule_id) {
                    $futureAppointments = Appointment::where('schedule_id', $appointment->schedule_id)
                        ->where('appointment_date', '>=', $oldDate->format('Y-m-d'))
                        ->get();
                } else {
                    $futureAppointments = Appointment::where('group_class_id', $appointment->group_class_id)
                        ->where('appointment_date', '>=', $oldDate->format('Y-m-d'))
                        ->where('start_time', $oldTime)
                        ->get()
                        ->filter(function ($appt) use ($oldDayOfWeek) {
                            return Carbon::parse($appt->appointment_date)->dayOfWeek === $oldDayOfWeek;
                        });
                }

                foreach ($futureAppointments as $appt) {
                    $shiftedDate = Carbon::parse($appt->appointment_date)->addDays($daysDiff);
                    $appt->update([
                        'appointment_date' => $shiftedDate->format('Y-m-d'),
                        'start_time' => $newTime,
                    ]);
                }

                // Update the originating schedule slot directly when known.
                $schedule = $appointment->schedule_id
                    ? GroupClassSchedule::find($appointment->schedule_id)
                    : GroupClass::find($appointment->group_class_id)?->schedules()
                        ->where('day_of_week', $oldDayOfWeek)
                        ->where(function ($q) use ($oldTime) {
                            $q->where('start_time', $oldTime)
                                ->orWhere('start_time', $oldTime.':00');
                        })->first();

                if ($schedule) {
                    $schedule->update([
                        'day_of_week' => $newDayOfWeek,
                        'start_time' => $newTime,
                    ]);
                }

                DB::commit();

                return response()->json(['success' => true]);
            } catch (\Exception $e) {
                DB::rollBack();

                return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
            }
        }

        // Default single update
        $conflictMessage = $this->slotConflict(
            $request,
            $newDate->toDateString(),
            $newTime,
            $appointment->patients()->wherePivot('status', '!=', 'cancelled')->pluck('patients.id')->all(),
            $appointment->id,
        );

        if ($conflictMessage !== null) {
            return response()->json(['success' => false, 'message' => $conflictMessage], 422);
        }

        $appointment->update([
            'appointment_date' => $newDate->toDateString(),
            'start_time' => $newTime,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Move a fixed slot from this week on: its upcoming appointments shift by
     * the same number of days to the new time, and the slot itself follows,
     * so the weeks generated next land on the new day. Nothing moves unless
     * every target slot has room.
     */
    private function rescheduleRecurringBooking(Request $request, Appointment $appointment, Carbon $newDate, string $newTime)
    {
        $booking = $appointment->recurringBooking;
        $daysDiff = (int) $appointment->appointment_date->copy()->startOfDay()->diffInDays($newDate->copy()->startOfDay(), false);

        $upcoming = $booking->appointments()
            ->where('appointment_date', '>=', $appointment->appointment_date->toDateString())
            ->where('status', 'scheduled')
            ->orderBy('appointment_date')
            ->get();

        $full = $upcoming
            ->filter(fn (Appointment $a): bool => $this->slotConflict(
                $request,
                $a->appointment_date->copy()->addDays($daysDiff)->toDateString(),
                $newTime,
                [$booking->patient_id],
                $a->id,
            ) !== null)
            ->map(fn (Appointment $a): string => $a->appointment_date->copy()->addDays($daysDiff)->format('d/m'));

        if ($full->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Sem vaga no novo horário em: '.$full->implode(', ').'.',
            ], 422);
        }

        DB::transaction(function () use ($upcoming, $booking, $daysDiff, $newDate, $newTime) {
            foreach ($upcoming as $a) {
                $target = $a->appointment_date->copy()->addDays($daysDiff)->toDateString();
                $a->update([
                    'appointment_date' => $target,
                    'recurrence_date' => $target,
                    'start_time' => $newTime,
                ]);
            }

            // The new day and time hold from the first moved week on, so the
            // generator doesn't also fill the new weekday before that week.
            $booking->update([
                'day_of_week' => $newDate->dayOfWeek,
                'start_time' => $newTime,
                'starts_on' => $newDate->toDateString(),
            ]);
        });

        return response()->json(['success' => true]);
    }

    /**
     * Why these patients can't take this date and time, or null when they
     * can: one of them is already booked then, or the slot has no room left.
     *
     * @param  list<string>  $patientIds
     */
    private function slotConflict(
        Request $request,
        string $date,
        string $startTime,
        array $patientIds,
        ?string $exceptAppointmentId = null,
    ): ?string {
        $tenant = $request->user()->tenant;

        if (! $tenant) {
            return null;
        }

        foreach ($patientIds as $patientId) {
            if (Appointment::patientBookedAt($tenant->id, $patientId, $date, $startTime, $exceptAppointmentId)) {
                $name = Patient::find($patientId)?->name ?? 'O paciente';

                return "{$name} já está agendado(a) neste horário.";
            }
        }

        $capacity = $tenant->slotCapacity();
        $students = Appointment::studentsInSlot($tenant->id, $date, $startTime, $exceptAppointmentId);

        if ($students + count($patientIds) > $capacity) {
            return "Horário lotado: {$students}/{$capacity} alunos.";
        }

        return null;
    }

    public function show(Appointment $appointment)
    {
        $appointment->load('patients');
        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name']);
        $patients = Patient::orderBy('name')->get(['id', 'name']);
        // Only users flagged as treating professionals (permission-based, so it
        // survives renaming the role) can be the "Profissional Responsável".
        $users = User::professionals()->orderBy('name')->get(['id', 'name']);
        $groupClasses = GroupClass::orderBy('name')->get(['id', 'name', 'color', 'max_participants']);

        return Inertia::render('appointments/show', [
            'appointment' => $appointment,
            'protocols' => $protocols,
            'patients' => $patients,
            'users' => $users,
            'groupClasses' => $groupClasses,
        ]);
    }

    public function edit(Appointment $appointment)
    {
        $appointment->load('patients');
        $patients = Patient::orderBy('name')->get(['id', 'name']);

        return Inertia::render('appointments/edit', [
            'appointment' => $appointment,
            'patients' => $patients,
        ]);
    }

    public function update(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'patient_ids' => 'required|array',
            'patient_ids.*' => 'uuid|exists:patients,id',
            'type' => 'required|in:individual,group',
            'group_class_id' => 'nullable|required_if:type,group|uuid|exists:group_classes,id',
            'title' => 'nullable|string|max:255',
            'max_participants' => 'required|integer|min:1',
            'appointment_date' => 'required|date',
            'start_time' => 'required',
            'duration_minutes' => 'required|integer|min:10|max:180',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|in:scheduled,completed,cancelled',
        ]);

        if (count($validated['patient_ids']) > $validated['max_participants']) {
            return back()->withErrors(['patient_ids' => 'O número de alunos excede a capacidade máxima da turma.'])->withInput();
        }

        // Validate memberships
        $invalidPatients = [];
        foreach ($validated['patient_ids'] as $patientId) {
            $patient = Patient::find($patientId);
            $hasActivePlan = Membership::where('patient_id', $patientId)
                ->where('status', 'active')
                ->where('end_date', '>=', now()->startOfDay())
                ->whereHas('commercialPlan', function ($q) {
                    $q->whereIn('category', ['pilates', 'teste']);
                })->exists();

            if (! $hasActivePlan && $validated['type'] === 'group') {
                $invalidPatients[] = $patient->name;
            }
        }

        if (count($invalidPatients) > 0) {
            $names = implode(', ', $invalidPatients);

            return back()->withErrors(['patient_ids' => "Os seguintes pacientes não possuem um plano ativo de Pilates ou Aula Teste: $names."])->withInput();
        }

        $userId = $request->user_id ?? auth()->id();

        $conflictMessage = $this->slotConflict(
            $request,
            Carbon::parse($validated['appointment_date'])->toDateString(),
            $validated['start_time'],
            $validated['patient_ids'],
            $appointment->id,
        );

        if ($conflictMessage !== null) {
            return back()->withErrors(['start_time' => $conflictMessage])->withInput();
        }

        $overlap = $this->hasOverlappingAppointment(
            $validated['appointment_date'],
            $userId,
            $validated['start_time'],
            (int) $validated['duration_minutes'],
            $appointment->id,
        );

        $newStatus = $validated['status'] ?? $appointment->status;
        $statusChanged = $newStatus !== $appointment->status;

        DB::beginTransaction();
        try {
            $appointment->update([
                'title' => $validated['title'],
                'type' => $validated['type'],
                'group_class_id' => $validated['group_class_id'] ?? null,
                'max_participants' => $validated['max_participants'],
                'appointment_date' => $validated['appointment_date'],
                'start_time' => $validated['start_time'],
                'duration_minutes' => $validated['duration_minutes'],
                'notes' => $validated['notes'],
                'status' => $newStatus,
                'user_id' => $userId,
            ]);

            // Sync patients. Keep status of existing ones, set 'scheduled' for new ones.
            $existingPivots = $appointment->patients()->pluck('status', 'patient_id')->toArray();
            $syncData = [];
            foreach ($validated['patient_ids'] as $pId) {
                $syncData[$pId] = ['status' => $existingPivots[$pId] ?? 'scheduled'];
            }
            $appointment->patients()->sync($syncData);

            // Cascade a session status change (e.g. cancelling from the sheet) to
            // the per-patient attendance, mirroring updateAppointmentStatus.
            if ($statusChanged) {
                $this->cascadeSessionStatus($appointment, $newStatus);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        $redirect = redirect()->route('appointments.show', $appointment)
            ->with('success', 'Agendamento atualizado!');

        return $overlap
            ? $redirect->with('warning', 'O profissional já tem outro atendimento no mesmo horário.')
            : $redirect;
    }

    public function updateStatus(Request $request, Appointment $appointment, $patientId)
    {
        $validated = $request->validate([
            'status' => 'required|in:scheduled,attended,missed,cancelled',
            // Only meaningful when status is "missed".
            'justified' => 'nullable|boolean',
            'reason' => 'nullable|string|max:1000|required_if:justified,true',
        ], [
            'reason.required_if' => 'Descreva o motivo da falta justificada.',
        ]);

        if (! $appointment->patients()->whereKey($patientId)->exists()) {
            return back()->withErrors(['status' => 'Paciente não pertence a este agendamento.']);
        }

        $status = $validated['status'];
        $pivot = ['status' => $status];

        if ($status === 'missed') {
            $justified = (bool) ($validated['justified'] ?? false);
            $pivot['missed_justified'] = $justified;
            $pivot['missed_reason'] = $justified ? ($validated['reason'] ?? null) : null;
            // A justified miss stays "free" (does not consume the month's quota,
            // so it is not linked to the plan). An unjustified miss consumes a
            // session, so we link it to the active membership like an attendance.
            $pivot['membership_id'] = $justified
                ? null
                : Membership::activeForAttendance($patientId, $appointment->appointment_date->toDateString())?->id;
        } else {
            // Leaving the missed state clears its annotations.
            $pivot['missed_justified'] = null;
            $pivot['missed_reason'] = null;
            $pivot['membership_id'] = $this->membershipToConsume($status, $patientId, $appointment);
        }

        $appointment->patients()->updateExistingPivot($patientId, $pivot);

        return back()->with('success', 'Status atualizado com sucesso.');
    }

    /**
     * Update the session-level status (scheduled | completed | cancelled) and
     * cascade a sensible per-patient attendance change.
     */
    public function updateAppointmentStatus(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'status' => 'required|in:scheduled,completed,cancelled',
        ]);

        DB::transaction(function () use ($appointment, $validated) {
            $appointment->update(['status' => $validated['status']]);
            $this->cascadeSessionStatus($appointment, $validated['status']);
        });

        return back()->with('success', 'Status da sessão atualizado.');
    }

    /**
     * Cascade a session-level status change to the per-patient pivots. Patients
     * still "scheduled" inherit the session outcome; explicit attended / missed /
     * cancelled marks already set per patient are preserved.
     */
    /**
     * Whether an appointment for this professional would overlap an existing
     * one on the same date. Written driver-agnostically (plain PHP/Carbon
     * instead of Postgres-only ::time/::interval casts) so it behaves the same
     * on sqlite (tests, local dev) and Postgres (production).
     */
    private function hasOverlappingAppointment(
        string $date,
        $userId,
        string $start,
        int $durationMinutes,
        ?string $excludeAppointmentId = null,
    ): bool {
        $end = Carbon::parse($start)->addMinutes($durationMinutes)->format('H:i');

        return Appointment::where('appointment_date', $date)
            ->where('user_id', $userId)
            ->where('status', '!=', 'cancelled')
            ->when($excludeAppointmentId, fn ($q) => $q->where('id', '!=', $excludeAppointmentId))
            // Narrows candidates in SQL (existing start before our end); the
            // exact overlap test still needs duration_minutes added in PHP.
            ->where('start_time', '<', $end)
            ->get(['start_time', 'duration_minutes'])
            ->contains(function (Appointment $existing) use ($start) {
                $existingEnd = Carbon::parse($existing->start_time)
                    ->addMinutes($existing->duration_minutes)
                    ->format('H:i');

                return $existingEnd > $start;
            });
    }

    private function cascadeSessionStatus(Appointment $appointment, string $status): void
    {
        if ($status === 'completed') {
            $appointment->patients()->wherePivot('status', 'scheduled')->each(
                fn ($patient) => $appointment->patients()->updateExistingPivot($patient->id, [
                    'status' => 'attended',
                    'membership_id' => $this->membershipToConsume('attended', $patient->id, $appointment),
                ])
            );
        } elseif ($status === 'cancelled') {
            $appointment->patients()->wherePivot('status', 'scheduled')->each(
                fn ($patient) => $appointment->patients()->updateExistingPivot($patient->id, [
                    'status' => 'cancelled',
                    'membership_id' => null,
                ])
            );
        }
    }

    /**
     * Resolve which membership an attendance consumes. Returns null unless the
     * patient is being marked "attended" and has an active membership covering
     * the appointment date.
     */
    private function membershipToConsume(string $status, string $patientId, Appointment $appointment): ?string
    {
        if ($status !== 'attended') {
            return null;
        }

        return Membership::activeForAttendance($patientId, $appointment->appointment_date->toDateString())?->id;
    }

    public function destroy(Request $request, Appointment $appointment)
    {
        $deleteMode = $request->query('delete_mode', 'single');

        // Fixed slots: "this and the next ones" ends the slot; a single week
        // is cancelled rather than deleted so the generator doesn't recreate it.
        if ($appointment->recurring_booking_id) {
            if ($deleteMode === 'future') {
                $removed = $appointment->recurringBooking->endFrom($appointment->appointment_date);

                return back()->with('success', "Horário fixo encerrado: {$removed} aula(s) removida(s).");
            }

            DB::transaction(function () use ($appointment) {
                $appointment->update(['status' => 'cancelled']);
                $this->cascadeSessionStatus($appointment, 'cancelled');
            });

            return back()->with('success', 'Aula desta semana cancelada. O horário fixo continua.');
        }

        if ($deleteMode === 'future') {
            // Delete this and all future scheduled appointments
            // Bind the plain date string, not the Carbon instance: Laravel's
            // query-binding layer formats a DateTimeInterface value with its
            // own datetime format ("Y-m-d H:i:s"), which no longer matches a
            // date-only stored value and would silently drop same-day rows.
            $query = Appointment::where('appointment_date', '>=', $appointment->appointment_date->toDateString())
                ->where('status', 'scheduled');

            if ($appointment->group_class_id) {
                // For group classes: delete all future of the same group class
                $query->where('group_class_id', $appointment->group_class_id);
            } else {
                // No group class link (individual sessions OR orphaned group
                // appointments left over from a deleted class): match the same
                // type, start_time and overlapping patients on the same weekday.
                $patientIds = $appointment->patients()->pluck('patients.id')->toArray();
                $query->where('type', $appointment->type)
                    ->where('start_time', $appointment->start_time)
                    ->whereHas('patients', function ($q) use ($patientIds) {
                        $q->whereIn('patients.id', $patientIds);
                    });
            }

            $toDelete = $query->get();

            // Filter by day of week for individual appointments to be safe
            if (! $appointment->group_class_id) {
                $dayOfWeek = Carbon::parse($appointment->appointment_date)->dayOfWeek;
                $toDelete = $toDelete->filter(function ($app) use ($dayOfWeek) {
                    return Carbon::parse($app->appointment_date)->dayOfWeek === $dayOfWeek;
                });
            }
            $count = $toDelete->count();

            foreach ($toDelete as $app) {
                $app->patients()->detach();
                $app->delete();
            }

            return redirect()->route('appointments.index')
                ->with('success', "✅ {$count} agendamentos excluídos!");
        }

        // Single delete
        $appointment->patients()->detach();
        $appointment->delete();

        return redirect()->route('appointments.index')
            ->with('success', 'Agendamento excluído!');
    }
}
