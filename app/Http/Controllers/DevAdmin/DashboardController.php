<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_tenants' => Tenant::count(),
            'active_tenants' => Tenant::where('status', 'active')->count(),
            'total_users' => User::where('is_dev_admin', false)->count(),
        ];

        return Inertia::render('DevAdmin/Dashboard', [
            'stats' => $stats,
            'recentTenants' => Tenant::latest()->take(5)->get(),
        ]);
    }
}
