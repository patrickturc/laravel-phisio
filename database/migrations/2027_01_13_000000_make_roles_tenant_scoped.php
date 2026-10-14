<?php

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Roles used to be shared by every clinic: editing or deleting
 * "Recepcionista" in one clinic changed it for all of them. Each clinic now
 * gets its own copy of the default roles and of any role its users hold, with
 * the same permissions, and its users are moved onto those copies. Roles held
 * by users without a clinic (dev admins) stay as platform roles.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->after('id');
            $table->dropUnique(['name', 'guard_name']);
            $table->unique(['tenant_id', 'name', 'guard_name']);
            $table->index('tenant_id');

            // SQLite can only add a foreign key by rebuilding the table, and
            // dropping the old one inside the migration's transaction would
            // cascade-delete every role assignment.
            if (DB::getDriverName() !== 'sqlite') {
                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            }
        });

        $userType = (new User)->getMorphClass();
        $defaults = array_keys(Role::DEFAULTS);
        $platformRoles = DB::table('roles')->whereNull('tenant_id')->get();

        foreach (DB::table('tenants')->pluck('id') as $tenantId) {
            $userIds = DB::table('users')->where('tenant_id', $tenantId)->pluck('id');

            foreach ($platformRoles as $role) {
                $holders = DB::table('model_has_roles')
                    ->where('role_id', $role->id)
                    ->where('model_type', $userType)
                    ->whereIn('model_id', $userIds);

                if (! in_array($role->name, $defaults, true) && ! $holders->clone()->exists()) {
                    continue;
                }

                $copyId = DB::table('roles')->insertGetId([
                    'tenant_id' => $tenantId,
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('role_has_permissions')->insert(
                    DB::table('role_has_permissions')
                        ->where('role_id', $role->id)
                        ->pluck('permission_id')
                        ->map(fn ($permissionId) => ['permission_id' => $permissionId, 'role_id' => $copyId])
                        ->all()
                );

                $holders->update(['role_id' => $copyId]);
            }
        }

        // Default roles the platform never had (seeder not run) are created
        // from the built-in definitions.
        Tenant::query()->each(fn (Tenant $tenant) => Role::provisionDefaultsFor($tenant));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        foreach (DB::table('roles')->whereNotNull('tenant_id')->get() as $role) {
            $platformId = DB::table('roles')
                ->whereNull('tenant_id')
                ->where('name', $role->name)
                ->where('guard_name', $role->guard_name)
                ->value('id');

            if (! $platformId) {
                $platformId = DB::table('roles')->insertGetId([
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('role_has_permissions')->insert(
                    DB::table('role_has_permissions')
                        ->where('role_id', $role->id)
                        ->pluck('permission_id')
                        ->map(fn ($permissionId) => ['permission_id' => $permissionId, 'role_id' => $platformId])
                        ->all()
                );
            }

            DB::table('model_has_roles')->where('role_id', $role->id)->update(['role_id' => $platformId]);
        }

        DB::table('roles')->whereNotNull('tenant_id')->delete();

        Schema::table('roles', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['tenant_id']);
            }

            $table->dropUnique(['tenant_id', 'name', 'guard_name']);
            $table->dropIndex(['tenant_id']);
            $table->dropColumn('tenant_id');
            $table->unique(['name', 'guard_name']);
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
