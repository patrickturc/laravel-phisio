<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create pivot table
        Schema::create('appointment_patient', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->uuid('appointment_id')->index();
            $table->uuid('patient_id')->index();
            $table->string('status')->default('scheduled'); // scheduled, attended, missed, cancelled
            $table->timestamps();

            // Foreign keys if desired (assuming we don't have strict FKs given previous migrations)
            // But we will add basic indexing.
            $table->unique(['appointment_id', 'patient_id']);
        });

        // 2. Add new columns to appointments
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('title')->nullable();
            $table->string('type')->default('individual'); // individual or group
            $table->integer('max_participants')->default(1);
        });

        // 3. Move existing data to pivot table
        \Illuminate\Support\Facades\DB::statement("
            INSERT INTO appointment_patient (appointment_id, patient_id, status, created_at, updated_at)
            SELECT id, patient_id, status, created_at, COALESCE(updated_at, created_at)
            FROM appointments
            WHERE patient_id IS NOT NULL
        ");

        // 4. Drop patient_id and status from appointments (since status is now per-patient)
        // Wait, does an appointment itself have a status? (e.g., cancelled class?)
        // Let's keep status on appointment for the "class" status, and status on pivot for "patient" status.
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('idx_appointments_patient');
            $table->dropColumn('patient_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Restore columns
        Schema::table('appointments', function (Blueprint $table) {
            $table->uuid('patient_id')->nullable()->index('idx_appointments_patient');
        });

        // 2. Move data back (only one patient per appointment)
        // This is lossy, we just pick the first patient
        \Illuminate\Support\Facades\DB::statement("
            UPDATE appointments a
            SET patient_id = (
                SELECT patient_id 
                FROM appointment_patient ap 
                WHERE ap.appointment_id = a.id 
                LIMIT 1
            )
        ");

        // 3. Drop new columns
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['title', 'type', 'max_participants']);
        });

        // 4. Drop pivot table
        Schema::dropIfExists('appointment_patient');
    }
};
