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
        'patient_id',
        'membership_id',
        'recurring_expense_id',
        'created_by',
        'paid_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'due_date' => 'date',
            'paid_at' => 'date',
            'amount' => 'decimal:2',
        ];
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
