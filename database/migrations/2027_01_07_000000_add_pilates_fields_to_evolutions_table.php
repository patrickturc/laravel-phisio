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
        Schema::table('evolutions', function (Blueprint $table) {
            // Which form produced the record: full SOAP, quick note or the
            // structured Pilates movement assessment. Until now "quick note"
            // was inferred from observacoes being filled in.
            $table->string('evolution_type')->default('soap')->after('tipo_atendimento');

            // Pilates movement assessment, one rating per quality.
            $table->string('estabilidade')->nullable()->after('evolution_type');
            $table->string('mobilidade')->nullable()->after('estabilidade');
            $table->string('forca')->nullable()->after('mobilidade');
            $table->string('coordenacao')->nullable()->after('forca');

            // Complaints and precautions. Pain details reuse dor_eva and
            // localizacao_dor, so the existing EVA badges keep working.
            $table->boolean('tem_dor')->nullable()->after('coordenacao');
            $table->boolean('tem_limitacao')->nullable()->after('tem_dor');
            $table->text('limitacao_detalhe')->nullable()->after('tem_limitacao');
            $table->boolean('tem_contraindicacao')->nullable()->after('limitacao_detalhe');
            $table->text('contraindicacao_detalhe')->nullable()->after('tem_contraindicacao');
        });

        DB::table('evolutions')
            ->whereNotNull('observacoes')
            ->where('observacoes', '!=', '')
            ->update(['evolution_type' => 'simple']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evolutions', function (Blueprint $table) {
            $table->dropColumn([
                'evolution_type',
                'estabilidade',
                'mobilidade',
                'forca',
                'coordenacao',
                'tem_dor',
                'tem_limitacao',
                'limitacao_detalhe',
                'tem_contraindicacao',
                'contraindicacao_detalhe',
            ]);
        });
    }
};
