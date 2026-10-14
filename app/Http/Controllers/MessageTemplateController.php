<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The clinic's own wording for its WhatsApp messages: birthday, enrollment
 * anniversary, class reminder and billing reminders. An empty text restores
 * the default.
 */
class MessageTemplateController extends Controller
{
    /**
     * Who may change each message. Billing messages go out with the PIX code,
     * so they belong to whoever runs the clinic's finances.
     *
     * @var array<string, string>
     */
    private const PERMISSIONS = [
        'birthday' => 'patients.manage.edit',
        'enrollment' => 'patients.manage.edit',
        'reminder' => 'patients.manage.edit',
        'billing_before' => 'financial.transactions.edit',
        'billing_due' => 'financial.transactions.edit',
        'billing_overdue' => 'financial.transactions.edit',
    ];

    public function update(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        abort_if(! $tenant, 404);

        $validated = $request->validate([
            'birthday' => ['nullable', 'string', 'max:1000'],
            'enrollment' => ['nullable', 'string', 'max:1000'],
            'reminder' => ['nullable', 'string', 'max:1000'],
            'billing_before' => ['nullable', 'string', 'max:1000'],
            'billing_due' => ['nullable', 'string', 'max:1000'],
            'billing_overdue' => ['nullable', 'string', 'max:1000'],
        ]);

        foreach (array_keys($validated) as $key) {
            abort_unless($request->user()->can(self::PERMISSIONS[$key]), 403);
        }

        $tenant->update([
            'message_templates' => array_merge($tenant->message_templates ?? [], $validated),
        ]);

        return back()->with('success', 'Modelo de mensagem salvo.');
    }
}
