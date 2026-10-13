<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The clinic's own wording for its WhatsApp messages: birthday, enrollment
 * anniversary and class reminder. An empty text restores the default.
 */
class MessageTemplateController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;

        abort_if(! $tenant, 404);

        $validated = $request->validate([
            'birthday' => ['nullable', 'string', 'max:1000'],
            'enrollment' => ['nullable', 'string', 'max:1000'],
            'reminder' => ['nullable', 'string', 'max:1000'],
        ]);

        $tenant->update([
            'message_templates' => array_merge($tenant->message_templates ?? [], $validated),
        ]);

        return back()->with('success', 'Modelo de mensagem salvo.');
    }
}
