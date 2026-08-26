<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Concerns\BelongsToTenant;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
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
}
