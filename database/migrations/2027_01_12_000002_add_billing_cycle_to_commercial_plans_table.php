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
        Schema::table('commercial_plans', function (Blueprint $table) {
            // Default billing cycle offered when enrolling in this plan
            // (see Membership::BILLING_CYCLES). Null means a single charge.
            $table->string('billing_cycle', 20)->nullable()->after('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commercial_plans', function (Blueprint $table) {
            $table->dropColumn('billing_cycle');
        });
    }
};
