<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'legal_name',
        'slug',
        'document',
        'state_registration',
        'email',
        'phone',
        'whatsapp',
        'website',
        'address',
        'cep',
        'street',
        'number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'technical_manager_name',
        'technical_manager_document',
        'notes',
        'logo_path',
        'status',
        'plan',
        'max_users',
        'features',
        'max_storage_mb',
    ];

    protected $appends = [
        'formatted_address',
    ];

    public function getFormattedAddressAttribute(): ?string
    {
        if ($this->street) {
            $parts = array_filter([
                $this->street . ($this->number ? ', ' . $this->number : ''),
                $this->complement,
                $this->neighborhood,
                $this->city ? ($this->city . ($this->state ? ' - ' . $this->state : '')) : null,
                $this->cep ? 'CEP: ' . $this->cep : null,
            ]);

            return implode(', ', $parts);
        }

        return $this->address;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'max_users' => 'integer',
            'max_storage_mb' => 'integer',
            'features' => 'array',
        ];
    }

    public function hasFeature(string $feature): bool
    {
        $defaultFeatures = [
            'financial' => true,
            'group_classes' => true,
            'clinical_protocols' => true,
            'reports' => true,
            'evolution_photos' => true,
        ];

        $features = array_merge($defaultFeatures, $this->features ?? []);

        return (bool) ($features[$feature] ?? true);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function usageLogs(): HasMany
    {
        return $this->hasMany(TenantUsageLog::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }
}
