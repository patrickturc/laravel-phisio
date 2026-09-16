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
            // The plan list now lives in config/plans.php, so the column stops
            // being an enum locked to free/basic/pro and becomes a plain key.
            $table->string('plan')->default('free')->change();

            // Seats bought on top of the ones the plan already includes.
            $table->unsignedInteger('extra_users')->default(0)->after('max_users');

            // Extra seats asked for alongside a plan request, pending approval.
            $table->unsignedInteger('requested_extra_users')->default(0)->after('requested_plan');

            // Set once the organization fills in every field required for
            // billing, so the nagging banner can stop.
            $table->timestamp('profile_completed_at')->nullable()->after('plan_request_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'extra_users',
                'requested_extra_users',
                'profile_completed_at',
            ]);
        });
    }
};
