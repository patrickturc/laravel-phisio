<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\ClinicalProtocol;
use App\Models\GroupClass;
use App\Models\GroupClassSchedule;
use App\Models\Membership;
use App\Models\Patient;
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
                    $sub->where('name', 'ilike', '%'.$request->search.'%');
                })->orWhere('title', 'ilike', '%'.$request->search.'%');
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
        $users = User::permission('professional.attend')->orderBy('name')->get(['id', 'name']);

        return Inertia::render('appointments/index', [
            'appointments' => $appointments,
            'filters' => $request->only(['date_from', 'date_to', 'search', 'user_id']),
            'patients' => $patients,
            'groupClasses' => $groupClasses,
            'users' => $users,
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

        DB::beginTransaction();
        try {
            while ($currentDate->lessThanOrEqualTo($endDate)) {
                $dateString = $currentDate->format('Y-m-d');

                // Check for schedule conflict (same user_id overlapping times)
                $conflict = Appointment::where('appointment_date', $dateString)
                    ->where('user_id', $userId)
                    ->where('status', '!=', 'cancelled')
                    ->where(function ($query) use ($validated) {
                        $start = $validated['start_time'];
                        $end = date('H:i', strtotime($start) + ($validated['duration_minutes'] * 60));
                        $query->where(function ($q) use ($start, $end) {
                            $q->where('start_time', '<', $end)
                                ->whereRaw("start_time::time + (duration_minutes || ' minutes')::interval > ?::time", [$start]);
                        });
                    })->exists();

                // Guard against duplicates (e.g. re-submitting a recurring
                // series): the same patient already booked at that date/time.
                $patientAlreadyBooked = Appointment::where('appointment_date', $dateString)
                    ->where('start_time', $validated['start_time'])
                    ->where('status', '!=', 'cancelled')
                    ->whereHas('patients', function ($q) use ($validated) {
                        $q->whereIn('patients.id', $validated['patient_ids']);
                    })->exists();

                $conflict = $conflict || $patientAlreadyBooked;

                if ($conflict) {
                    if ($createdCount === 0 && ! $isRecurring) {
                        DB::rollBack();

                        return back()->withErrors(['start_time' => 'Já existe um agendamento neste horário.'])->withInput();
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
                $message .= " Atenção: $conflictCount agendamento(s) ignorados devido a conflito de horário.";
            }
        }

        $redirect = redirect()->route('appointments.index')->with('success', $message);

        if (count($exhaustedPatients) > 0) {
            $names = implode(', ', $exhaustedPatients);
            $redirect->with('warning', "⚠️ Cota mensal de aulas já atingida: $names. Esta é uma aula extra (fora da cota do plano).");
        }

        return $redirect;
    }

    public function events(Request $request)
    {
        $query = Appointment::with(['patients', 'groupClass']);

        if ($request->filled('start')) {
            $query->where('appointment_date', '>=', substr($request->start, 0, 10));
        }

        if ($request->filled('end')) {
            $query->where('appointment_date', '<', substr($request->end, 0, 10));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $appointments = $query->get();

        $events = $appointments->map(function ($app) {
            $start_datetime = $app->appointment_date->format('Y-m-d').'T'.$app->start_time;
            $end_datetime = date('Y-m-d\TH:i:s', strtotime($start_datetime) + ($app->duration_minutes * 60));

            // Use the group class color if available, otherwise default purple for group / blue for individual
            if ($app->type === 'group' && $app->groupClass) {
                $bgColor = $app->groupClass->color ?: '#8b5cf6';
            } else {
                $bgColor = $app->type === 'group' ? '#8b5cf6' : '#3b82f6';
            }

            $title = $app->title;
            if (! $title && $app->patients->count() > 0) {
                $title = $app->patients->first()->name;
                if ($app->patients->count() > 1) {
                    $title .= ' + '.($app->patients->count() - 1);
                }
            }

            return [
                'id' => $app->id,
                'title' => $title ?: 'Agendamento',
                'start' => $start_datetime,
                'end' => $end_datetime,
                'backgroundColor' => $bgColor,
                'borderColor' => 'transparent',
                'extendedProps' => [
                    'type' => $app->type,
                    'status' => $app->status,
                    'patient_count' => $app->patients->count(),
                    'max_participants' => $app->max_participants,
                    'patient_names' => $app->patients->pluck('name')->values(),
                ],
            ];
        });

        return response()->json($events);
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
        $appointment->update([
            'appointment_date' => $validated['appointment_date'],
            'start_time' => $validated['start_time'],
        ]);

        return response()->json(['success' => true]);
    }

    public function show(Appointment $appointment)
    {
        $appointment->load('patients');
        $protocols = ClinicalProtocol::orderBy('name')->get(['id', 'name']);
        $patients = Patient::orderBy('name')->get(['id', 'name']);
        // Only users flagged as treating professionals (permission-based, so it
        // survives renaming the role) can be the "Profissional Responsável".
        $users = User::permission('professional.attend')->orderBy('name')->get(['id', 'name']);
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

        // Check for schedule conflict
        $conflict = Appointment::where('appointment_date', $validated['appointment_date'])
            ->where('id', '!=', $appointment->id)
            ->where('user_id', $userId)
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($validated) {
                $start = $validated['start_time'];
                $end = date('H:i', strtotime($start) + ($validated['duration_minutes'] * 60));
                $query->where(function ($q) use ($start, $end) {
                    $q->where('start_time', '<', $end)
                        ->whereRaw("start_time::time + (duration_minutes || ' minutes')::interval > ?::time", [$start]);
                });
            })->exists();

        if ($conflict) {
            return back()->withErrors(['start_time' => 'Já existe um agendamento neste horário.'])->withInput();
        }

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

        return redirect()->route('appointments.show', $appointment)
            ->with('success', 'Agendamento atualizado!');
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

        if ($deleteMode === 'future') {
            // Delete this and all future scheduled appointments
            $query = Appointment::where('appointment_date', '>=', $appointment->appointment_date)
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

    /**
     * Return appointments formatted for the slots/vagas table view.
     * Time rows are derived from GroupClassSchedule definitions so that
     * every configured class time appears even when no appointment exists yet.
     */
    public function slotsView(Request $request)
    {
        $startDate = $request->filled('start_date')
            ? Carbon::parse($request->start_date)->startOfWeek(Carbon::MONDAY)
            : Carbon::now()->startOfWeek(Carbon::MONDAY);

        $endDate = $startDate->copy()->endOfWeek(Carbon::SATURDAY);

        $userId = $request->input('user_id');

        // 1. Load all active group class schedules with their class info
        $schedules = GroupClassSchedule::with(['groupClass' => function ($q) {
            $q->withTrashed(); // include soft-deleted so we don't break existing slots
        }])
            ->whereHas('groupClass', function ($q) use ($userId) {
                $q->where('status', 'active')->withTrashed();
                if ($userId) {
                    $q->where('user_id', $userId);
                }
            })
            ->orderBy('start_time')
            ->get();

        // 2. Load all appointments for the week (to match against schedules)
        $appointments = Appointment::with(['patients', 'groupClass'])
            ->where('appointment_date', '>=', $startDate->format('Y-m-d'))
            ->where('appointment_date', '<=', $endDate->format('Y-m-d'))
            ->where('status', '!=', 'cancelled')
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->orderBy('start_time')
            ->get();

        // Index appointments by date+time for fast lookup
        $appointmentIndex = [];
        foreach ($appointments as $app) {
            $key = $app->appointment_date->format('Y-m-d').'|'.substr($app->start_time, 0, 5);
            $appointmentIndex[$key][] = $app;
        }

        // 3. Build slots: iterate each day, find matching schedules by day_of_week
        $slots = [];

        for ($day = $startDate->copy(); $day->lte($endDate); $day->addDay()) {
            $dateKey = $day->format('Y-m-d');
            $dayOfWeek = $day->dayOfWeek; // 0=Sun, 1=Mon ... 6=Sat

            $daySchedules = $schedules->where('day_of_week', $dayOfWeek);

            foreach ($daySchedules as $schedule) {
                $timeKey = substr($schedule->start_time, 0, 5);
                $gc = $schedule->groupClass;
                if (! $gc) {
                    continue;
                }

                // Find the matching appointment for this date+time
                $lookupKey = $dateKey.'|'.$timeKey;
                $matchedApps = $appointmentIndex[$lookupKey] ?? [];

                // Try to find the appointment that belongs to this group class
                $matchedApp = null;
                foreach ($matchedApps as $app) {
                    if ($app->group_class_id === $gc->id) {
                        $matchedApp = $app;
                        break;
                    }
                }

                $patients = [];
                $appointmentId = null;

                if ($matchedApp) {
                    $appointmentId = $matchedApp->id;
                    $patients = $matchedApp->patients->values()->map(function ($patient, $index) {
                        return [
                            'slot' => $index + 1,
                            'name' => $patient->name,
                            'id' => $patient->id,
                            'status' => $patient->pivot->status ?? 'scheduled',
                        ];
                    })->toArray();
                }

                $slots[$dateKey][] = [
                    'time' => $timeKey,
                    'appointment_id' => $appointmentId,
                    'type' => 'group',
                    'title' => $gc->name,
                    'max_participants' => $gc->max_participants ?? 4,
                    'group_class_name' => $gc->name,
                    'group_class_id' => $gc->id,
                    'color' => $gc->color ?? '#8b5cf6',
                    'patients' => $patients,
                    'duration_minutes' => $schedule->duration_minutes,
                ];
            }
        }

        return response()->json([
            'slots' => $slots,
            'week_start' => $startDate->format('Y-m-d'),
            'week_end' => $endDate->format('Y-m-d'),
        ]);
    }
}
