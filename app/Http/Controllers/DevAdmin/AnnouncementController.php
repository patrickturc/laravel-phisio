<?php

namespace App\Http\Controllers\DevAdmin;

use App\Http\Controllers\Controller;
use App\Models\SystemAnnouncement;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index()
    {
        $announcements = SystemAnnouncement::with('tenant')
            ->latest()
            ->paginate(15);

        $tenants = Tenant::orderBy('name')->get(['id', 'name']);

        return Inertia::render('DevAdmin/Announcements/Index', [
            'announcements' => $announcements,
            'tenants' => $tenants,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'type' => ['required', Rule::in(['info', 'warning', 'danger', 'success'])],
            'target_tenant_id' => ['nullable', 'uuid', 'exists:tenants,id'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        if (! isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        SystemAnnouncement::create($validated);

        return back()->with('success', 'Comunicado do sistema publicado com sucesso.');
    }

    public function toggleStatus(SystemAnnouncement $announcement)
    {
        $announcement->update([
            'is_active' => ! $announcement->is_active,
        ]);

        return back()->with('success', 'Status do comunicado alterado com sucesso.');
    }

    public function destroy(SystemAnnouncement $announcement)
    {
        $announcement->delete();

        return back()->with('success', 'Comunicado excluído com sucesso.');
    }
}
