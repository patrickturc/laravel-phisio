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
        Schema::table('users', function (Blueprint $table) {
            // Hours the professional takes bookings, per weekday:
            // {"1": [7, 8, 9], …} (0 = Sunday). Null means no restriction.
            $table->json('agenda_availability')->nullable()->after('agenda_color');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('agenda_availability');
        });
    }
};
