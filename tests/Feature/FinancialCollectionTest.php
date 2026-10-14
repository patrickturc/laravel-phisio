<?php

use App\Models\FinancialTransaction;
use App\Models\Patient;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;

function cashier(): User
{
    $permissions = ['financial.transactions.view', 'financial.transactions.create', 'financial.transactions.edit', 'patients.manage.edit'];

    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }

    $user = User::factory()->create();
    $user->givePermissionTo($permissions);
    test()->actingAs($user);

    return $user;
}

function charge(User $user, array $attributes = []): FinancialTransaction
{
    $patient = $attributes['patient'] ?? Patient::create([
        'name' => 'Anizia de Jesus',
        'phone' => '(11) 98600-8482',
        'user_id' => $user->id,
    ]);
    unset($attributes['patient']);

    return FinancialTransaction::create(array_merge([
        'type' => 'income',
        'amount' => 160,
        'date' => '2026-10-13',
        'due_date' => '2026-10-13',
        'description' => 'Mensalidade: Pilates 2x — Anizia',
        'status' => 'pending',
        'patient_id' => $patient->id,
    ], $attributes));
}

beforeEach(function () {
    $this->travelTo('2026-10-13 09:00');
});

test('a payment is confirmed with how it was paid, and going back to pending clears it', function () {
    $user = cashier();
    $charge = charge($user);

    $this->post("/financial/{$charge->id}/mark-paid", ['payment_method' => 'pix'])->assertSessionHas('success');
    expect($charge->fresh())->status->toBe('paid')->payment_method->toBe('pix');

    $this->get("/financial/{$charge->id}/receipt")->assertOk();

    $this->post("/financial/{$charge->id}/mark-pending");
    expect($charge->fresh())->status->toBe('pending')->payment_method->toBeNull();

    $this->post("/financial/{$charge->id}/mark-paid", ['payment_method' => 'cheque'])->assertSessionHasErrors('payment_method');
});

test('a charge in review still counts as to receive, but never as overdue', function () {
    $user = cashier();
    $charge = charge($user, ['due_date' => '2026-10-01']);

    $this->post("/financial/{$charge->id}/mark-in-review", ['payment_method' => 'pix'])->assertSessionHas('success');

    $this->get('/financial/receivables')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('totals.total_pending', 160)
        ->where('totals.overdue_amount', 0)
        ->where('groups.0.transactions.0.status', 'in_review')
        ->has('reminders', 0)
    );
});

test('a written-off charge leaves the receivables and keeps the reason in the history', function () {
    $user = cashier();
    $charge = charge($user, ['due_date' => '2026-08-10']);

    $this->post("/financial/{$charge->id}/write-off", ['note' => 'Aluna mudou de cidade'])->assertSessionHas('success');

    expect($charge->fresh()->status)->toBe('written_off')
        ->and($charge->logs()->first())->action->toBe('written_off')->note->toBe('Aluna mudou de cidade');

    $this->get('/financial/receivables')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('totals.total_pending', 0)
        ->has('groups', 0)
    );
});

test('unknown statuses are refused', function () {
    cashier();

    $this->post('/financial', [
        'type' => 'income',
        'amount' => 10,
        'date' => '2026-10-13',
        'description' => 'Teste',
        'status' => 'maybe',
    ])->assertSessionHasErrors('status');
});

test('billing reminders cover the next three days, today and overdue charges', function () {
    $user = cashier();
    $patient = Patient::create(['name' => 'Maria de Fátima', 'nickname' => 'Fátima', 'phone' => '11955545551', 'user_id' => $user->id]);
    charge($user, ['patient' => $patient, 'due_date' => '2026-10-16', 'description' => 'Em 3 dias']);
    charge($user, ['patient' => $patient, 'due_date' => '2026-10-13', 'description' => 'Hoje']);
    charge($user, ['patient' => $patient, 'due_date' => '2026-10-03', 'description' => 'Vencida']);
    charge($user, ['patient' => $patient, 'due_date' => '2026-10-17', 'description' => 'Longe']);
    charge($user, ['patient' => $patient, 'due_date' => '2026-10-13', 'description' => 'Paga', 'status' => 'paid']);
    FinancialTransaction::create(['type' => 'income', 'amount' => 50, 'date' => '2026-10-13', 'due_date' => '2026-10-13', 'description' => 'Sem paciente', 'status' => 'pending']);

    $this->get('/financial/receivables')->assertInertia(fn (AssertableInertia $page) => $page
        ->has('reminders', 3)
        ->where('reminders.0.reference', 'Vencida')
        ->where('reminders.0.stage', 'overdue')
        ->where('reminders.0.days', 10)
        ->where('reminders.1.stage', 'due')
        ->where('reminders.2.stage', 'before')
        ->where('reminders.2.days', 3)
        ->where('reminders.2.nickname', 'Fátima')
        ->where('reminders.2.pix', null)
        ->where('hasPix', false)
        ->where('billingTemplates.billing_overdue', fn (string $text) => str_contains($text, '{valor}'))
    );
});

test('the WhatsApp billing reminder is recorded', function () {
    $user = cashier();
    $charge = charge($user);

    $this->postJson("/financial/{$charge->id}/whatsapp-reminder")->assertOk();

    expect($charge->fresh()->whatsapp_reminder_at)->not->toBeNull();
});

test('the clinic rewords its billing reminders', function () {
    $user = cashier();

    $this->patch('/message-templates', ['billing_overdue' => 'Oi {primeiro_nome}, {valor} em aberto.'])
        ->assertSessionHasNoErrors();

    expect($user->tenant->fresh()->messageTemplates()['billing_overdue'])->toBe('Oi {primeiro_nome}, {valor} em aberto.');
});

test('the PIX code follows the Banco Central format', function () {
    $user = cashier();
    $user->tenant->update([
        'name' => 'Fulano de Tal',
        'legal_name' => null,
        'city' => 'BRASILIA',
        'pix_key_type' => 'random',
        'pix_key' => '123e4567-e12b-12d1-a456-426655440000',
    ]);

    // Example from the BCB "Manual de Padrões para Iniciação do Pix".
    expect($user->tenant->pixPayload())->toBe(
        '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D'
    )->and($user->tenant->pixPayload(160))->toContain('5406160.00');
});

test('an open charge gets its PIX code and QR Code, once the clinic has a key', function () {
    $user = cashier();
    $charge = charge($user);

    $this->getJson("/financial/{$charge->id}/pix")->assertStatus(422);

    $user->tenant->update(['pix_key_type' => 'email', 'pix_key' => 'financeiro@sanare.com.br']);

    $this->getJson("/financial/{$charge->id}/pix")
        ->assertOk()
        ->assertJsonPath('amount', 160)
        ->assertJsonPath('payload', fn (string $payload) => str_contains($payload, 'financeiro@sanare.com.br'))
        ->assertJsonPath('qr_svg', fn (string $svg) => str_starts_with($svg, '<svg'));

    $this->get('/financial/receivables')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('reminders.0.pix', fn (string $pix) => str_contains($pix, '5406160.00'))
        ->where('hasPix', true)
    );

    $charge->update(['status' => 'paid']);
    $this->getJson("/financial/{$charge->id}/pix")->assertStatus(422);
});
