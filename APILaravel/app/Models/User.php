<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, SoftDeletes, Notifiable, HasApiTokens;

    protected $fillable = [
        'uuid',
        'name',
        'email',
        'email_verified_at',
        'password',
        'timezone',
        'locale',
        'avatar_url',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'uuid' => 'string',
        'name' => 'string',
        'email' => 'string',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'timezone' => 'string',
        'locale' => 'string',
        'avatar_url' => 'string',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    /**
     * Relación con las preferencias del usuario
     */
    public function preferences(): HasOne
    {
        return $this->hasOne(UserPreferences::class);
    }

    /**
     * Relación con los calendarios del usuario
     */
    public function calendars(): HasMany
    {
        return $this->hasMany(Calendar::class);
    }

    /**
     * Relación con los eventos del usuario
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    /**
     * Relación con las categorías de eventos del usuario
     */
    public function eventCategories(): HasMany
    {
        return $this->hasMany(EventCategory::class);
    }

    /**
     * Relación con los dispositivos del usuario
     */
    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }
}