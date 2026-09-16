<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;

class CalendarFeedController extends Controller
{
    public function feed($token)
    {
        $user = User::where('calendar_token', $token)->firstOrFail();

        $today = now()->startOfDay();

        // Get all appointments (regular and group classes)
        $appointments = Appointment::with(['patients', 'groupClass'])
            ->where('user_id', $user->id)
            ->where('appointment_date', '>=', $today->toDateString())
            ->where('status', '!=', 'cancelled')
            ->get();

        $ics = "BEGIN:VCALENDAR\r\n";
        $ics .= "VERSION:2.0\r\n";
        $ics .= "PRODID:-//Phisio//Calendar Sync//PT\r\n";
        $ics .= "CALSCALE:GREGORIAN\r\n";
        $ics .= "METHOD:PUBLISH\r\n";
        $ics .= 'X-WR-CALNAME:Phisio - '.$user->name."\r\n";
        $ics .= "X-PUBLISHED-TTL:PT1H\r\n"; // Suggest clients update every hour

        $nowStamp = gmdate('Ymd\THis\Z');

        foreach ($appointments as $app) {
            // format time to include seconds for carbon parsing if not present
            $startTimeStr = strlen($app->start_time) === 5 ? $app->start_time.':00' : $app->start_time;
            $endTimeStr = strlen($app->end_time ?? '') === 5 ? $app->end_time.':00' : ($app->end_time ?? '00:00:00');

            // if duration_minutes is used instead of end_time:
            if (! $app->end_time && $app->duration_minutes) {
                $startObj = Carbon::createFromFormat('Y-m-d H:i:s', $app->appointment_date->format('Y-m-d').' '.$startTimeStr, 'America/Sao_Paulo');
                $endObj = $startObj->copy()->addMinutes($app->duration_minutes);
                $startTime = $startObj->utc();
                $endTime = $endObj->utc();
            } else {
                $startTime = Carbon::createFromFormat('Y-m-d H:i:s', $app->appointment_date->format('Y-m-d').' '.$startTimeStr, 'America/Sao_Paulo')->utc();
                $endTime = Carbon::createFromFormat('Y-m-d H:i:s', $app->appointment_date->format('Y-m-d').' '.$endTimeStr, 'America/Sao_Paulo')->utc();
            }

            if ($app->type === 'group' && $app->groupClass) {
                $summary = "Turma: {$app->groupClass->name}";
                if ($app->patients->count() > 0) {
                    $summary .= ' ('.$app->patients->count().' alunos)';
                }
            } else {
                $patients = $app->patients->pluck('name')->implode(', ');
                $summary = $patients ? "Sessão: {$patients}" : 'Sessão Agendada';
            }

            $uid = "appointment-{$app->id}@phisio";

            $ics .= "BEGIN:VEVENT\r\n";
            $ics .= "UID:{$uid}\r\n";
            $ics .= "DTSTAMP:{$nowStamp}\r\n";
            $ics .= 'DTSTART:'.$startTime->format('Ymd\THis\Z')."\r\n";
            $ics .= 'DTEND:'.$endTime->format('Ymd\THis\Z')."\r\n";
            $ics .= "SUMMARY:{$summary}\r\n";
            $ics .= "STATUS:CONFIRMED\r\n";
            $ics .= "END:VEVENT\r\n";
        }

        $ics .= "END:VCALENDAR\r\n";

        return response($ics)
            ->header('Content-Type', 'text/calendar; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="phisio-calendar.ics"');
    }
}
