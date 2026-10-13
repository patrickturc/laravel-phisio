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
        Schema::table('recurring_bookings', function (Blueprint $table) {
            // 1 = every week, 2 = every other week ("semana alternada").
            $table->unsignedTinyInteger('interval_weeks')->default(1)->after('day_of_week');

            // Other professionals taking turns with user_id, in order
            // ("revezar instrutores"). Null when there is no rotation.
            $table->json('rotation_user_ids')->nullable()->after('user_id');

            // Room or unit, one of the clinic's rooms in schedule_settings.
            $table->string('room', 60)->nullable()->after('duration_minutes');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->string('room', 60)->nullable()->after('duration_minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('room');
        });

        Schema::table('recurring_bookings', function (Blueprint $table) {
            $table->dropColumn(['interval_weeks', 'rotation_user_ids', 'room']);
        });
    }
};
