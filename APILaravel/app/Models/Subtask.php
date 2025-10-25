<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subtask extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'event_id',
        'text',
        'completed',
        'sort_order'
    ];

    protected $casts = [
        'completed' => 'boolean',
        'sort_order' => 'integer'
    ];

    /**
     * Relación con el evento padre (maestro)
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Relación con las instancias de esta subtarea
     */
    public function instances(): HasMany
    {
        return $this->hasMany(SubtaskInstance::class);
    }

    /**
     * Obtener el estado de esta subtarea para una instancia específica
     */
    public function getInstanceState($eventInstanceId): ?SubtaskInstance
    {
        return $this->instances()
            ->where('event_instance_id', $eventInstanceId)
            ->first();
    }

    /**
     * Scope para subtareas completadas
     */
    public function scopeCompleted($query)
    {
        return $query->where('completed', true);
    }

    /**
     * Scope para subtareas pendientes
     */
    public function scopePending($query)
    {
        return $query->where('completed', false);
    }

    /**
     * Scope para ordenar por sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('created_at');
    }
}
