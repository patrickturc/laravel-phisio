<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class FinancialTransactionLog extends Model
{
    use BelongsToTenant, HasUuids;

    protected $fillable = [
        'tenant_id',
        'financial_transaction_id',
        'action',
        'from_status',
        'to_status',
        'note',
        'user_id',
    ];

    public function transaction()
    {
        return $this->belongsTo(FinancialTransaction::class, 'financial_transaction_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
