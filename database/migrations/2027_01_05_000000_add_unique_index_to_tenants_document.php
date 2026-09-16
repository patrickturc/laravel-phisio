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
        // Registration validates the document with Rule::unique, but validation
        // alone loses a race between two simultaneous signups. Back it with a
        // real constraint. Normalize first so older rows saved with punctuation
        // do not collide with the digits-only format used from now on.
        foreach (DB::table('tenants')->whereNotNull('document')->get(['id', 'document']) as $tenant) {
            $digits = preg_replace('/\D/', '', $tenant->document);

            if ($digits !== $tenant->document) {
                DB::table('tenants')
                    ->where('id', $tenant->id)
                    ->update(['document' => $digits ?: null]);
            }
        }

        Schema::table('tenants', function (Blueprint $table) {
            $table->unique('document');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropUnique(['document']);
        });
    }
};
