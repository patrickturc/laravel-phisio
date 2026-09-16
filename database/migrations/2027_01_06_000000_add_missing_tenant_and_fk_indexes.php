<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables scoped by BelongsToTenant that were missing an index on
     * tenant_id — unlike users/patients/evolutions, every query against them
     * (via the tenant global scope, on every single request) was doing a full
     * table scan for this column.
     *
     * @var list<string>
     */
    private array $tenantScopedTables = [
        'appointments',
        'memberships',
        'financial_transactions',
        'patient_documents',
        'commercial_plans',
        'clinical_protocols',
        'group_classes',
        'group_class_schedules',
        'recurring_expenses',
        'evolution_photos',
        'financial_transaction_logs',
    ];

    /**
     * Foreign key columns queried directly and often enough (membership
     * eligibility checks per patient, per appointment; group class rosters;
     * financial history per patient/membership) to be worth an index of
     * their own, beyond the blanket tenant_id one above.
     *
     * @var array<string, list<string>>
     */
    private array $additionalIndexes = [
        'memberships' => ['patient_id'],
        'appointments' => ['group_class_id'],
        'group_class_schedules' => ['group_class_id'],
        'financial_transactions' => ['patient_id', 'membership_id'],
        'patient_documents' => ['patient_id'],
        'financial_transaction_logs' => ['financial_transaction_id'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tenantScopedTables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                if (! $this->indexExists($table, ['tenant_id'])) {
                    $blueprint->index('tenant_id');
                }
            });
        }

        foreach ($this->additionalIndexes as $table => $columns) {
            foreach ($columns as $column) {
                Schema::table($table, function (Blueprint $blueprint) use ($table, $column) {
                    if (! $this->indexExists($table, [$column])) {
                        $blueprint->index($column);
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tenantScopedTables as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                if ($this->indexExists($table, ['tenant_id'])) {
                    // dropIndex() treats an array argument as column names
                    // to derive a name from, not a literal name — pass the
                    // already-built name as a plain string instead.
                    $blueprint->dropIndex($table.'_tenant_id_index');
                }
            });
        }

        foreach ($this->additionalIndexes as $table => $columns) {
            foreach ($columns as $column) {
                Schema::table($table, function (Blueprint $blueprint) use ($table, $column) {
                    if ($this->indexExists($table, [$column])) {
                        $blueprint->dropIndex($table.'_'.$column.'_index');
                    }
                });
            }
        }
    }

    /**
     * Whether an index already covers exactly these columns (as its leading
     * columns) on this table — checked so this migration is safe to run
     * against a database where some of these were added by hand already,
     * without erroring on a duplicate index name.
     */
    private function indexExists(string $table, array $columns): bool
    {
        $connection = Schema::getConnection();

        foreach ($connection->getSchemaBuilder()->getIndexes($table) as $index) {
            if (array_slice($index['columns'], 0, count($columns)) === $columns) {
                return true;
            }
        }

        return false;
    }
};
