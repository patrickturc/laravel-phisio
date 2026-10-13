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
            // The clinic's owner, who may differ from the technical manager.
            $table->string('owner_name')->nullable()->after('legal_name');
            $table->string('owner_document', 11)->nullable()->after('owner_name');
            $table->date('owner_birthdate')->nullable()->after('owner_document');
            $table->string('owner_photo_path')->nullable()->after('owner_birthdate');

            // Public-facing profile: about text and Instagram handle.
            $table->text('bio')->nullable()->after('website');
            $table->string('instagram', 30)->nullable()->after('bio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'owner_name',
                'owner_document',
                'owner_birthdate',
                'owner_photo_path',
                'bio',
                'instagram',
            ]);
        });
    }
};
