<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreferences extends Model
{
    use HasFactory;

    protected $table = 'user_preferences';
    
    // Especificar que la clave primaria es user_id, no id
    protected $primaryKey = 'user_id';
    
    // Indicar que la clave primaria no es auto-incremental
    public $incrementing = false;
    
    // Especificar el tipo de la clave primaria
    protected $keyType = 'integer';

    protected $fillable = [
        'user_id',
        'time_interval_minutes',
        'start_hour',
        'end_hour',
        'default_view',
        'week_starts_on',
        'last_access_date',
        'consecutive_days',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'time_interval_minutes' => 'integer',
        'start_hour' => 'integer',
        'end_hour' => 'integer',
        'default_view' => 'string',
        'week_starts_on' => 'string',
        'last_access_date' => 'date',
        'consecutive_days' => 'integer',
    ];

    /**
     * Relación con el usuario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}