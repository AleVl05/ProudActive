<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventInstanceStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'series_id',
        'instance_date',
        'subtasks_total',
        'subtasks_completed',
        'status',
    ];

    protected $casts = [
        'event_id' => 'integer',
        'series_id' => 'integer',
        'instance_date' => 'date',
        'subtasks_total' => 'integer',
        'subtasks_completed' => 'integer',
        'status' => 'string',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function series(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'series_id');
    }
}
