<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthEvent extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'month_events';

    protected $fillable = [
        'uuid',
        'calendar_id',
        'user_id',
        'title',
        'description',
        'location',
        'start_date',
        'end_date',
        'all_day',
        'timezone',
        'color',
        'text_color',
        'border_color',
        'version',
    ];

    protected $casts = [
        'uuid' => 'string',
        'calendar_id' => 'integer',
        'user_id' => 'integer',
        'title' => 'string',
        'description' => 'string',
        'location' => 'string',
        'start_date' => 'date',
        'end_date' => 'date',
        'all_day' => 'boolean',
        'timezone' => 'string',
        'color' => 'string',
        'text_color' => 'string',
        'border_color' => 'string',
        'version' => 'integer',
    ];

    public function calendar(): BelongsTo
    {
        return $this->belongsTo(Calendar::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

