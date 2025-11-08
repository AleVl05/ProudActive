// ============================================
// CONFIGURACIÓN DE POSICIONES DEL TUTORIAL
// ============================================
// Este archivo contiene todas las posiciones del castorcito, diálogo y flechas
// para cada paso del tutorial. Es fácil de editar sin necesidad de programar.
//
// Para cambiar una posición, simplemente modifica los números en el paso correspondiente.
// 
// Valores:
// - top/bottom/left/right: posición en píxeles o porcentaje (si usePercentage = true)
//   Si usePercentage = true, usa valores entre 0.0 y 1.0 (ej: 0.35 = 35% de la pantalla)
//   Si usePercentage = false, usa valores en píxeles (ej: 140 = 140 píxeles)
// - rotation: rotación de la flecha en grados (0 = sin rotación, 180 = al revés)
// - maxWidth: ancho máximo del diálogo (mismo sistema: porcentaje o píxeles)
// ============================================

// Nota: width y height se calculan dinámicamente en TutorialOverlay.tsx
// Los valores aquí son absolutos (píxeles) o relativos (0.0 a 1.0) según usePercentage

// Tipo para las posiciones de cada elemento
interface StepPositionConfig {
  beaver: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    width?: number; // Ancho del castorcito en píxeles (opcional, por defecto usa lógica automática)
    height?: number; // Alto del castorcito en píxeles (opcional, por defecto usa lógica automática)
    usePercentage?: boolean; // Si es true, los valores se multiplican por height/width
  };
  dialog: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    maxWidth?: number;
    usePercentage?: boolean;
  };
  arrow: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    rotation?: number; // Rotación en grados (0-360)
    usePercentage?: boolean;
  };
}

// Configuración de posiciones para cada paso del tutorial
export const tutorialStepPositions: { [stepId: string]: StepPositionConfig } = {
  // ============================================
  // PASO 0: Introducción
  // ============================================
  'intro': {
    beaver: {
      top: 0.55, // 30% de la altura
      left: 0.00, // 50% del ancho
      width: 300,
      height: 300,
      usePercentage: true,
    },
    dialog: {
      top: 0.37, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 1: Vista de semana
  // ============================================
  'week-view-intro': {
    beaver: {
        top: 0.55, // 30% de la altura
        left: 0.00, // 50% del ancho
        width: 200,
        height: 200,
        usePercentage: true,
    },
    dialog: {
        top: 0.37, // 40% de la altura
        left: 0.5, // 50% del ancho
        maxWidth: 0.80, // 95% del ancho
        usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 2: Crear evento (clic en espacio en blanco)
  // ============================================
  'create-event': {
    beaver: {
      bottom: 0.05,
      left: 0.1,
      width: 230,
      height: 230,
      usePercentage: true,
    },
    dialog: {
      top: 0.5, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
      
    },
    arrow: {
      top: 0.35, // 35% de la altura
      left: 0.5, // 50% del ancho (centro)
      rotation: 0,
      usePercentage: true,
    },
  },

  // ============================================
  // PASO 3: Nombrar evento
  // ============================================
  'name-event': {
    beaver: {
      bottom: 0.17, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      top: 0.46, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
    },
    arrow: {
      top: 0.27, // 27% de la altura
      left: 0.5, // 50% del ancho
      rotation: -90, // Rotar hacia la izquierda
      usePercentage: true,
    },
  },

  // ============================================
  // PASO 3.5: Presionar botón crear
  // ============================================
  'press-create': {
    beaver: {
      bottom: 0.17, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      top: 0.46, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
    },
    
    arrow: {
      top: 80,
      right: 20,
      rotation: 0,
    },
  },

  // ============================================
  // PASO 4: Felicitación por crear primera tarea
  // ============================================
  'first-task-created': {
    beaver: {
      bottom: 0.18, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      bottom: 320,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 5: Clic en evento para editarlo
  // ============================================
  'click-event-to-edit': {
    beaver: {
      bottom: 0.05,
      left: 0.1,
      width: 230,
      height: 230,
      usePercentage: true,
    },
    dialog: {
      top: 0.5, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
      
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 6: Clic en Repetir
  // ============================================
  'click-recurrence': {
    beaver: {
      bottom: 0.08, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      top: 0.56, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
    },
    arrow: {
      top: 0.43, // 50% de la altura
      left: 0.5, // 50% del ancho
      rotation: 270, // Rotar 180 grados para apuntar hacia abajo
      usePercentage: true,
    },
  },

  // ============================================
  // PASO 7: Activar repetición
  // ============================================
  'enable-recurrence': {
    beaver: {
      bottom: 0.18, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      bottom: 320,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      top: 0.08, // 15% de la altura
      right: 0.14,
      rotation: 90,
    },
  },

  // ============================================
  // PASO 8: Seleccionar modo semanal
  // ============================================
  'select-weekly-mode': {
    beaver: {
      bottom: 0.18, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      bottom: 320,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      top: 0.2, // 25% de la altura
      left: 0.4, // 40% del ancho
      rotation: 0,
      usePercentage: true,
    },
  },

  // ============================================
  // PASO 9: Seleccionar días de la semana
  // ============================================
  'select-recurrence-days': {
    beaver: {
      bottom: 0.18, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      bottom: 320,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      top: 0.25, // 25% de la altura
      left: 0.2, // 40% del ancho
      rotation: 0,
      usePercentage: true,
    },
  },

  // ============================================
  // PASO 10: Guardar recurrencia
  // ============================================
  'save-recurrence': {
    beaver: {
      bottom: 0.7, // ~140px / 800px
      left: 0.0, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      top: 0.3, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 11: Agregar subtareas
  // ============================================
  'add-subtasks': {
    beaver: {
      bottom: 0.55, // ~140px / 800px
      left: 0.0, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      top: 0.2, // 35% de la altura
      right: 30,
      maxWidth: 0.45, // 45% del ancho
      usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 12: Guardar evento completo
  // ============================================
  'save-event-final': {
    beaver: {
      top: 0.35, // ~100px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      top: 240,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      top: 120,
      right: 20,
      rotation: 180, // Rotar 180 grados para apuntar hacia abajo
    },
  },

  // ============================================
  // PASO 13: Explicar eventos grises
  // ============================================
  'explain-gray-events': {
    beaver: {
      bottom: 0.18, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      bottom: 320,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 14: Completar subtareas
  // ============================================
  'complete-subtasks': {
    beaver: {
      bottom: 0.05,
      left: 0.1,
      width: 230,
      height: 230,
      usePercentage: true,
    },
    dialog: {
      top: 0.5, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
      
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 15: Eventos dorados
  // ============================================
  'golden-events': {
    beaver: {
      bottom: 0.18, // ~140px / 800px
      left: 0.05, // ~20px / 400px
      width: 200,
      height: 200,
      usePercentage: true,
    },
    dialog: {
      bottom: 320,
      left: 20,
      maxWidth: 0.85,
      usePercentage: true,
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 16: Drag and drop
  // ============================================
  'drag-and-drop': {
    beaver: {
      bottom: 0.00,
      left: 0.1,
      width: 230,
      height: 230,
      usePercentage: true,
    },
    dialog: {
      top: 0.45, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
      
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 17: Estirar eventos
  // ============================================
  'resize-events': {
    beaver: {
      bottom: 0.00,
      left: 0.1,
      width: 230,
      height: 230,
      usePercentage: true,
    },
    dialog: {
      top: 0.45, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
      
    },
    arrow: {
      // Sin flecha en este paso
    },
  },

  // ============================================
  // PASO 18: Mensaje final
  // ============================================
  'completion': {
    beaver: {
      bottom: 0.1,
      left: 0.1,
      width: 230,
      height: 230,
      usePercentage: true,
    },
    dialog: {
      top: 0.5, // 40% de la altura
      left: 0.5, // 50% del ancho
      maxWidth: 0.80, // 95% del ancho
      usePercentage: true,
      
    },
    arrow: {
      // Sin flecha en este paso
    },
  },
};
