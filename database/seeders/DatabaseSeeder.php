<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Tenant;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Never a fixed, well-known password: set SEED_ADMIN_PASSWORD or use
        // the random one printed below. Only used when the accounts are new.
        $password = env('SEED_ADMIN_PASSWORD') ?: Str::password(16);

        // 1. Create Default Tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'fisio-principal'],
            [
                'name' => 'Fisio Principal',
                'status' => 'active',
                'plan' => 'pro',
                'max_users' => 10,
            ]
        );

        // 2. Create Dev Admin
        $devAdmin = User::firstOrCreate(
            ['email' => 'paturchette@gmail.com'],
            [
                'name' => 'Patrick Turchetti',
                'password' => bcrypt($password),
                'is_dev_admin' => true,
                'tenant_id' => null,
                'email_verified_at' => now(),
            ]
        );

        // 3. Create Tenant Admin
        $tenantAdmin = User::firstOrCreate(
            ['email' => 'admin@phisio.com'],
            [
                'name' => 'Admin Phisio',
                'password' => bcrypt($password),
                'is_dev_admin' => false,
                'tenant_id' => $tenant->id,
                'email_verified_at' => now(),
            ]
        );

        // 4. Permissions and each clinic's default roles
        $this->call(AclSeeder::class);

        $tenantAdmin->assignRole(Role::ownerFor($tenant));

        if (($devAdmin->wasRecentlyCreated || $tenantAdmin->wasRecentlyCreated) && ! env('SEED_ADMIN_PASSWORD')) {
            $this->command?->warn("Senha das contas criadas: {$password}");
        }
    }
}
