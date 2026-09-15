<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'trial_started_at',
        'trial_ends_at',
        'self_registered',
        'requested_plan',
        'plan_requested_at',
        'plan_request_notes',
    ];

    protected $appends = [
        'formatted_address',
        'is_on_trial',
        'is_trial_expired',
        'trial_days_left',
        'has_pending_plan_request',
        'access_status',
    ];

    /**
     * Length of the self-service trial, in days.
     */
    public const TRIAL_DAYS = 15;

    /**
     * Plans that grant access without depending on a trial window.
     *
     * @var list<string>
     */
    public const PAID_PLANS = ['basic', 'pro'];

    public function getFormattedAddressAttribute(): ?string
    {
        if ($this->street) {
            $parts = array_filter([
                $this->street.($this->number ? ', '.$this->number : ''),
                $this->complement,
                $this->neighborhood,
                $this->city ? ($this->city.($this->state ? ' - '.$this->state : '')) : null,
                $this->cep ? 'CEP: '.$this->cep : null,
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
            'trial_started_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'plan_requested_at' => 'datetime',
            'self_registered' => 'boolean',
        ];
    }

    /**
     * A paid plan grants access regardless of the trial window.
     */
    public function hasPaidPlan(): bool
    {
        return in_array($this->plan, self::PAID_PLANS, true);
    }

    /**
     * Inside the trial window and not yet on a paid plan.
     */
    public function isOnTrial(): bool
    {
        return ! $this->hasPaidPlan()
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture();
    }

    /**
     * Trial window is over and no paid plan took its place.
     */
    public function isTrialExpired(): bool
    {
        return ! $this->hasPaidPlan()
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isPast();
    }

    /**
     * Whole days left in the trial, floored at zero. Null outside a trial.
     */
    public function trialDaysLeft(): ?int
    {
        if ($this->trial_ends_at === null || $this->hasPaidPlan()) {
            return null;
        }

        return max(0, (int) ceil(now()->floatDiffInDays($this->trial_ends_at, false)));
    }

    public function hasPendingPlanRequest(): bool
    {
        return $this->plan_requested_at !== null && ! $this->hasPaidPlan();
    }

    /**
     * Single value describing whether the organization can use the system:
     * suspended/inactive, trial, trial_expired or active (paid or manual).
     */
    public function accessStatus(): string
    {
        if (! $this->isActive()) {
            return $this->status;
        }

        if ($this->isTrialExpired()) {
            return 'trial_expired';
        }

        if ($this->isOnTrial()) {
            return 'trial';
        }

        return 'active';
    }

    /**
     * Whether the organization may use the application right now.
     */
    public function hasAppAccess(): bool
    {
        return $this->isActive() && ! $this->isTrialExpired();
    }

    /**
     * Start (or restart) a trial of the default length.
     */
    public function startTrial(?int $days = null): void
    {
        $this->forceFill([
            'trial_started_at' => now(),
            'trial_ends_at' => now()->addDays($days ?? self::TRIAL_DAYS),
        ])->save();
    }

    public function getIsOnTrialAttribute(): bool
    {
        return $this->isOnTrial();
    }

    public function getIsTrialExpiredAttribute(): bool
    {
        return $this->isTrialExpired();
    }

    public function getTrialDaysLeftAttribute(): ?int
    {
        return $this->trialDaysLeft();
    }

    public function getHasPendingPlanRequestAttribute(): bool
    {
        return $this->hasPendingPlanRequest();
    }

    public function getAccessStatusAttribute(): string
    {
        return $this->accessStatus();
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopeOnTrial(Builder $query): void
    {
        $query->whereNotIn('plan', self::PAID_PLANS)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now());
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopeTrialExpired(Builder $query): void
    {
        $query->whereNotIn('plan', self::PAID_PLANS)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now());
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopePendingPlanRequest(Builder $query): void
    {
        $query->whereNotNull('plan_requested_at')
            ->whereNotIn('plan', self::PAID_PLANS);
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopeSelfRegistered(Builder $query): void
    {
        $query->where('self_registered', true);
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
