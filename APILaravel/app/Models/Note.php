<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Note extends Model
{
    protected $table = 'notes';
    
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'checklist',
        'blocks',
        'is_favorite',
        'visibility',
    ];

    protected $casts = [
        'checklist' => 'array',
        'blocks' => 'array',
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

