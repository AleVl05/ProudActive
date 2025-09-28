<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alarm extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'trigger_minutes_before',
        'method',
        'custom_message',
        'is_enabled',
        'last_triggered_at',
    ];

    protected $casts = [
        'event_id' => 'integer',
        'trigger_minutes_before' => 'integer',
        'method' => 'string',
        'custom_message' => 'string',
        'is_enabled' => 'boolean',
        'last_triggered_at' => 'datetime',
    ];

    /**
     * Relación con el evento
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}