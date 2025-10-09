<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\SubtaskController;

Route::get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('v1')->group(function () {
    // Test endpoint
    Route::get('/test', function () {
        return response()->json([
            'success' => true,
            'message' => 'API v1 funcionando correctamente',
            'timestamp' => now()->toISOString()
        ]);
    });

    // Eventos - CRUD completo
    Route::get('events', [EventController::class, 'index']);
    Route::post('events', [EventController::class, 'store']);
    Route::get('events/{id}', [EventController::class, 'show']);
    Route::match(['put', 'patch'], 'events/{id}', [EventController::class, 'update']);
    Route::delete('events/{id}', [EventController::class, 'destroy']);

    // Calendarios y categorías (para el usuario fijo)
    Route::get('calendars', [EventController::class, 'calendars']);
    Route::get('categories', [EventController::class, 'categories']);

    // Subtareas - CRUD completo
    Route::get('events/{eventId}/subtasks', [SubtaskController::class, 'index']);
    Route::post('subtasks', [SubtaskController::class, 'store']);
    Route::match(['put', 'patch'], 'subtasks/{id}', [SubtaskController::class, 'update']);
    Route::delete('subtasks/{id}', [SubtaskController::class, 'destroy']);
    Route::post('subtasks/update-multiple', [SubtaskController::class, 'updateMultiple']);
});
