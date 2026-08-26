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
        Schema::create('tenant_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->date('reference_date');
            $table->unsignedInteger('patients_count')->default(0);
            $table->unsignedInteger('appointments_count')->default(0);
            $table->unsignedInteger('evolutions_count')->default(0);
            $table->unsignedInteger('financial_transactions_count')->default(0);
            $table->unsignedInteger('users_count')->default(0);
            $table->decimal('storage_mb', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'reference_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_usage_logs');
    }
};
