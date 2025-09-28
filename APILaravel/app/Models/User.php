<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'timezone',
        'locale',
    ];

    protected $casts = [
        'uuid' => 'string',
        'name' => 'string',
        'timezone' => 'string',
        'locale' => 'string',
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