<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Carbon\Carbon;

class SnapshotTenantUsage extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tenant:snapshot-usage';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Creates a daily snapshot of resource usage for all tenants.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $date = Carbon::today();
        
        $this->info("Taking tenant usage snapshots for {$date->toDateString()}...");

        $tenants = Tenant::all();

        $bar = $this->output->createProgressBar(count($tenants));

        foreach ($tenants as $tenant) {
            $tenant->usageLogs()->updateOrCreate(
                ['reference_date' => $date],
                [
                    'patients_count' => $tenant->patients()->count(),
                    'appointments_count' => $tenant->appointments()->count(),
                    // Using models directly avoids needing BelongsToTenant logic if running outside request,
                    // but since the relation is on Tenant, it automatically filters by tenant_id.
                    'evolutions_count' => \App\Models\Evolution::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
                    'financial_transactions_count' => \App\Models\FinancialTransaction::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
                    'users_count' => $tenant->users()->count(),
                    // For now, storage_mb is a placeholder. You could calculate S3 size later.
                    'storage_mb' => 0.00,
                ]
            );

            $bar->advance();
        }

        $bar->finish();
        
        $this->newLine();
        $this->info('Snapshots completed successfully!');
    }
}
