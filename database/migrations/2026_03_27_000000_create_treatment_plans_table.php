<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treatment_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->uuid('patient_id');
            $table->string('title');
            $table->text('objective')->nullable();
            $table->integer('total_sessions');
            $table->integer('completed_sessions')->default(0);
            $table->enum('status', ['active', 'paused', 'completed'])->default('active');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();

            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_plans');
    }
};
