<?php

namespace App\Http\Middleware;

use App\Actions\BuildPatientDetails;
use App\Models\Patient;
use App\Models\SystemAnnouncement;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user() ? array_merge($request->user()->makeVisible('calendar_token')->toArray(), [
                    'roles' => $request->user()->getRoleNames(),
                    'permissions' => $request->user()->getAllPermissions()->pluck('name'),
                    // "notes" are the dev admin's internal notes about the clinic.
                    'tenant' => $request->user()->tenant?->makeHidden('notes'),
                    'is_dev_admin' => $request->user()->is_dev_admin,
                ]) : null,
            ],
            // The patient details modal, open on any screen while the URL
            // carries ?patient={id}. Only computed when asked for.
            'patientDetails' => function () use ($request) {
                $patientId = $request->query('patient');
                $user = $request->user();

                if (! is_string($patientId) || ! Str::isUuid($patientId) || ! $user?->tenant_id || ! $user->can('patients.manage.view')) {
                    return null;
                }

                $patient = Patient::where('tenant_id', $user->tenant_id)->find($patientId);

                return $patient ? app(BuildPatientDetails::class)($patient, $user) : null;
            },
            'trial' => function () use ($request) {
                $tenant = $request->user()?->tenant;

                if (! $tenant || ! $tenant->isOnTrial()) {
                    return null;
                }

                return [
                    'days_left' => $tenant->trialDaysLeft(),
                    'ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                    'has_pending_request' => $tenant->hasPendingPlanRequest(),
                ];
            },
            'profileCompletion' => function () use ($request) {
                $tenant = $request->user()?->tenant;

                if (! $tenant) {
                    return null;
                }

                $missing = $tenant->missingProfileFields();
                $required = count(Tenant::REQUIRED_PROFILE_FIELDS);

                return [
                    'complete' => $missing === [],
                    'missing' => $missing,
                    'missing_count' => count($missing),
                    'percent' => (int) round((($required - count($missing)) / $required) * 100),
                    'can_edit' => $request->user()->can('settings.organization.manage'),
                ];
            },
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'impersonation' => $request->session()->has('impersonated_by') ? [
                'active' => true,
                'tenant_name' => $request->user()?->tenant?->name ?? 'Clínica',
                'user_name' => $request->user()?->name,
            ] : null,
            'announcements' => fn () => $request->user() && $request->user()->tenant_id
                ? SystemAnnouncement::active()
                    ->forTenant($request->user()->tenant_id)
                    ->latest()
                    ->take(3)
                    ->get(['id', 'title', 'message', 'type'])
                : [],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
        ];
    }
}
