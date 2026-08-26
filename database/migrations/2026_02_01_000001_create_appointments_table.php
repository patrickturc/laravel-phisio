<?php

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
        Schema::create('appointments', function (Blueprint $table) {
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $table->uuid('id')->default($isSqlite ? null : DB::raw('gen_random_uuid()'))->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->timestampTz('created_at')->default($isSqlite ? DB::raw('CURRENT_TIMESTAMP') : DB::raw("timezone('utc'::text, now())"));
            $table->timestamp("updated_at")->nullable();
            $table->uuid('patient_id')->index('idx_appointments_patient');
            $table->foreignId('user_id');
            $table->date('appointment_date');
            $table->time('start_time');
            $table->integer('duration_minutes')->default(50);
            $table->text('status')->nullable()->default('scheduled');
            $table->text('notes')->nullable();

            $table->index(['appointment_date', 'start_time'], 'idx_appointments_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
