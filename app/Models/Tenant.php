<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'legal_name',
        'owner_name',
        'owner_document',
        'owner_birthdate',
        'owner_photo_path',
        'slug',
        'document',
        'state_registration',
        'email',
        'phone',
        'whatsapp',
        'website',
        'bio',
        'instagram',
        'pix_key_type',
        'pix_key',
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
        'message_templates',
        'schedule_settings',
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
        'extra_users',
        'requested_extra_users',
        'profile_completed_at',
    ];

    /**
     * The tenant is shared with every page (HandleInertiaRequests), so the
     * owner's personal data stays out of it. The profile page reads these
     * explicitly.
     *
     * @var list<string>
     */
    protected $hidden = [
        'owner_document',
        'owner_birthdate',
    ];

    protected $appends = [
        'formatted_address',
        'is_on_trial',
        'is_trial_expired',
        'trial_days_left',
        'has_pending_plan_request',
        'access_status',
        'seat_limit',
        'profile_complete',
        'missing_profile_fields',
    ];

    /**
     * Length of the self-service trial, in days.
     */
    public const TRIAL_DAYS = 15;

    /**
     * Plans that grant access without depending on a trial window. Everything
     * in config/plans.php except the trial itself.
     *
     * @return list<string>
     */
    public static function paidPlans(): array
    {
        return array_values(array_diff(array_keys(config('plans.plans', [])), ['free']));
    }

    /**
     * Plans an organization is allowed to ask for.
     *
     * @return list<string>
     */
    public static function selectablePlans(): array
    {
        return array_values(array_keys(array_filter(
            config('plans.plans', []),
            fn (array $plan): bool => (bool) ($plan['selectable'] ?? false),
        )));
    }

    /**
     * Definition of a plan, falling back to the trial when the key is unknown.
     *
     * @return array<string, mixed>
     */
    public static function planConfig(string $plan): array
    {
        $plans = config('plans.plans', []);

        return $plans[$plan] ?? $plans['free'] ?? [];
    }

    /**
     * Organization fields that must be filled before the account counts as
     * complete. Collected after signup so the trial form can stay short.
     *
     * @var list<string>
     */
    /**
     * Built-in WhatsApp messages, used until the clinic saves its own:
     * birthday and enrollment anniversary (celebrations page), the class
     * reminder (agenda) and the billing reminders before, on and after the
     * due date. Placeholders: {nome}, {primeiro_nome}, {idade}, {anos},
     * {clinica}; class reminder {data}, {horario}, {profissional}, {sala};
     * billing {valor}, {vencimento}, {dias}, {referente}, {pix}.
     *
     * @var array<string, string>
     */
    public const DEFAULT_MESSAGE_TEMPLATES = [
        'birthday' => "Olá, {primeiro_nome}! 🎉\n\nToda a equipe da {clinica} deseja um feliz aniversário! Que seu novo ciclo venha com muita saúde, disposição e movimento.\n\nUm grande abraço!",
        'enrollment' => "Olá, {primeiro_nome}! 💚\n\nHoje completamos {anos} de parceria aqui na {clinica}. Obrigado pela confiança e por fazer parte da nossa história.\n\nVamos juntos para o próximo ano!",
        'reminder' => "Olá, {primeiro_nome}! 😊\n\nPassando para lembrar da sua aula na {clinica}: {data}, às {horario}, com {profissional}.\n\nPode confirmar sua presença respondendo esta mensagem?",
        'billing_before' => "Olá, {primeiro_nome}! 😊\n\nPassando para lembrar que o pagamento de {valor} referente a {referente} vence em {dias}, no dia {vencimento}.{pix}\n\nQualquer dúvida, é só chamar!",
        'billing_due' => "Olá, {primeiro_nome}! 😊\n\nHoje vence o pagamento de {valor} referente a {referente}.{pix}\n\nObrigado!",
        'billing_overdue' => "Olá, {primeiro_nome}, tudo bem?\n\nO pagamento de {valor} referente a {referente}, com vencimento em {vencimento}, ainda está em aberto.{pix}\n\nSe já pagou, é só nos enviar o comprovante e desconsiderar esta mensagem. 🙏",
    ];

    /**
     * The clinic's message templates, falling back to the defaults.
     *
     * @return array{birthday: string, enrollment: string, reminder: string, billing_before: string, billing_due: string, billing_overdue: string}
     */
    public function messageTemplates(): array
    {
        $saved = array_filter($this->message_templates ?? [], fn ($text): bool => filled($text));

        return array_merge(self::DEFAULT_MESSAGE_TEMPLATES, $saved);
    }

    /**
     * Agenda defaults until the clinic saves its own: business hours per
     * weekday (0 = Sunday), breaks hidden from the agenda, students per time
     * slot and the default session length in minutes.
     *
     * @var array{business_hours: list<array{open: bool, start: string, end: string}>, breaks: list<array{start: string, end: string}>, slot_capacity: int, default_duration: int, rooms: list<string>}
     */
    public const DEFAULT_SCHEDULE_SETTINGS = [
        'business_hours' => [
            ['open' => false, 'start' => '08:00', 'end' => '12:00'],
            ['open' => true, 'start' => '07:00', 'end' => '20:00'],
            ['open' => true, 'start' => '07:00', 'end' => '20:00'],
            ['open' => true, 'start' => '07:00', 'end' => '20:00'],
            ['open' => true, 'start' => '07:00', 'end' => '20:00'],
            ['open' => true, 'start' => '07:00', 'end' => '20:00'],
            ['open' => true, 'start' => '08:00', 'end' => '12:00'],
        ],
        'breaks' => [],
        'slot_capacity' => 6,
        'default_duration' => 50,
        'rooms' => [],
    ];

    /**
     * The clinic's agenda settings, filled in with the defaults.
     *
     * @return array{business_hours: list<array{open: bool, start: string, end: string}>, breaks: list<array{start: string, end: string}>, slot_capacity: int, default_duration: int, rooms: list<string>}
     */
    public function scheduleSettings(): array
    {
        $saved = $this->schedule_settings ?? [];
        $settings = array_merge(self::DEFAULT_SCHEDULE_SETTINGS, $saved);

        $settings['business_hours'] = array_map(
            fn (int $day): array => array_merge(
                self::DEFAULT_SCHEDULE_SETTINGS['business_hours'][$day],
                $saved['business_hours'][$day] ?? [],
            ),
            range(0, 6),
        );

        return $settings;
    }

    /**
     * How many students fit in one time slot.
     */
    public function slotCapacity(): int
    {
        return (int) $this->scheduleSettings()['slot_capacity'];
    }

    /**
     * PIX "copia e cola" for the clinic's key: a static BR Code (EMV format of
     * the Banco Central), optionally with the amount filled in. Null when the
     * clinic has no PIX key.
     */
    public function pixPayload(?float $amount = null): ?string
    {
        if (! $this->pix_key) {
            return null;
        }

        $field = fn (string $id, string $value): string => $id.str_pad((string) strlen($value), 2, '0', STR_PAD_LEFT).$value;
        // Name and city must be plain ASCII and short.
        $plain = fn (string $value, int $max): string => substr(trim(preg_replace('/[^A-Za-z0-9 ]/', '', Str::ascii($value))), 0, $max) ?: 'X';

        $payload = $field('00', '01')
            .$field('26', $field('00', 'br.gov.bcb.pix').$field('01', $this->pix_key))
            .$field('52', '0000')
            .$field('53', '986')
            .($amount !== null && $amount > 0 ? $field('54', number_format($amount, 2, '.', '')) : '')
            .$field('58', 'BR')
            .$field('59', $plain($this->legal_name ?: $this->name, 25))
            .$field('60', $plain($this->city ?: 'Brasil', 15))
            .$field('62', $field('05', '***'))
            .'6304';

        return $payload.self::pixChecksum($payload);
    }

    /**
     * CRC16-CCITT (polynomial 0x1021, initial 0xFFFF) that closes a BR Code.
     */
    private static function pixChecksum(string $payload): string
    {
        $crc = 0xFFFF;

        for ($i = 0; $i < strlen($payload); $i++) {
            $crc ^= ord($payload[$i]) << 8;

            for ($bit = 0; $bit < 8; $bit++) {
                $crc = ($crc & 0x8000) ? (($crc << 1) ^ 0x1021) : ($crc << 1);
                $crc &= 0xFFFF;
            }
        }

        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    public const REQUIRED_PROFILE_FIELDS = [
        'document',
        'cep',
        'street',
        'number',
        'neighborhood',
        'city',
        'state',
        'technical_manager_name',
        'technical_manager_document',
    ];

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
            'message_templates' => 'array',
            'schedule_settings' => 'array',
            'owner_birthdate' => 'date:Y-m-d',
            'trial_started_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'plan_requested_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'self_registered' => 'boolean',
            'extra_users' => 'integer',
            'requested_extra_users' => 'integer',
        ];
    }

    /**
     * A paid plan grants access regardless of the trial window.
     */
    public function hasPaidPlan(): bool
    {
        return in_array($this->plan, self::paidPlans(), true);
    }

    /**
     * Seats available to the organization: what the plan includes plus the
     * extra ones it bought. max_users stays the stored source of truth so a
     * dev admin can still grant a one-off exception.
     */
    public function seatLimit(): int
    {
        return max(1, (int) $this->max_users);
    }

    /**
     * Seats a plan would give, before any dev-admin override.
     */
    public function seatsForPlan(string $plan, ?int $extraUsers = null): int
    {
        $base = (int) (self::planConfig($plan)['users'] ?? 1);

        return $base + max(0, $extraUsers ?? (int) $this->extra_users);
    }

    public function seatsInUse(): int
    {
        return $this->users()->count();
    }

    public function hasSeatAvailable(): bool
    {
        return $this->seatsInUse() < $this->seatLimit();
    }

    /**
     * Move the organization onto a plan, applying its seats and storage.
     *
     * Plans do not gate features: every plan gives the whole system, and only
     * capacity differs. The tenant's own "features" flags are left untouched,
     * since those are per-organization switches a dev admin sets by hand.
     */
    public function applyPlan(string $plan, ?int $extraUsers = null): void
    {
        $config = self::planConfig($plan);
        $extra = max(0, $extraUsers ?? (int) $this->extra_users);

        if (! ($config['allows_extra_users'] ?? false)) {
            $extra = 0;
        }

        $this->update([
            'plan' => $plan,
            'extra_users' => $extra,
            'max_users' => (int) ($config['users'] ?? 1) + $extra,
            'max_storage_mb' => (int) ($config['storage_mb'] ?? 1024),
        ]);
    }

    /**
     * Fields still missing before the organization profile is usable for
     * billing and for the clinic's own documents.
     *
     * @return list<string>
     */
    public function missingProfileFields(): array
    {
        return array_values(array_filter(
            self::REQUIRED_PROFILE_FIELDS,
            fn (string $field): bool => blank($this->{$field}),
        ));
    }

    public function isProfileComplete(): bool
    {
        return $this->missingProfileFields() === [];
    }

    /**
     * Keep profile_completed_at in step with the data actually on the record,
     * so the reminder banner clears itself the moment the form is finished.
     */
    public function syncProfileCompletion(): void
    {
        $complete = $this->isProfileComplete();

        if ($complete && $this->profile_completed_at === null) {
            $this->forceFill(['profile_completed_at' => now()])->save();
        } elseif (! $complete && $this->profile_completed_at !== null) {
            $this->forceFill(['profile_completed_at' => null])->save();
        }
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

    /**
     * Appended attributes are computed on every serialization, including for
     * partial selects such as get(['id', 'name']). Those rows never loaded the
     * columns these accessors read, so each one reports null instead of
     * deriving a wrong answer from missing data.
     */
    private function loaded(string ...$columns): bool
    {
        foreach ($columns as $column) {
            if (! array_key_exists($column, $this->attributes)) {
                return false;
            }
        }

        return true;
    }

    public function getIsOnTrialAttribute(): ?bool
    {
        return $this->loaded('plan', 'trial_ends_at') ? $this->isOnTrial() : null;
    }

    public function getIsTrialExpiredAttribute(): ?bool
    {
        return $this->loaded('plan', 'trial_ends_at') ? $this->isTrialExpired() : null;
    }

    public function getTrialDaysLeftAttribute(): ?int
    {
        return $this->loaded('plan', 'trial_ends_at') ? $this->trialDaysLeft() : null;
    }

    public function getHasPendingPlanRequestAttribute(): ?bool
    {
        return $this->loaded('plan', 'plan_requested_at') ? $this->hasPendingPlanRequest() : null;
    }

    public function getAccessStatusAttribute(): ?string
    {
        return $this->loaded('status', 'plan', 'trial_ends_at') ? $this->accessStatus() : null;
    }

    public function getSeatLimitAttribute(): ?int
    {
        return $this->loaded('max_users') ? $this->seatLimit() : null;
    }

    public function getProfileCompleteAttribute(): ?bool
    {
        return $this->loaded(...self::REQUIRED_PROFILE_FIELDS) ? $this->isProfileComplete() : null;
    }

    /**
     * @return list<string>|null
     */
    public function getMissingProfileFieldsAttribute(): ?array
    {
        return $this->loaded(...self::REQUIRED_PROFILE_FIELDS) ? $this->missingProfileFields() : null;
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopeOnTrial(Builder $query): void
    {
        $query->whereNotIn('plan', self::paidPlans())
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now());
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopeTrialExpired(Builder $query): void
    {
        $query->whereNotIn('plan', self::paidPlans())
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now());
    }

    /**
     * @param  Builder<Tenant>  $query
     */
    public function scopePendingPlanRequest(Builder $query): void
    {
        $query->whereNotNull('plan_requested_at')
            ->whereNotIn('plan', self::paidPlans());
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

    public function payments(): HasMany
    {
        return $this->hasMany(TenantPayment::class);
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
