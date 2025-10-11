<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketItem extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'checked',
        'historical_data',
        'popularity_count',
    ];

    protected $casts = [
        'checked' => 'boolean',
        'historical_data' => 'array',
        'popularity_count' => 'integer',
    ];

    /**
     * Relación con el usuario propietario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
