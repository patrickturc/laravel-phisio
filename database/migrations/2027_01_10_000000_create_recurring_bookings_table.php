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
        // A patient's fixed weekly slot ("horário fixo") with their own
        // professional. It is materialised into one individual appointment
        // per week, a rolling few weeks ahead.
        Schema::create('recurring_bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->unsignedTinyInteger('day_of_week'); // 0 = Sunday … 6 = Saturday
            $table->time('start_time');
            $table->unsignedSmallInteger('duration_minutes');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'day_of_week']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignUuid('recurring_booking_id')->nullable()->after('schedule_id')
                ->constrained('recurring_bookings')->nullOnDelete();

            // The week of the fixed slot this appointment stands for. It does
            // not move when the appointment is rescheduled, so the generator
            // never recreates a week that was moved or cancelled.
            $table->date('recurrence_date')->nullable()->after('recurring_booking_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurring_booking_id');
            $table->dropColumn('recurrence_date');
        });

        Schema::dropIfExists('recurring_bookings');
    }
};
