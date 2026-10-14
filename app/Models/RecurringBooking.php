<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * A patient's fixed weekly slot ("horário fixo") with their own professional.
 * Each week becomes one individual appointment, generated a rolling
 * HORIZON_WEEKS ahead, so attendance, reports and earnings keep working on
 * plain appointments.
 */
class RecurringBooking extends Model
{
    use BelongsToTenant, HasUuids;

    /**
     * How far ahead the weekly appointments are kept generated.
     */
    public const HORIZON_WEEKS = 8;

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'user_id',
        'rotation_user_ids',
        'day_of_week',
        'interval_weeks',
        'start_time',
        'duration_minutes',
        'room',
        'starts_on',
        'ends_on',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'interval_weeks' => 'integer',
            'rotation_user_ids' => 'array',
            'duration_minutes' => 'integer',
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Bookings still running on the given day (today by default).
     */
    public function scopeActive(Builder $query, ?CarbonInterface $on = null): void
    {
        $day = ($on ?? Carbon::today())->toDateString();

        $query->where(fn (Builder $q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>=', $day));
    }

    /**
     * "08:00" regardless of how the time column stores it.
     */
    public function startTime(): string
    {
        return substr((string) $this->start_time, 0, 5);
    }

    /**
     * The first class: the booking's weekday on or after its start date.
     * Alternate weeks and the professional rotation count from here.
     */
    public function anchorDate(): Carbon
    {
        $date = Carbon::parse($this->starts_on)->startOfDay();

        while ($date->dayOfWeek !== $this->day_of_week) {
            $date->addDay();
        }

        return $date;
    }

    /**
     * Whether the booking has a class in the week of this date; with
     * "semana alternada" only every other week does.
     */
    public function hasClassOn(CarbonInterface $date): bool
    {
        return $this->weeksSinceAnchor($date) % max(1, $this->interval_weeks) === 0;
    }

    /**
     * Professional of the class on this date: the main one, or whoever's
     * turn it is when professionals take turns ("revezar instrutores").
     */
    public function professionalIdFor(CarbonInterface $date): int
    {
        $rotation = [$this->user_id, ...($this->rotation_user_ids ?? [])];
        $occurrence = intdiv($this->weeksSinceAnchor($date), max(1, $this->interval_weeks));

        return (int) $rotation[$occurrence % count($rotation)];
    }

    private function weeksSinceAnchor(CarbonInterface $date): int
    {
        return intdiv((int) $this->anchorDate()->diffInDays($date->copy()->startOfDay()), 7);
    }

    /**
     * Create the weekly appointments that are still missing, from today (or
     * the start date) up to the horizon (or the end date). Weeks already
     * generated are skipped, so running it again is harmless. A week whose
     * slot is full, or where the patient is already booked at that time, is
     * skipped and reported instead.
     *
     * @return array{created: int, full: list<string>, busy: list<string>}
     */
    public function generateAppointments(?CarbonInterface $until = null): array
    {
        $result = ['created' => 0, 'full' => [], 'busy' => []];

        // starts_on is an immutable date; the loop below needs a mutable one.
        $from = Carbon::parse(Carbon::today()->max($this->starts_on));
        $until = Carbon::parse($until ?? Carbon::today()->addWeeks(self::HORIZON_WEEKS));
        if ($this->ends_on) {
            $until = $until->min($this->ends_on);
        }

        $date = $from->copy();
        while ($date->dayOfWeek !== $this->day_of_week) {
            $date->addDay();
        }

        // Weeks are tracked by recurrence_date, which stays put when an
        // appointment is rescheduled or cancelled, so those weeks are never
        // generated again.
        $generated = $this->appointments()
            ->whereNotNull('recurrence_date')
            ->pluck('recurrence_date')
            ->map(fn ($value) => Carbon::parse($value)->toDateString())
            ->all();

        $capacity = $this->tenant->slotCapacity();

        // Weeks inside a paused membership (with classes paused) are skipped.
        $pauses = Membership::query()
            ->where('tenant_id', $this->tenant_id)
            ->where('patient_id', $this->patient_id)
            ->where('status', 'paused')
            ->where('pauses_classes', true)
            ->get();

        for (; $date->lte($until); $date->addWeek()) {
            $day = $date->toDateString();

            if (in_array($day, $generated, true) || ! $this->hasClassOn($date)) {
                continue;
            }

            if ($pauses->contains(fn (Membership $pause): bool => $pause->pausesClassesOn($date))) {
                continue;
            }

            if (Appointment::patientBookedAt($this->tenant_id, $this->patient_id, $day, $this->startTime())) {
                $result['busy'][] = $day;

                continue;
            }

            if (Appointment::studentsInSlot($this->tenant_id, $day, $this->startTime()) >= $capacity) {
                $result['full'][] = $day;

                continue;
            }

            DB::transaction(function () use ($day, $date) {
                $appointment = Appointment::create([
                    'tenant_id' => $this->tenant_id,
                    'user_id' => $this->professionalIdFor($date),
                    'recurring_booking_id' => $this->id,
                    'recurrence_date' => $day,
                    'type' => 'individual',
                    'max_participants' => 1,
                    'appointment_date' => $day,
                    'start_time' => $this->startTime(),
                    'duration_minutes' => $this->duration_minutes,
                    'room' => $this->room,
                    'notes' => $this->notes,
                    'status' => 'scheduled',
                ]);

                $appointment->patients()->attach($this->patient_id, ['status' => 'scheduled']);
            });

            $result['created']++;
        }

        return $result;
    }

    /**
     * Stop the booking from the given day on: it ends the day before, and
     * its appointments from that day on that nobody attended yet are removed.
     * Returns how many appointments were removed.
     */
    public function endFrom(CarbonInterface $day): int
    {
        $removed = 0;

        DB::transaction(function () use ($day, &$removed) {
            $this->appointments()
                ->whereDate('appointment_date', '>=', $day->toDateString())
                ->where('status', 'scheduled')
                ->whereDoesntHave('patients', fn (Builder $q) => $q->where('appointment_patient.status', '!=', 'scheduled'))
                ->get()
                ->each(function (Appointment $appointment) use (&$removed) {
                    $appointment->patients()->detach();
                    $appointment->delete();
                    $removed++;
                });

            $this->update(['ends_on' => $day->copy()->subDay()->toDateString()]);
        });

        return $removed;
    }
}
