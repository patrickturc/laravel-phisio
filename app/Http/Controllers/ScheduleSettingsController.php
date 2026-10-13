<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * "Configurar agenda": business hours, breaks, students per slot, default
 * session length, rooms, and each professional's colour and availability.
 */
class ScheduleSettingsController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        abort_if(! $tenant, 404);

        $validated = $request->validate([
            'business_hours' => ['required', 'array', 'size:7'],
            'business_hours.*.open' => ['required', 'boolean'],
            'business_hours.*.start' => ['required', 'date_format:H:i'],
            'business_hours.*.end' => ['required', 'date_format:H:i'],
            'breaks' => ['nullable', 'array', 'max:10'],
            'breaks.*.start' => ['required', 'date_format:H:i'],
            'breaks.*.end' => ['required', 'date_format:H:i'],
            'slot_capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'default_duration' => ['required', 'integer', 'min:10', 'max:180'],
            'colors' => ['nullable', 'array'],
            'colors.*' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'rooms' => ['nullable', 'array', 'max:20'],
            'rooms.*' => ['required', 'string', 'max:60', 'distinct'],
            // availability[userId] = null (any time) or {weekday: [hours]}
            'availability' => ['nullable', 'array'],
            'availability.*' => ['nullable', 'array'],
            'availability.*.*' => ['array'],
            'availability.*.*.*' => ['integer', 'between:0,23'],
        ], [
            'rooms.*.distinct' => 'Há salas com o mesmo nome.',
            'rooms.*.required' => 'Dê um nome à sala.',
            'slot_capacity.min' => 'A capacidade precisa ser de pelo menos 1 aluno.',
            'colors.*.regex' => 'Escolha uma cor válida.',
        ]);

        $errors = [];
        foreach ($validated['business_hours'] as $day => $hours) {
            if ($hours['end'] <= $hours['start']) {
                $errors["business_hours.{$day}.end"] = 'O fechamento precisa ser depois da abertura.';
            }
        }
        foreach ($validated['breaks'] ?? [] as $index => $break) {
            if ($break['end'] <= $break['start']) {
                $errors["breaks.{$index}.end"] = 'O fim do intervalo precisa ser depois do início.';
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $tenant->update([
            'schedule_settings' => [
                'business_hours' => array_values(array_map(fn (array $hours): array => [
                    'open' => (bool) $hours['open'],
                    'start' => $hours['start'],
                    'end' => $hours['end'],
                ], $validated['business_hours'])),
                'breaks' => array_values(array_map(fn (array $break): array => [
                    'start' => $break['start'],
                    'end' => $break['end'],
                ], $validated['breaks'] ?? [])),
                'slot_capacity' => (int) $validated['slot_capacity'],
                'default_duration' => (int) $validated['default_duration'],
                'rooms' => array_values(array_map('trim', $validated['rooms'] ?? [])),
            ],
        ]);

        // Tenant-scoped, so only this clinic's professionals are touched.
        $colors = $validated['colors'] ?? [];
        User::professionals()->whereIn('id', array_keys($colors))->get()
            ->each(fn (User $user) => $user->update(['agenda_color' => $colors[$user->id] ?: null]));

        $availability = $validated['availability'] ?? [];
        User::professionals()->whereIn('id', array_keys($availability))->get()
            ->each(fn (User $user) => $user->update([
                'agenda_availability' => $this->normalizeAvailability($availability[$user->id]),
            ]));

        return back()->with('success', 'Configurações da agenda salvas.');
    }

    /**
     * Null (no restriction) or the sorted hours of each weekday, 0 to 6.
     *
     * @param  array<int|string, list<int>>|null  $hoursByWeekday
     * @return array<int, list<int>>|null
     */
    private function normalizeAvailability(?array $hoursByWeekday): ?array
    {
        if ($hoursByWeekday === null) {
            return null;
        }

        return array_map(function (int $weekday) use ($hoursByWeekday): array {
            $hours = array_values(array_unique(array_map('intval', $hoursByWeekday[$weekday] ?? [])));
            sort($hours);

            return $hours;
        }, range(0, 6));
    }
}
