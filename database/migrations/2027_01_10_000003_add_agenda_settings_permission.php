<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Permissions are otherwise only created by AclSeeder. Creating this one
     * here (and granting it to administrators) means existing clinics get the
     * agenda settings without re-running the seeder on deploy.
     */
    public function up(): void
    {
        $permission = Permission::findOrCreate('appointments.settings.manage', 'web');

        Role::where('name', 'Administrador')->where('guard_name', 'web')->get()
            ->each(fn (Role $role) => $role->givePermissionTo($permission));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::where('name', 'appointments.settings.manage')->where('guard_name', 'web')->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
