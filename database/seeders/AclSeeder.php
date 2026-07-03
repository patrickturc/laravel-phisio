<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\User;

class AclSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Permissions List
        $permissions = [
            // Dashboard
            'dashboard.view',
            
            // Patients
            'patients.manage.view',
            'patients.manage.create',
            'patients.manage.edit',
            'patients.manage.delete',

            // Appointments
            'appointments.manage.view',
            'appointments.manage.create',
            'appointments.manage.edit',
            'appointments.manage.delete',

            // Group Classes
            'group_classes.manage.view',
            'group_classes.manage.create',
            'group_classes.manage.edit',
            'group_classes.manage.delete',

            // Evolutions
            'evolutions.manage.view',
            'evolutions.manage.create',
            'evolutions.manage.edit',
            'evolutions.manage.delete',

            // Treatment Plans / Clinical Protocols
            'treatment_plans.manage.view',
            'treatment_plans.manage.create',
            'treatment_plans.manage.edit',
            'treatment_plans.manage.delete',

            // Memberships
            'memberships.manage.view',
            'memberships.manage.create',
            'memberships.manage.edit',
            'memberships.manage.delete',

            // Commercial Plans
            'commercial_plans.manage.view',
            'commercial_plans.manage.create',
            'commercial_plans.manage.edit',
            'commercial_plans.manage.delete',

            // Financial
            'financial.transactions.view',
            'financial.transactions.create',
            'financial.transactions.edit',
            'financial.transactions.delete',

            // Recurring Expenses
            'recurring_expenses.manage.view',
            'recurring_expenses.manage.create',
            'recurring_expenses.manage.edit',
            'recurring_expenses.manage.delete',

            // Reports
            'reports.manage.view',

            // Calendar Sync
            'calendar.sync.manage',

            // Marks a user as a treating professional: appears in the
            // "Profissional Responsável" selector and in the earnings-by-
            // professional report. Independent of the role's name.
            'professional.attend',

            // Settings
            'settings.users.view',
            'settings.users.create',
            'settings.users.edit',
            'settings.users.delete',
            'settings.roles.view',
            'settings.roles.create',
            'settings.roles.edit',
            'settings.roles.delete',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // Create Roles and assign created permissions
        $roleAdmin = Role::findOrCreate('Administrador', 'web');
        $roleAdmin->givePermissionTo(Permission::all());

        $roleReceptionist = Role::findOrCreate('Recepcionista', 'web');
        $roleReceptionist->givePermissionTo([
            'dashboard.view',
            'patients.manage.view',
            'patients.manage.create',
            'patients.manage.edit',
            'appointments.manage.view',
            'appointments.manage.create',
            'appointments.manage.edit',
            'group_classes.manage.view',
            'memberships.manage.view',
            'memberships.manage.create',
            'commercial_plans.manage.view',
            'financial.transactions.view',
            'financial.transactions.create', // Can receive payments
        ]);

        $rolePhysio = Role::findOrCreate('Fisioterapeuta', 'web');
        $rolePhysio->givePermissionTo([
            'dashboard.view',
            'patients.manage.view',
            'appointments.manage.view',
            'group_classes.manage.view',
            'evolutions.manage.view',
            'evolutions.manage.create',
            'evolutions.manage.edit',
            'treatment_plans.manage.view',
            'treatment_plans.manage.create',
            'treatment_plans.manage.edit',
            'calendar.sync.manage',
            'professional.attend',
        ]);

        // Assign 'Administrador' role to the admin user
        $user = User::where('email', 'paturchette@gmail.com')->first();
        if ($user) {
            $user->assignRole($roleAdmin);
        }
    }
}
