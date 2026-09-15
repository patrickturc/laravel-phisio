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
            $table->string('legal_name')->nullable()->after('name');
            $table->string('state_registration')->nullable()->after('document');
            $table->string('cep', 9)->nullable()->after('address');
            $table->string('street')->nullable()->after('cep');
            $table->string('number', 50)->nullable()->after('street');
            $table->string('complement')->nullable()->after('number');
            $table->string('neighborhood')->nullable()->after('complement');
            $table->string('city')->nullable()->after('neighborhood');
            $table->string('state', 2)->nullable()->after('city');
            $table->string('whatsapp')->nullable()->after('phone');
            $table->string('website')->nullable()->after('whatsapp');
            $table->string('technical_manager_name')->nullable()->after('website');
            $table->string('technical_manager_document')->nullable()->after('technical_manager_name');
            $table->text('notes')->nullable()->after('max_storage_mb');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'legal_name',
                'state_registration',
                'cep',
                'street',
                'number',
                'complement',
                'neighborhood',
                'city',
                'state',
                'whatsapp',
                'website',
                'technical_manager_name',
                'technical_manager_document',
                'notes',
            ]);
        });
    }
};
