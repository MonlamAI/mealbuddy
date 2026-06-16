<?php

namespace App\Models;

use Carbon\Carbon;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

use Illuminate\Support\Facades\Storage;

#[Fillable([
    'name',
    'name_bo',
    'nickname',
    'nickname_bo',
    'email',
    'password',
    'role',
    'avatar',
    'employee_id',
    'department',
    'is_active',
])]

#[Hidden([
    'password',
    'remember_token',
    'two_factor_secret',
    'two_factor_recovery_codes',
])]

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens,
        HasFactory,
        Notifiable,
        TwoFactorAuthenticatable;

    protected $appends = ['avatar_url'];

    public function getAvatarUrlAttribute(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        if (str_starts_with($this->avatar, 'http://') || str_starts_with($this->avatar, 'https://') || str_starts_with($this->avatar, 'data:')) {
            return $this->avatar;
        }

        return Storage::disk('public')->url($this->avatar);
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function lunchOrders()
    {
        return $this->hasMany(LunchOrder::class);
    }

    public function monthlyBills()
    {
        return $this->hasMany(UserMonthlyBill::class);
    }

    public function uploadedMonthlyBills()
    {
        return $this->hasMany(MonthlyBill::class, 'uploaded_by');
    }

    /*
    |--------------------------------------------------------------------------
    | Attribute Casting
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Role Helpers
    |--------------------------------------------------------------------------
    */

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    public function isChef(): bool
    {
        return $this->role === 'chef';
    }

    public function isAccountant(): bool
    {
        return $this->role === 'accountant';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function getEffectiveLunchStartDate(): string
    {
        $createdAt = Carbon::parse($this->created_at);
        if ($createdAt->hour >= 10) {
            return $createdAt->addDay()->toDateString();
        }

        return $createdAt->toDateString();
    }
}
