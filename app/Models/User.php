<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Concerns\BelongsToTenant;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use BelongsToTenant, HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'calendar_token',
        'agenda_color',
        'agenda_availability',
        'tenant_id',
        'is_dev_admin',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
        'calendar_token',
        'is_dev_admin',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_dev_admin' => 'boolean',
            'agenda_availability' => 'array',
        ];
    }

    /**
     * Users flagged as treating professionals — those whose role (or direct
     * grant) carries the "professional.attend" permission. Queried straight from
     * the DB (roles/permissions tables) instead of Spatie's cached lookup, so it
     * never throws PermissionDoesNotExist on a stale cache and survives renaming
     * the role.
     */
    public function scopeProfessionals($query)
    {
        return $query->where(function ($q) {
            $q->whereHas('roles.permissions', fn ($p) => $p->where('name', 'professional.attend'))
                ->orWhereHas('permissions', fn ($p) => $p->where('name', 'professional.attend'));
        });
    }

    /**
     * Card colours for professionals that never picked one, distinct enough
     * to tell apart side by side in the agenda.
     *
     * @var list<string>
     */
    public const AGENDA_PALETTE = [
        '#3b82f6', '#f97316', '#10b981', '#a855f7',
        '#ec4899', '#eab308', '#06b6d4', '#ef4444',
    ];

    /**
     * The professional's colour in the agenda; a stable palette colour
     * (by id) until one is chosen.
     */
    public function agendaColor(): string
    {
        return $this->agenda_color ?: self::AGENDA_PALETTE[$this->id % count(self::AGENDA_PALETTE)];
    }

    /**
     * The clinic's professionals as the agenda screens need them.
     *
     * @return Collection<int, array{id: int, name: string, color: string, availability: array<int, list<int>>|null}>
     */
    public static function agendaProfessionals(): Collection
    {
        return static::professionals()
            ->orderBy('name')
            ->get(['id', 'name', 'agenda_color', 'agenda_availability'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'color' => $user->agendaColor(),
                'availability' => $user->agenda_availability,
            ])
            ->toBase();
    }

    /**
     * Whether the professional takes bookings on this weekday (0 = Sunday)
     * at this time. No availability set means always.
     */
    public function isAvailableAt(int $weekday, string $time): bool
    {
        if ($this->agenda_availability === null) {
            return true;
        }

        $hours = array_map('intval', $this->agenda_availability[$weekday] ?? []);

        return in_array((int) substr($time, 0, 2), $hours, true);
    }
}
