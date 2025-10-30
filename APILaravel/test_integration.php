<?php

/**
 * Script de prueba de integración para el feature flag
 * 
 * Este script simula una llamada al endpoint de eventos para verificar
 * que el feature flag funciona correctamente.
 * 
 * Uso: php test_integration.php
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Services\SubtaskCounterService;
use App\Models\Event;
use App\Models\User;
use App\Models\Calendar;

// Inicializar Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 PRUEBA DE INTEGRACIÓN - FEATURE FLAG\n";
echo "======================================\n\n";

try {
    // Verificar estado del feature flag
    $featureEnabled = config('features.subtask_color_enhancement');
    echo "🔧 Feature flag: " . ($featureEnabled ? "ACTIVADO" : "DESACTIVADO") . "\n";
    echo "🌍 Variable de entorno: " . (env('SUBTASK_COLOR_FEATURE_ENABLED') ?: 'no definida') . "\n\n";
    
    // Obtener un usuario para las pruebas
    $user = User::first();
    if (!$user) {
        echo "❌ ERROR: No se encontró usuario para las pruebas\n";
        exit(1);
    }
    
    echo "✅ Usuario encontrado: {$user->id}\n";
    
    // Obtener eventos del usuario
    $events = Event::where('user_id', $user->id)
        ->whereNull('deleted_at')
        ->limit(5)
        ->get();
    
    if ($events->count() === 0) {
        echo "⚠️  No se encontraron eventos para probar\n";
        exit(0);
    }
    
    echo "📅 Eventos encontrados: {$events->count()}\n\n";
    
    // Probar el servicio directamente
    echo "🔍 PRUEBA DIRECTA DEL SERVICIO:\n";
    echo "-------------------------------\n";
    
    $service = new SubtaskCounterService();
    
    foreach ($events as $event) {
        $counts = $service->getCountsForEvent($event);
        $isRecurring = $event->series_id !== null && !$event->is_recurring;
        
        echo "📅 {$event->title}\n";
        echo "   ID: {$event->id}\n";
        echo "   Tipo: " . ($isRecurring ? "Instancia recurrente" : "Evento único") . "\n";
        echo "   Serie ID: " . ($event->series_id ?: 'N/A') . "\n";
        echo "   Subtareas: {$counts['total']} total, {$counts['completed']} completadas\n";
        
        if ($counts['total'] > 0) {
            $percentage = round(($counts['completed'] / $counts['total']) * 100, 1);
            echo "   Progreso: {$percentage}%\n";
            
            // Determinar color esperado
            if ($counts['completed'] === $counts['total']) {
                echo "   🎨 Color esperado: DORADO (todas completadas)\n";
            } else {
                echo "   🎨 Color esperado: GRIS OSCURO (parcialmente completadas)\n";
            }
        } else {
            echo "   🎨 Color esperado: ORIGINAL (sin subtareas)\n";
        }
        echo "\n";
    }
    
    // Simular llamada al endpoint (sin HTTP)
    echo "🌐 SIMULACIÓN DE ENDPOINT:\n";
    echo "--------------------------\n";
    
    $query = Event::where('user_id', $user->id)
        ->whereNull('deleted_at');
    
    $events = $query->orderBy('start_utc')->get();
    
    echo "📊 Procesando {$events->count()} eventos con lógica del EventController...\n";
    
    $processedCount = 0;
    $enhancedCount = 0;
    $fallbackCount = 0;
    
    foreach ($events as $event) {
        if (config('features.subtask_color_enhancement')) {
            $subtaskService = app(\App\Services\SubtaskCounterService::class);
            $counts = $subtaskService->getCountsForEvent($event);
            $enhancedCount++;
        } else {
            $masterEventId = $event->series_id ? $event->series_id : $event->id;
            $counts = [
                'total' => \App\Models\Subtask::where('event_id', $masterEventId)
                    ->whereNull('deleted_at')
                    ->count(),
                'completed' => \App\Models\Subtask::where('event_id', $masterEventId)
                    ->whereNull('deleted_at')
                    ->where('completed', true)
                    ->count()
            ];
            $fallbackCount++;
        }
        
        $processedCount++;
    }
    
    echo "✅ Procesados: {$processedCount} eventos\n";
    echo "🚀 Con lógica mejorada: {$enhancedCount} eventos\n";
    echo "🔄 Con lógica original: {$fallbackCount} eventos\n";
    
    echo "\n✅ PRUEBA DE INTEGRACIÓN COMPLETADA\n";
    echo "==================================\n";
    
    if ($featureEnabled) {
        echo "🎉 El feature flag está ACTIVADO - Los colores deberían mostrarse correctamente\n";
    } else {
        echo "⚠️  El feature flag está DESACTIVADO - Se usa lógica original\n";
        echo "💡 Para activar: Agrega 'SUBTASK_COLOR_FEATURE_ENABLED=true' a tu .env\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR DURANTE LA PRUEBA:\n";
    echo "Mensaje: " . $e->getMessage() . "\n";
    echo "Archivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}
