<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\CalendarFeedController;
use App\Http\Controllers\ClinicalProtocolController;
use App\Http\Controllers\CommercialPlanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EvolutionController;
use App\Http\Controllers\FinancialTransactionController;
use App\Http\Controllers\GroupClassController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientDocumentController;
use App\Http\Controllers\RecurringExpenseController;
use App\Http\Controllers\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function (Request $request) {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('auth/login', [
        'canResetPassword' => Features::enabled(Features::resetPasswords()),
        'canRegister' => Features::enabled(Features::registration()),
        'status' => $request->session()->get('status'),
    ]);
})->name('home');

Route::get('/feed/calendar/{token}.ics', [CalendarFeedController::class, 'feed'])
    ->middleware('throttle:30,1')
    ->name('calendar.feed');

/**
 * Register the seven standard resource routes, each guarded by the matching
 * granular permission. View covers index/show, create covers create/store,
 * edit covers edit/update and delete covers destroy.
 *
 * @param  string  $name  Route resource name (e.g. "patients")
 * @param  class-string  $controller
 * @param  string  $permission  Permission prefix (e.g. "patients.manage")
 * @param  list<string>  $except  Resource methods to skip
 */
$resourceWithPermissions = function (string $name, string $controller, string $permission, array $except = []): void {
    $param = Str::singular(str_replace('-', '_', $name));
    $skip = fn (string $action): bool => in_array($action, $except, true);
    $perm = fn (string $ability): string => "permission:{$permission}.{$ability}";

    if (! $skip('index')) {
        Route::get($name, [$controller, 'index'])->name("{$name}.index")->middleware($perm('view'));
    }
    if (! $skip('create')) {
        Route::get("{$name}/create", [$controller, 'create'])->name("{$name}.create")->middleware($perm('create'));
    }
    if (! $skip('store')) {
        Route::post($name, [$controller, 'store'])->name("{$name}.store")->middleware($perm('create'));
    }
    if (! $skip('show')) {
        Route::get("{$name}/{{$param}}", [$controller, 'show'])->name("{$name}.show")->middleware($perm('view'));
    }
    if (! $skip('edit')) {
        Route::get("{$name}/{{$param}}/edit", [$controller, 'edit'])->name("{$name}.edit")->middleware($perm('edit'));
    }
    if (! $skip('update')) {
        Route::match(['put', 'patch'], "{$name}/{{$param}}", [$controller, 'update'])->name("{$name}.update")->middleware($perm('edit'));
    }
    if (! $skip('destroy')) {
        Route::delete("{$name}/{{$param}}", [$controller, 'destroy'])->name("{$name}.destroy")->middleware($perm('delete'));
    }
};

// Dev Admin routes
Route::prefix('dev-admin')
    ->middleware(['auth', 'verified', 'dev-admin'])
    ->name('dev-admin.')
    ->group(function () {
        Route::get('/', [\App\Http\Controllers\DevAdmin\DashboardController::class, 'index'])->name('dashboard');
        Route::resource('tenants', \App\Http\Controllers\DevAdmin\TenantController::class);
        Route::post('tenants/{tenant}/toggle-status', [\App\Http\Controllers\DevAdmin\TenantController::class, 'toggleStatus'])
            ->name('tenants.toggle-status');
    });

Route::middleware(['auth', 'verified', 'tenant.active'])->group(function () use ($resourceWithPermissions) {
    Route::get('dashboard', [DashboardController::class, 'index'])
        ->middleware('permission:dashboard.view')
        ->name('dashboard');

    // Patients
    $resourceWithPermissions('patients', PatientController::class, 'patients.manage');

    // Patient Documents
    Route::post('patients/{patient}/documents', [PatientDocumentController::class, 'store'])
        ->middleware('permission:patients.manage.edit')
        ->name('patients.documents.store');
    Route::get('patients/documents/{patient_document}/download', [PatientDocumentController::class, 'download'])
        ->middleware('permission:patients.manage.view')
        ->name('patients.documents.download');
    Route::get('patients/documents/{patient_document}/preview', [PatientDocumentController::class, 'preview'])
        ->middleware('permission:patients.manage.view')
        ->name('patients.documents.preview');
    Route::delete('patients/documents/{patient_document}', [PatientDocumentController::class, 'destroy'])
        ->middleware('permission:patients.manage.edit')
        ->name('patients.documents.destroy');

    // Appointments
    Route::get('api/appointments/events', [AppointmentController::class, 'events'])
        ->middleware('permission:appointments.manage.view')
        ->name('appointments.events');
    Route::get('api/appointments/slots-view', [AppointmentController::class, 'slotsView'])
        ->middleware('permission:appointments.manage.view')
        ->name('appointments.slots-view');
    Route::get('api/appointments/{appointment}', [AppointmentController::class, 'details'])
        ->middleware('permission:appointments.manage.view')
        ->name('appointments.details');
    Route::post('appointments/{appointment}/patients/{patientId}/status', [AppointmentController::class, 'updateStatus'])
        ->middleware('permission:appointments.manage.edit')
        ->name('appointments.update-status');
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'updateAppointmentStatus'])
        ->middleware('permission:appointments.manage.edit')
        ->name('appointments.update-session-status');
    Route::post('appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])
        ->middleware('permission:appointments.manage.edit')
        ->name('appointments.reschedule');
    $resourceWithPermissions('appointments', AppointmentController::class, 'appointments.manage');

    // Evolutions
    Route::get('evolutions/patient/{patient}', [EvolutionController::class, 'patientEvolutions'])
        ->middleware('permission:evolutions.manage.view')
        ->name('evolutions.patient');
    Route::get('evolutions/{evolution}/pdf', [EvolutionController::class, 'pdf'])
        ->middleware('permission:evolutions.manage.view')
        ->name('evolutions.pdf');
    $resourceWithPermissions('evolutions', EvolutionController::class, 'evolutions.manage', ['create', 'edit']);

    // Memberships
    Route::post('memberships/{membership}/renew', [MembershipController::class, 'renew'])
        ->middleware('permission:memberships.manage.create')
        ->name('memberships.renew');
    $resourceWithPermissions('memberships', MembershipController::class, 'memberships.manage');

    // Financial
    Route::get('financial/receivables', [FinancialTransactionController::class, 'receivables'])
        ->middleware('permission:financial.transactions.view')
        ->name('financial.receivables');
    Route::post('financial/{financial}/mark-paid', [FinancialTransactionController::class, 'markAsPaid'])
        ->middleware('permission:financial.transactions.edit')
        ->name('financial.mark-paid');
    Route::post('financial/{financial}/mark-pending', [FinancialTransactionController::class, 'markAsPending'])
        ->middleware('permission:financial.transactions.edit')
        ->name('financial.mark-pending');
    Route::get('financial/{financial}/receipt', [FinancialTransactionController::class, 'receipt'])
        ->middleware('permission:financial.transactions.view')
        ->name('financial.receipt');
    Route::get('financial', [FinancialTransactionController::class, 'index'])
        ->middleware('permission:financial.transactions.view')
        ->name('financial.index');
    Route::post('financial', [FinancialTransactionController::class, 'store'])
        ->middleware('permission:financial.transactions.create')
        ->name('financial.store');
    Route::match(['put', 'patch'], 'financial/{financial}', [FinancialTransactionController::class, 'update'])
        ->middleware('permission:financial.transactions.edit')
        ->name('financial.update');
    Route::delete('financial/{financial}', [FinancialTransactionController::class, 'destroy'])
        ->middleware('permission:financial.transactions.delete')
        ->name('financial.destroy');

    // Recurring Expenses
    Route::post('recurring-expenses/{recurringExpense}/toggle-active', [RecurringExpenseController::class, 'toggleActive'])
        ->middleware('permission:recurring_expenses.manage.edit')
        ->name('recurring-expenses.toggle-active');
    $resourceWithPermissions('recurring-expenses', RecurringExpenseController::class, 'recurring_expenses.manage');

    // Reports
    Route::get('reports', [ReportController::class, 'index'])
        ->middleware('permission:reports.manage.view')
        ->name('reports.index');
    Route::get('reports/pdf', [ReportController::class, 'pdf'])
        ->middleware('permission:reports.manage.view')
        ->name('reports.pdf');

    // Clinical Protocols (treatment plans)
    $resourceWithPermissions('clinical-protocols', ClinicalProtocolController::class, 'treatment_plans.manage');

    // Commercial Plans
    $resourceWithPermissions('commercial-plans', CommercialPlanController::class, 'commercial_plans.manage');

    // Group Classes
    Route::post('group-classes/extend-active', [GroupClassController::class, 'extendActiveClasses'])
        ->middleware('permission:group_classes.manage.edit')
        ->name('group-classes.extend-active');
    Route::post('group-classes/{group_class}/generate-appointments', [GroupClassController::class, 'generateAppointments'])
        ->middleware('permission:group_classes.manage.edit')
        ->name('group-classes.generate');
    Route::post('group-classes/{group_class}/update-future-appointments', [GroupClassController::class, 'updateFutureAppointments'])
        ->middleware('permission:group_classes.manage.edit')
        ->name('group-classes.update-future');
    $resourceWithPermissions('group-classes', GroupClassController::class, 'group_classes.manage');
});

require __DIR__.'/settings.php';
