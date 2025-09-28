<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'color',
        'icon',
        'is_default',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'name' => 'string',
        'color' => 'string',
        'icon' => 'string',
        'is_default' => 'boolean',
    ];

    /**
     * Relación con el usuario propietario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación con los eventos de esta categoría
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'category_id');
    }
}