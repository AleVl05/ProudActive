<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\MonthEventController;
use App\Http\Controllers\Api\SubtaskController;
use App\Http\Controllers\Api\SubtaskInstanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\MarketItemController;
use App\Http\Controllers\NoteController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function () {
    // Test endpoint
    Route::get('/test', function () {
        return response()->json([
            'success' => true,
            'message' => 'API v1 funcionando correctamente',
            'timestamp' => now()->toISOString()
        ]);
    });

    // ============================================
    // RUTAS PÚBLICAS - Autenticación
    // ============================================
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('auth/resend-code', [AuthController::class, 'resendVerificationCode']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

    // ============================================
    // RUTAS PROTEGIDAS - Requieren autenticación
    // ============================================
    Route::middleware('auth:sanctum')->group(function () {
        // Autenticación
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/profile', [AuthController::class, 'profile']);
        Route::put('auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('auth/change-password', [AuthController::class, 'changePassword']);
        Route::get('auth/preferences', [AuthController::class, 'getPreferences']);
        Route::put('auth/preferences', [AuthController::class, 'updatePreferences']);
        Route::post('auth/register-daily-access', [AuthController::class, 'registerDailyAccess']);
        Route::get('auth/stats', [AuthController::class, 'getStats']);

        // Eventos - CRUD completo
        Route::get('events', [EventController::class, 'index']);
        Route::post('events', [EventController::class, 'store']);
        Route::delete('events', [EventController::class, 'deleteAllEvents']); // Eliminar TODOS los eventos (debe ir ANTES de events/{id})
        Route::post('events/restore-all', [EventController::class, 'restoreAllEvents']); // Restaurar TODOS los eventos eliminados
        Route::get('events/{id}', [EventController::class, 'show']);
        Route::match(['put', 'patch'], 'events/{id}', [EventController::class, 'update']);
        Route::delete('events/{id}', [EventController::class, 'destroy']);

        // Month Events - CRUD completo
        Route::get('month-events', [MonthEventController::class, 'index']);
        Route::post('month-events', [MonthEventController::class, 'store']);
        Route::match(['put', 'patch'], 'month-events/{id}', [MonthEventController::class, 'update']);
        Route::delete('month-events/{id}', [MonthEventController::class, 'destroy']);

        // Calendarios y categorías
        Route::get('calendars', [EventController::class, 'calendars']);
        Route::get('categories', [EventController::class, 'categories']);

        // Subtareas - CRUD completo (plantilla del maestro)
        Route::get('events/{eventId}/subtasks', [SubtaskController::class, 'index']);
        Route::post('subtasks', [SubtaskController::class, 'store']);
        Route::match(['put', 'patch'], 'subtasks/{id}', [SubtaskController::class, 'update']);
        Route::delete('subtasks/{id}', [SubtaskController::class, 'destroy']);
        Route::post('subtasks/update-multiple', [SubtaskController::class, 'updateMultiple']);

        // Subtask Instances - Estado independiente por instancia
        Route::get('event-instances/{eventInstanceId}/subtasks', [SubtaskInstanceController::class, 'getSubtasksForInstance']);
        Route::post('subtask-instances/toggle', [SubtaskInstanceController::class, 'toggleSubtaskInstance']);
        Route::post('subtask-instances/toggle-multiple', [SubtaskInstanceController::class, 'toggleMultipleSubtaskInstances']);
        Route::post('subtask-instances/hide', [SubtaskInstanceController::class, 'hideSubtaskForInstance']);

        // Custom Subtasks - Subtareas personalizadas por instancia
        Route::post('custom-subtasks', [SubtaskInstanceController::class, 'storeCustomSubtask']);
        Route::match(['put', 'patch'], 'custom-subtasks/{id}', [SubtaskInstanceController::class, 'updateCustomSubtask']);
        Route::delete('custom-subtasks/{id}', [SubtaskInstanceController::class, 'destroyCustomSubtask']);

        // Market Items - CRUD completo
        Route::get('market-items', [MarketItemController::class, 'index']);
        Route::post('market-items', [MarketItemController::class, 'store']);
        Route::get('market-items/{marketItem}', [MarketItemController::class, 'show']);
        Route::match(['put', 'patch'], 'market-items/{marketItem}', [MarketItemController::class, 'update']);
        Route::delete('market-items/{marketItem}', [MarketItemController::class, 'destroy']);
        Route::post('market-items/{marketItem}/toggle', [MarketItemController::class, 'toggle']);
        Route::delete('market-items', [MarketItemController::class, 'destroyAll']);
        
        // Notes - CRUD completo
        Route::get('notes', [NoteController::class, 'index']);
        Route::post('notes', [NoteController::class, 'store']);
        Route::get('notes/{note}', [NoteController::class, 'show']);
        Route::match(['put', 'patch'], 'notes/{note}', [NoteController::class, 'update']);
        Route::delete('notes/{note}', [NoteController::class, 'destroy']);
    });
});
