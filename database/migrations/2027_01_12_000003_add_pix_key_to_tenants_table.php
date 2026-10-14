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
            // cpf_cnpj, phone, email or random; the key is stored normalised
            // the way PIX expects it (digits, +55…, lowercase).
            $table->string('pix_key_type', 20)->nullable()->after('instagram');
            $table->string('pix_key', 77)->nullable()->after('pix_key_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['pix_key_type', 'pix_key']);
        });
    }
};
