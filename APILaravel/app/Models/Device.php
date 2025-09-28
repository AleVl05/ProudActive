<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Device extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_name',
        'platform',
        'push_token',
        'app_version',
        'os_version',
        'is_active',
        'last_seen_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'device_name' => 'string',
        'platform' => 'string',
        'push_token' => 'string',
        'app_version' => 'string',
        'os_version' => 'string',
        'is_active' => 'boolean',
        'last_seen_at' => 'datetime',
    ];

    /**
     * Relación con el usuario propietario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}