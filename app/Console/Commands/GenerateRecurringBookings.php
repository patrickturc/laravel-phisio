<?php

namespace App\Console\Commands;

use App\Models\RecurringBooking;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;

class GenerateRecurringBookings extends Command
{
    protected $signature = 'bookings:generate';

    protected $description = 'Keep the weekly appointments of fixed slots generated up to the rolling horizon';

    public function handle(): int
    {
        $created = 0;
        $full = 0;

        // No user is logged in here, so the tenant scope is off and every
        // clinic is covered; suspended or inactive clinics are skipped.
        RecurringBooking::query()
            ->active()
            ->with('tenant')
            ->chunkById(200, function (Collection $bookings) use (&$created, &$full) {
                foreach ($bookings as $booking) {
                    if (! $booking->tenant?->isActive()) {
                        continue;
                    }

                    $result = $booking->generateAppointments();
                    $created += $result['created'];
                    $full += count($result['full']);
                }
            });

        $this->info("Generated {$created} appointments from fixed slots ({$full} skipped because the slot was full).");

        return self::SUCCESS;
    }
}
