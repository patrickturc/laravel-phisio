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
        Schema::create('patients', function (Blueprint $table) {
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $table->uuid('id')->default($isSqlite ? null : DB::raw('gen_random_uuid()'))->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->timestampTz('created_at')->default($isSqlite ? DB::raw('CURRENT_TIMESTAMP') : DB::raw("timezone('utc'::text, now())"));
            $table->timestamp("updated_at")->nullable();
            $table->text('name');
            $table->text('phone')->nullable();
            $table->text('type')->nullable();
            $table->text('cpf')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('user_id');
            $table->date('birthdate')->nullable();
            $table->string('nickname')->nullable();
            $table->string('email')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('rg')->nullable();
            $table->string('profession')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('health_notes')->nullable();
            $table->string('cep')->nullable();
            $table->string('street')->nullable();
            $table->string('number')->nullable();
            $table->string('complement')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();

            $table->index('tenant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
