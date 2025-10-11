<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\SubtaskController;
use App\Http\Controllers\MarketItemController;
use App\Http\Controllers\RecipeController;

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

    // Market Items - CRUD completo
    Route::get('market-items', [MarketItemController::class, 'index']);
    Route::post('market-items', [MarketItemController::class, 'store']);
    Route::get('market-items/{marketItem}', [MarketItemController::class, 'show']);
    Route::match(['put', 'patch'], 'market-items/{marketItem}', [MarketItemController::class, 'update']);
    Route::delete('market-items/{marketItem}', [MarketItemController::class, 'destroy']);
    Route::post('market-items/{marketItem}/toggle', [MarketItemController::class, 'toggle']);
    Route::delete('market-items', [MarketItemController::class, 'destroyAll']);
    
    // Test endpoints (temporary)
    Route::get('market-items-test', [MarketItemController::class, 'test']);
    Route::post('market-items-test-insert', [MarketItemController::class, 'testInsert']);
    Route::post('market-items-test-toggle/{id}', [MarketItemController::class, 'testToggle']);
    Route::delete('market-items-test-delete/{id}', [MarketItemController::class, 'testDelete']);
    Route::delete('market-items-test-delete-all', [MarketItemController::class, 'testDeleteAll']);
    
    // Recipes - CRUD completo
    Route::get('recipes', [RecipeController::class, 'index']);
    Route::post('recipes', [RecipeController::class, 'store']);
    Route::get('recipes/{recipe}', [RecipeController::class, 'show']);
    Route::match(['put', 'patch'], 'recipes/{recipe}', [RecipeController::class, 'update']);
    Route::delete('recipes/{recipe}', [RecipeController::class, 'destroy']);
    
    // Test endpoints for recipes (temporary)
    Route::get('recipes-test', [RecipeController::class, 'test']);
    Route::post('recipes-test-insert', [RecipeController::class, 'testInsert']);
    Route::delete('recipes-test-delete/{id}', [RecipeController::class, 'testDelete']);
});
