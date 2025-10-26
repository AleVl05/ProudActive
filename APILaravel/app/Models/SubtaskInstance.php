<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubtaskInstance extends Model
{
    use HasFactory;

    protected $fillable = [
        'subtask_id',
        'event_instance_id',
        'completed',
        'completed_at',
        'overridden',
        'notes'
    ];

    protected $casts = [
        'completed' => 'boolean',
        'overridden' => 'boolean',
        'completed_at' => 'datetime',
        'subtask_id' => 'integer',
        'event_instance_id' => 'string' // Cambiado a string para soportar IDs virtuales como "652_2025-10-22"
    ];

    /**
     * Relación con la subtarea plantilla del maestro
     */
    public function subtask(): BelongsTo
    {
        return $this->belongsTo(Subtask::class);
    }

    /**
     * Relación con la instancia del evento
     */
    public function eventInstance(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_instance_id');
    }

    /**
     * Scope para instancias completadas
     */
    public function scopeCompleted($query)
    {
        return $query->where('completed', true);
    }

    /**
     * Scope para instancias pendientes
     */
    public function scopePending($query)
    {
        return $query->where('completed', false);
    }

    /**
     * Scope para instancias overridden
     */
    public function scopeOverridden($query)
    {
        return $query->where('overridden', true);
    }

    /**
     * Marcar como completada
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'completed' => true,
            'completed_at' => now()
        ]);
    }

    /**
     * Desmarcar como completada
     */
    public function markAsIncomplete(): void
    {
        $this->update([
            'completed' => false,
            'completed_at' => null
        ]);
    }

    /**
     * Toggle del estado de completado
     */
    public function toggleCompleted(): void
    {
        if ($this->completed) {
            $this->markAsIncomplete();
        } else {
            $this->markAsCompleted();
        }
    }
}

