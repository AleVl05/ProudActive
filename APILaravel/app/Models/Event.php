<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'calendar_id',
        'user_id',
        'category_id',
        'series_id',
        'original_start_utc',
        'title',
        'description',
        'location',
        'start_utc',
        'end_utc',
        'all_day',
        'timezone',
        'color',
        'text_color',
        'border_color',
        'is_recurring',
        'recurrence_rule',
        'recurrence_end_date',
        'version',
    ];

    protected $casts = [
        'uuid' => 'string',
        'calendar_id' => 'integer',
        'user_id' => 'integer',
        'category_id' => 'integer',
        'series_id' => 'integer',
        'original_start_utc' => 'datetime',
        'title' => 'string',
        'description' => 'string',
        'location' => 'string',
        'start_utc' => 'datetime',
        'end_utc' => 'datetime',
        'all_day' => 'boolean',
        'timezone' => 'string',
        'color' => 'string',
        'text_color' => 'string',
        'border_color' => 'string',
        'is_recurring' => 'boolean',
        'recurrence_rule' => 'array',
        'recurrence_end_date' => 'date',
        'version' => 'integer',
    ];

    /**
     * Relación con el calendario
     */
    public function calendar(): BelongsTo
    {
        return $this->belongsTo(Calendar::class);
    }

    /**
     * Relación con el usuario propietario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación con la categoría del evento
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(EventCategory::class, 'category_id');
    }

    /**
     * Relación con la serie master (para eventos recurrentes)
     */
    public function series(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'series_id');
    }

    /**
     * Relación con las instancias de la serie (para eventos recurrentes)
     */
    public function instances(): HasMany
    {
        return $this->hasMany(Event::class, 'series_id');
    }

    /**
     * Relación con los alarmes del evento
     */
    public function alarms(): HasMany
    {
        return $this->hasMany(Alarm::class);
    }

    /**
     * Relación con las excepciones de recurrencia
     */
    public function recurrenceExceptions(): HasMany
    {
        return $this->hasMany(RecurrenceException::class);
    }
}