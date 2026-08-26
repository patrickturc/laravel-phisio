<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class Patient extends Model
{
    use BelongsToTenant, HasUuids, Notifiable, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'nickname',
        'phone',
        'email',
        'birthdate',
        'gender',
        'type',
        'cpf',
        'rg',
        'profession',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'health_notes',
        'cep',
        'street',
        'number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function appointments()
    {
        return $this->belongsToMany(Appointment::class)
            ->withPivot('status')
            ->withTimestamps();
    }

    public function evolutions()
    {
        return $this->hasMany(Evolution::class, 'paciente_id');
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }

    public function activeMembership()
    {
        return $this->hasOne(Membership::class)->where('status', 'active')->latest('end_date');
    }

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }

    public function documents()
    {
        return $this->hasMany(PatientDocument::class);
    }
}
