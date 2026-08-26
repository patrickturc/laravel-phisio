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
        Schema::create('evolution_photos', function (Blueprint $table) {
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $table->uuid('id')->default($isSqlite ? null : DB::raw('gen_random_uuid()'))->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('evolucao_id')->constrained('evolutions')->cascadeOnDelete();
            $table->text('caminho_arquivo');
            $table->text('descricao')->nullable();
            $table->timestampTz('data_upload')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evolution_photos');
    }
};
