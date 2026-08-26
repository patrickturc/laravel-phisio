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
        Schema::create('evolutions', function (Blueprint $table) {
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $table->uuid('id')->default($isSqlite ? null : DB::raw('gen_random_uuid()'))->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->uuid('paciente_id')->index('idx_evolutions_patient');
            $table->uuid('agendamento_id')->nullable()->index('idx_evolutions_appointment');
            $table->foreignId('profissional_id');
            $table->timestampTz('data_atendimento')->default($isSqlite ? DB::raw('CURRENT_TIMESTAMP') : DB::raw("timezone('utc'::text, now())"))->index('idx_evolutions_date');
            $table->text('tipo_atendimento')->nullable()->default('evolucao');
            $table->integer('dor_eva')->nullable();
            $table->text('localizacao_dor')->nullable();
            $table->text('tipo_dor')->nullable();
            $table->text('queixa_principal')->nullable();
            $table->text('relato_paciente')->nullable();
            $table->text('intercorrencias')->nullable();
            $table->text('pressao_arterial')->nullable();
            $table->integer('frequencia_cardiaca')->nullable();
            $table->integer('saturacao')->nullable();
            $table->text('amplitude_movimento')->nullable();
            $table->text('forca_muscular')->nullable();
            $table->text('avaliacao_funcional')->nullable();
            $table->text('avaliacao_postural')->nullable();
            $table->text('condutas_realizadas')->nullable();
            $table->text('parametros_conduta')->nullable();
            $table->text('resposta_tratamento')->nullable();
            $table->text('evolucao_status')->nullable();
            $table->text('analise_profissional')->nullable();
            $table->text('conduta_planejada')->nullable();
            $table->text('orientacoes_domiciliares')->nullable();
            $table->date('proxima_sessao')->nullable();
            $table->text('assinatura_digital')->nullable();
            $table->timestampTz('created_at')->default($isSqlite ? DB::raw('CURRENT_TIMESTAMP') : DB::raw("timezone('utc'::text, now())"));
            $table->timestampTz('updated_at')->default($isSqlite ? DB::raw('CURRENT_TIMESTAMP') : DB::raw("timezone('utc'::text, now())"));
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evolutions');
    }
};
