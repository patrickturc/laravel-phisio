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
        // The status was an enum (paid/pending); "in_review" (the patient says
        // they paid, waiting to be checked) and "written_off" (perda /
        // inadimplente) join it. Drop the Postgres CHECK constraint first.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check');
        }

        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->string('status', 20)->default('paid')->change();

            // pix, cash, credit_card, debit_card, transfer, boleto, other.
            $table->string('payment_method', 20)->nullable()->after('status');

            // When the front desk sent the WhatsApp billing reminder.
            $table->timestamp('whatsapp_reminder_at')->nullable()->after('paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'whatsapp_reminder_at']);
        });
    }
};
