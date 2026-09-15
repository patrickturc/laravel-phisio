<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_tenants' => Tenant::count(),
            'active_tenants' => Tenant::where('status', 'active')->count(),
            'total_users' => User::where('is_dev_admin', false)->count(),
            'trial_tenants' => Tenant::onTrial()->count(),
            'trial_expired_tenants' => Tenant::trialExpired()->count(),
            'pending_plan_requests' => Tenant::pendingPlanRequest()->count(),
        ];

        return Inertia::render('DevAdmin/Dashboard', [
            'stats' => $stats,
            'recentTenants' => Tenant::latest()->take(5)->get(),
            'planRequests' => Tenant::pendingPlanRequest()
                ->latest('plan_requested_at')
                ->take(5)
                ->get(),
        ]);
    }
}
