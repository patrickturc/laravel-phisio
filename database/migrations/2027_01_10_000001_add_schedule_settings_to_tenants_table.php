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
        Schema::table('tenants', function (Blueprint $table) {
            // Business hours, breaks, students per time slot and default
            // session length. Null means Tenant::DEFAULT_SCHEDULE_SETTINGS.
            $table->json('schedule_settings')->nullable()->after('message_templates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('schedule_settings');
        });
    }
};
