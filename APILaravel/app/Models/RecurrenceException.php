<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurrenceException extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'exception_date',
        'is_deleted',
        'override_event_id',
        'reason',
    ];

    protected $casts = [
        'event_id' => 'integer',
        'exception_date' => 'date',
        'is_deleted' => 'boolean',
        'override_event_id' => 'integer',
        'reason' => 'string',
    ];

    /**
     * Relación con el evento master
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Relación con el evento override
     */
    public function overrideEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'override_event_id');
    }
}