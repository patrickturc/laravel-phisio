<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Tenant
        $tenant = \App\Models\Tenant::firstOrCreate(
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
                'password' => bcrypt('password'),
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
                'password' => bcrypt('password'),
                'is_dev_admin' => false,
                'tenant_id' => $tenant->id,
                'email_verified_at' => now(),
            ]
        );

        // 4. Create basic roles and permissions for the tenant admin
        $adminRole = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $tenantAdmin->assignRole($adminRole);

        // Chama o seeder de permissões e perfis
        $this->call(AclSeeder::class);
    }
}
