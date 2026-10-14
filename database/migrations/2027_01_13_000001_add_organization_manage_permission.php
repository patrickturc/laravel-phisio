<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * The clinic profile (including the PIX key every charge is paid to) used to
 * be editable by anyone allowed to view the user list. It gets its own
 * permission, granted to each clinic's Administrador.
 */
return new class extends Migration
{
    public function up(): void
    {
        $permission = Permission::findOrCreate('settings.organization.manage', 'web');

        Role::where('name', Role::ADMIN)->where('guard_name', 'web')->get()
            ->each(fn (Role $role) => $role->givePermissionTo($permission));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::where('name', 'settings.organization.manage')->where('guard_name', 'web')->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
