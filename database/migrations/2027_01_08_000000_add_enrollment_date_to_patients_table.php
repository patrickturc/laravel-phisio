<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // "Data da matrícula": when the patient joined the clinic. Drives
            // the enrollment anniversary list.
            $table->date('enrollment_date')->nullable()->after('birthdate');
        });

        // Renewals create a new membership row, so the original enrollment is
        // the earliest start_date. Patients with no membership fall back to
        // the day they were registered. Done in PHP to stay portable across
        // sqlite and Postgres date functions.
        $firstMembershipStart = DB::table('memberships')
            ->select('patient_id', DB::raw('MIN(start_date) as first_start'))
            ->groupBy('patient_id')
            ->pluck('first_start', 'patient_id');

        DB::table('patients')
            ->whereNull('enrollment_date')
            ->select('id', 'created_at')
            ->orderBy('id')
            ->chunkById(500, function ($patients) use ($firstMembershipStart) {
                foreach ($patients as $patient) {
                    $date = $firstMembershipStart[$patient->id] ?? $patient->created_at;

                    if ($date === null) {
                        continue;
                    }

                    DB::table('patients')
                        ->where('id', $patient->id)
                        ->update(['enrollment_date' => Carbon::parse($date)->toDateString()]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('enrollment_date');
        });
    }
};
