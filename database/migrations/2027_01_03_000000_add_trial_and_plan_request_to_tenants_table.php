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
            // Trial period. Null means the organization was never on a trial
            // (created manually by a dev admin, for instance).
            $table->timestamp('trial_started_at')->nullable()->after('plan');
            $table->timestamp('trial_ends_at')->nullable()->after('trial_started_at');

            // Marks organizations that signed themselves up through the public
            // registration form, as opposed to being created by a dev admin.
            $table->boolean('self_registered')->default(false)->after('trial_ends_at');

            // Plan upgrade request submitted by the organization itself.
            $table->string('requested_plan')->nullable()->after('self_registered');
            $table->timestamp('plan_requested_at')->nullable()->after('requested_plan');
            $table->text('plan_request_notes')->nullable()->after('plan_requested_at');

            $table->index('trial_ends_at');
            $table->index('plan_requested_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['trial_ends_at']);
            $table->dropIndex(['plan_requested_at']);

            $table->dropColumn([
                'trial_started_at',
                'trial_ends_at',
                'self_registered',
                'requested_plan',
                'plan_requested_at',
                'plan_request_notes',
            ]);
        });
    }
};
