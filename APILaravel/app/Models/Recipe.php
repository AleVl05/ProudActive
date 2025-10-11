<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Recipe extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'ingredients',
        'is_favorite',
        'visibility',
    ];

    protected $casts = [
        'ingredients' => 'array',
        'is_favorite' => 'boolean',
    ];

    /**
     * Relación con el usuario propietario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
