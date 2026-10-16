<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Dotenv\Dotenv;
use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Brings a clinic from the old single-clinic install (no tenants) into this
 * one as a new tenant: its users, patients and everything attached to them.
 * Records keep their UUIDs; users get new ids and every reference to them is
 * remapped. Without --write the whole import runs inside a transaction that
 * is rolled back, so it reports what would happen and checks every foreign
 * key without saving anything.
 */
class ImportLegacyClinic extends Command
{
    protected $signature = 'import:legacy-clinic
        {--legacy-env= : Path to the old install\'s .env (its DB_* settings are used, read-only)}
        {--name= : Name of the new clinic}
        {--plan=pro : Plan of the new clinic}
        {--notes= : Internal dev admin notes about the clinic}
        {--email-map=* : Change a user\'s e-mail on the way in, as old@email=new@email}
        {--write : Save the import (without it nothing is saved)}';

    protected $description = 'Import a clinic from the old single-clinic install into a new tenant';

    /**
     * Data tables in dependency order. "bigint_id" tables get new ids.
     *
     * @var array<string, array{users?: list<string>, bigint_id?: bool}>
     */
    private const TABLES = [
        'commercial_plans' => [],
        'clinical_protocols' => [],
        'recurring_expenses' => [],
        'patients' => ['users' => ['user_id']],
        'group_classes' => ['users' => ['user_id']],
        'group_class_schedules' => [],
        'group_class_patient' => ['bigint_id' => true],
        'memberships' => [],
        'appointments' => ['users' => ['user_id']],
        'appointment_patient' => ['bigint_id' => true],
        'evolutions' => ['users' => ['profissional_id']],
        'financial_transactions' => ['users' => ['created_by', 'paid_by']],
        'financial_transaction_logs' => ['users' => ['user_id']],
        'patient_documents' => ['users' => ['user_id']],
    ];

    /**
     * User columns the old install has that are copied as they are.
     *
     * @var list<string>
     */
    private const USER_COLUMNS = [
        'name', 'email', 'email_verified_at', 'password', 'remember_token',
        'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at',
        'calendar_token', 'created_at', 'updated_at',
    ];

    public function handle(): int
    {
        $legacy = $this->legacyConnection();

        $name = trim((string) $this->option('name'));

        if ($name === '') {
            $this->error('Informe o nome da clínica com --name.');

            return self::FAILURE;
        }

        $write = (bool) $this->option('write');
        $this->warn($write ? 'Gravando a importação.' : 'Simulação: nada será salvo (use --write para gravar).');

        DB::beginTransaction();

        try {
            $tenant = $this->createTenant($name);
            $userIds = $this->importUsers($legacy, $tenant);

            $this->table(['Tabela', 'Registros'], collect(self::TABLES)
                ->map(fn (array $options, string $table) => [$table, $this->importTable($legacy, $tenant, $table, $options, $userIds)])
                ->values()
                ->all());

            $this->backfill($tenant);
        } catch (\Throwable $exception) {
            DB::rollBack();

            throw $exception;
        }

        if (! $write) {
            DB::rollBack();
            $this->info('Simulação concluída sem erros. Nada foi salvo.');

            return self::SUCCESS;
        }

        DB::commit();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->info("Clínica \"{$name}\" importada.");

        return self::SUCCESS;
    }

    /**
     * The old install's database, opened read-only. Without --legacy-env an
     * already configured "legacy" connection is used (the tests do this).
     */
    private function legacyConnection(): Connection
    {
        $path = (string) $this->option('legacy-env');

        if ($path === '') {
            if (! config('database.connections.legacy')) {
                throw new RuntimeException('Informe o .env do sistema antigo com --legacy-env.');
            }

            return DB::connection('legacy');
        }

        if (! is_file($path)) {
            throw new RuntimeException("Arquivo não encontrado: {$path}");
        }

        $env = Dotenv::parse((string) file_get_contents($path));

        config(['database.connections.legacy' => [
            'driver' => 'pgsql',
            'host' => $env['DB_HOST'] ?? null,
            'port' => $env['DB_PORT'] ?? 5432,
            'database' => $env['DB_DATABASE'] ?? null,
            'username' => $env['DB_USERNAME'] ?? null,
            'password' => $env['DB_PASSWORD'] ?? null,
            'charset' => 'utf8',
            'prefix' => '',
            'search_path' => 'public',
            'sslmode' => 'require',
        ]]);

        $connection = DB::connection('legacy');
        $connection->statement('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');

        return $connection;
    }

    private function createTenant(string $name): Tenant
    {
        $plan = (string) $this->option('plan');
        $config = Tenant::planConfig($plan);

        $tenant = Tenant::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'status' => 'active',
            'plan' => $plan,
            'max_users' => (int) ($config['users'] ?? 5),
            'max_storage_mb' => (int) ($config['storage_mb'] ?? 1024),
            'self_registered' => false,
            'notes' => $this->option('notes') ?: null,
        ]);

        Role::provisionDefaultsFor($tenant);

        $this->line("Clínica criada: {$tenant->name} ({$tenant->id}), plano {$plan}.");

        return $tenant;
    }

    /**
     * @return array<int, int> old user id => new user id
     */
    private function importUsers(Connection $legacy, Tenant $tenant): array
    {
        $emailMap = collect($this->option('email-map'))
            ->mapWithKeys(function (string $pair): array {
                [$from, $to] = array_map('trim', explode('=', $pair, 2) + [1 => '']);

                return [Str::lower($from) => $to];
            });

        $roleNames = $legacy->table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_type', 'like', '%User')
            ->get(['model_id', 'roles.name'])
            ->groupBy('model_id');

        $ids = [];

        foreach ($legacy->table('users')->orderBy('id')->get() as $old) {
            $row = array_intersect_key((array) $old, array_flip(self::USER_COLUMNS));
            $row['email'] = $emailMap[Str::lower($old->email)] ?? $old->email;

            if ($row['email'] === '' || User::withoutGlobalScopes()->where('email', $row['email'])->exists()) {
                throw new RuntimeException("O e-mail {$row['email']} já existe no sistema novo. Use --email-map={$old->email}=outro@email.");
            }

            if ($row['calendar_token'] && User::withoutGlobalScopes()->where('calendar_token', $row['calendar_token'])->exists()) {
                $row['calendar_token'] = null;
            }

            $newId = DB::table('users')->insertGetId([
                ...$row,
                'tenant_id' => $tenant->id,
                'is_dev_admin' => false,
            ]);

            $user = User::withoutGlobalScopes()->findOrFail($newId);

            foreach ($roleNames->get($old->id, collect())->pluck('name') as $roleName) {
                $role = Role::forTenant($tenant->id)->where('name', $roleName)->first()
                    ?? Role::create(['name' => $roleName, 'guard_name' => 'web', 'tenant_id' => $tenant->id]);
                $user->assignRole($role);
            }

            $ids[$old->id] = $newId;
            $this->line("Usuário {$old->name} <{$row['email']}> → id {$newId} (".($roleNames->get($old->id, collect())->pluck('name')->implode(', ') ?: 'sem perfil').')');
        }

        return $ids;
    }

    /**
     * @param  array{users?: list<string>, bigint_id?: bool}  $options
     * @param  array<int, int>  $userIds
     */
    private function importTable(Connection $legacy, Tenant $tenant, string $table, array $options, array $userIds): int
    {
        $columns = array_values(array_intersect(
            Schema::connection('legacy')->getColumnListing($table),
            Schema::getColumnListing($table),
        ));

        if (! empty($options['bigint_id'])) {
            $columns = array_values(array_diff($columns, ['id']));
        }

        if ($columns === []) {
            return 0;
        }

        // A clinic's data is small enough to read at once, and the link tables
        // have no single unique column to page by.
        $rows = $legacy->table($table)->select($columns)->get()->map(function ($row) use ($table, $tenant, $options, $userIds): array {
            $row = (array) $row;

            foreach ($options['users'] ?? [] as $column) {
                if ($row[$column] !== null) {
                    $row[$column] = $userIds[$row[$column]]
                        ?? throw new RuntimeException("{$table}.{$column} aponta para o usuário {$row[$column]}, que não existe no sistema antigo.");
                }
            }

            return [...$row, 'tenant_id' => $tenant->id];
        });

        $rows->chunk(200)->each(fn ($chunk) => DB::table($table)->insert($chunk->values()->all()));

        return $rows->count();
    }

    /**
     * Fill the columns that this install's later migrations filled for the
     * data that already existed when they ran.
     */
    private function backfill(Tenant $tenant): void
    {
        DB::table('evolutions')
            ->where('tenant_id', $tenant->id)
            ->whereNotNull('observacoes')
            ->where('observacoes', '!=', '')
            ->update(['evolution_type' => 'simple']);

        DB::table('memberships')
            ->where('tenant_id', $tenant->id)
            ->whereNotNull('billing_day')
            ->update(['billing_cycle' => 'monthly']);

        $firstMembership = DB::table('memberships')
            ->where('tenant_id', $tenant->id)
            ->select('patient_id', DB::raw('MIN(start_date) as first_start'))
            ->groupBy('patient_id')
            ->pluck('first_start', 'patient_id');

        DB::table('patients')
            ->where('tenant_id', $tenant->id)
            ->whereNull('enrollment_date')
            ->get(['id', 'created_at'])
            ->each(fn ($patient) => DB::table('patients')
                ->where('id', $patient->id)
                ->update(['enrollment_date' => substr((string) ($firstMembership[$patient->id] ?? $patient->created_at), 0, 10)]));
    }
}
