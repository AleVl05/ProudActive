<?php

/**
 * Script para activar/desactivar el feature flag de subtask colors
 * 
 * Uso:
 * php scripts/toggle_subtask_feature.php enable   # Activar
 * php scripts/toggle_subtask_feature.php disable  # Desactivar
 * php scripts/toggle_subtask_feature.php status   # Ver estado
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Inicializar Laravel
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$action = $argv[1] ?? 'status';

echo "🔧 SUBTASK COLOR FEATURE TOGGLE\n";
echo "================================\n\n";

switch ($action) {
    case 'enable':
        echo "🚀 Activando feature flag...\n";
        $this->setFeatureFlag(true);
        echo "✅ Feature flag ACTIVADO\n";
        echo "📝 Agrega 'SUBTASK_COLOR_FEATURE_ENABLED=true' a tu archivo .env\n";
        break;
        
    case 'disable':
        echo "🔄 Desactivando feature flag...\n";
        $this->setFeatureFlag(false);
        echo "✅ Feature flag DESACTIVADO\n";
        echo "📝 Agrega 'SUBTASK_COLOR_FEATURE_ENABLED=false' a tu archivo .env\n";
        break;
        
    case 'status':
    default:
        $enabled = config('features.subtask_color_enhancement');
        echo "📊 Estado actual: " . ($enabled ? "ACTIVADO" : "DESACTIVADO") . "\n";
        echo "🔧 Variable de entorno: " . (env('SUBTASK_COLOR_FEATURE_ENABLED') ?: 'no definida') . "\n";
        break;
}

echo "\n📋 INSTRUCCIONES:\n";
echo "1. Para activar: Agrega 'SUBTASK_COLOR_FEATURE_ENABLED=true' a tu .env\n";
echo "2. Para desactivar: Agrega 'SUBTASK_COLOR_FEATURE_ENABLED=false' a tu .env\n";
echo "3. Reinicia el servidor después del cambio\n";
echo "4. Verifica los logs para confirmar que está funcionando\n";

function setFeatureFlag($enabled) {
    $envFile = __DIR__ . '/../.env';
    
    if (!file_exists($envFile)) {
        echo "⚠️  Archivo .env no encontrado. Crea uno basado en .env.example\n";
        return;
    }
    
    $content = file_get_contents($envFile);
    $value = $enabled ? 'true' : 'false';
    
    if (strpos($content, 'SUBTASK_COLOR_FEATURE_ENABLED') !== false) {
        // Reemplazar línea existente
        $content = preg_replace(
            '/SUBTASK_COLOR_FEATURE_ENABLED=.*/',
            "SUBTASK_COLOR_FEATURE_ENABLED={$value}",
            $content
        );
    } else {
        // Agregar nueva línea
        $content .= "\n# Feature flag para colores de subtareas\n";
        $content .= "SUBTASK_COLOR_FEATURE_ENABLED={$value}\n";
    }
    
    file_put_contents($envFile, $content);
}
