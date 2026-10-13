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
        Schema::table('appointment_patient', function (Blueprint $table) {
            // When the front desk sent the WhatsApp reminder for this class,
            // separate from the e-mail reminder's reminder_sent_at.
            $table->timestamp('whatsapp_reminder_at')->nullable()->after('reminder_sent_at');

            // When the patient confirmed they are coming.
            $table->timestamp('confirmed_at')->nullable()->after('whatsapp_reminder_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointment_patient', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_reminder_at', 'confirmed_at']);
        });
    }
};
