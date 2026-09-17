<?php

use App\Http\Controllers\RoleController;
use App\Http\Controllers\Settings\BillingController;
use App\Http\Controllers\Settings\OrganizationController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/profile/calendar-token', [ProfileController::class, 'generateCalendarToken'])->name('profile.calendar-token.generate');
    Route::delete('settings/profile/calendar-token', [ProfileController::class, 'revokeCalendarToken'])->name('profile.calendar-token.revoke');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    // Organization profile — the "finish your registration" destination.
    Route::middleware('permission:settings.users.view')->group(function () {
        Route::get('settings/organization', [OrganizationController::class, 'edit'])->name('organization.edit');
        Route::patch('settings/organization', [OrganizationController::class, 'update'])->name('organization.update');

        // Billing — plan management and payment history.
        Route::get('settings/billing', [BillingController::class, 'edit'])->name('billing.edit');
        Route::post('settings/billing/request-plan', [BillingController::class, 'requestPlan'])->name('billing.request-plan');
    });

    // Users Management
    Route::group(['middleware' => ['permission:settings.users.view']], function () {
        Route::get('settings/users', [UserController::class, 'index'])->name('users.index');
        Route::post('settings/users', [UserController::class, 'store'])->name('users.store')->middleware('permission:settings.users.create');
        Route::put('settings/users/{user}', [UserController::class, 'update'])->name('users.update')->middleware('permission:settings.users.edit');
        Route::delete('settings/users/{user}', [UserController::class, 'destroy'])->name('users.destroy')->middleware('permission:settings.users.delete');
    });

    // Roles & Permissions Management
    Route::group(['middleware' => ['permission:settings.roles.view']], function () {
        Route::get('settings/roles', [RoleController::class, 'index'])->name('roles.index');
        Route::post('settings/roles', [RoleController::class, 'store'])->name('roles.store')->middleware('permission:settings.roles.create');
        Route::put('settings/roles/{role}', [RoleController::class, 'update'])->name('roles.update')->middleware('permission:settings.roles.edit');
        Route::delete('settings/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy')->middleware('permission:settings.roles.delete');
    });
});
