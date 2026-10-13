<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * WhatsApp reminder and attendance confirmation of one patient's class. The
 * message itself goes out through wa.me from the front desk's phone; here we
 * only record that it was sent and whether the patient confirmed.
 */
class AppointmentConfirmationController extends Controller
{
    public function reminded(Appointment $appointment, string $patientId): JsonResponse
    {
        $this->ensurePatientIsBooked($appointment, $patientId);

        $sentAt = now();
        $appointment->patients()->updateExistingPivot($patientId, ['whatsapp_reminder_at' => $sentAt]);

        return response()->json(['reminded_at' => $sentAt->toIso8601String()]);
    }

    public function confirmation(Request $request, Appointment $appointment, string $patientId): JsonResponse
    {
        $validated = $request->validate(['confirmed' => ['required', 'boolean']]);

        $this->ensurePatientIsBooked($appointment, $patientId);

        $confirmedAt = $validated['confirmed'] ? now() : null;
        $appointment->patients()->updateExistingPivot($patientId, ['confirmed_at' => $confirmedAt]);

        return response()->json(['confirmed_at' => $confirmedAt?->toIso8601String()]);
    }

    private function ensurePatientIsBooked(Appointment $appointment, string $patientId): void
    {
        abort_unless($appointment->patients()->whereKey($patientId)->exists(), 404);
    }
}
