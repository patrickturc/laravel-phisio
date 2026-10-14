<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialTransaction extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'type',
        'amount',
        'date',
        'due_date',
        'paid_at',
        'description',
        'category',
        'status',
        'payment_method',
        'whatsapp_reminder_at',
        'patient_id',
        'membership_id',
        'recurring_expense_id',
        'created_by',
        'paid_by',
    ];

    /**
     * pending: not paid yet · in_review: the patient says they paid, the
     * clinic still has to check · paid · written_off: given up on (perda).
     */
    public const STATUSES = ['pending', 'in_review', 'paid', 'written_off'];

    /**
     * Still waiting for the money: what "a receber" adds up.
     */
    public const OPEN_STATUSES = ['pending', 'in_review'];

    /**
     * @var array<string, string>
     */
    public const PAYMENT_METHODS = [
        'pix' => 'PIX',
        'cash' => 'Dinheiro',
        'credit_card' => 'Cartão de crédito',
        'debit_card' => 'Cartão de débito',
        'transfer' => 'Transferência',
        'boleto' => 'Boleto',
        'other' => 'Outro',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'due_date' => 'date',
            'paid_at' => 'date',
            'whatsapp_reminder_at' => 'datetime',
            'amount' => 'decimal:2',
        ];
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', self::OPEN_STATUSES);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'pending')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString());
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function recurringExpense()
    {
        return $this->belongsTo(RecurringExpense::class);
    }

    public function logs()
    {
        return $this->hasMany(FinancialTransactionLog::class)->latest();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payer()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    /**
     * Record an audit entry for this transaction.
     */
    public function logAction(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $note = null): void
    {
        $this->logs()->create([
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'note' => $note,
            'user_id' => auth()->id(),
        ]);
    }
}
