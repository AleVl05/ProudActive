<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomSubtask extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_instance_id',
        'text',
        'description',
        'sort_order',
        'completed',
        'completed_at'
    ];

    protected $casts = [
        'completed' => 'boolean',
        'completed_at' => 'datetime',
        'sort_order' => 'integer',
        'event_instance_id' => 'integer'
    ];

    /**
     * Relación con la instancia del evento
     */
    public function eventInstance(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_instance_id');
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

