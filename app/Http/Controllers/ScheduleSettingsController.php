<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * "Configurar agenda": business hours, breaks, students per slot, default
 * session length and each professional's colour.
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
        ], [
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
            ],
        ]);

        // Tenant-scoped, so only this clinic's professionals can be recoloured.
        $colors = $validated['colors'] ?? [];
        User::professionals()->whereIn('id', array_keys($colors))->get()
            ->each(fn (User $user) => $user->update(['agenda_color' => $colors[$user->id] ?: null]));

        return back()->with('success', 'Configurações da agenda salvas.');
    }
}
