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
        // The status was an enum (active/expired/cancelled); "paused" joins
        // it. On Postgres the enum is a CHECK constraint that a type change
        // would keep, so drop it explicitly.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_status_check');
        }

        Schema::table('memberships', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->change();

            // Open-ended memberships ("contínua") have no end date.
            $table->date('end_date')->nullable()->change();

            // How often it is charged: weekly, biweekly, monthly, bimonthly,
            // quarterly, semiannual, annual. Null means a single charge.
            $table->string('billing_cycle', 20)->nullable()->after('price');

            // Due date of the next charge to generate.
            $table->date('next_billing_date')->nullable()->after('last_billed_at');

            // Pause: since when, until when (null = until resumed by hand), and
            // whether the patient's fixed-slot classes are paused as well.
            $table->date('paused_at')->nullable()->after('next_billing_date');
            $table->date('paused_until')->nullable()->after('paused_at');
            $table->boolean('pauses_classes')->default(false)->after('paused_until');
        });

        // Until now a billing day meant one charge a month on that day.
        DB::table('memberships')->whereNotNull('billing_day')->update(['billing_cycle' => 'monthly']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->dropColumn(['billing_cycle', 'next_billing_date', 'paused_at', 'paused_until', 'pauses_classes']);
        });
    }
};
