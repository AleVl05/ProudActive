import { TutorialStep } from './TutorialOverlay';

// Tipo para los objetivos del tutorial
export type TutorialObjective = 
  | 'click-empty-cell' // Hacer clic en una celda vacía
  | 'enter-event-name' // Escribir un nombre en el campo de título
  | 'press-create-button' // Presionar el botón crear
  | 'click-event-item' // Hacer clic en un evento existente para editarlo
  | 'open-recurrence-modal' // Abrir modal de recurrencia
  | 'enable-recurrence' // Activar el switch de repetición
  | 'select-weekly-mode' // Seleccionar modo semanal
  | 'select-recurrence-days' // Seleccionar días específicos en recurrencia
  | 'save-recurrence' // Guardar la configuración de recurrencia
  | 'add-subtasks' // Agregar subtareas
  | 'save-event-with-subtasks' // Guardar el evento completo después de agregar subtareas
  | 'complete-subtasks' // Completar todas las subtareas
  | 'drag-event' // Arrastrar un evento de un día a otro
  | 'resize-event' // Estirar un evento (arriba o abajo)
  | 'long-press-event' // Mantener presionado un evento durante 2 segundos
  | 'switch-to-day-view' // Cambiar a la vista de día
  | 'switch-to-month-view' // Cambiar a la vista de mes
  | 'switch-to-year-view' // Cambiar a la vista de año
  | 'none'; // Sin objetivo (paso informativo)

export interface ExtendedTutorialStep extends TutorialStep {
  objective?: TutorialObjective; // Objetivo que debe cumplirse para avanzar
  showInModal?: boolean; // Si debe mostrarse dentro del modal
}

export const calendarTutorialSteps: ExtendedTutorialStep[] = [
  // Paso 0: Introducción
  {
    id: 'intro',
    message: '¡Hola! Estamos en una guerra contra la procrastinación y los malos hábitos. Necesitamos planear una estrategia para vencer estos malos hábitos. Ven conmigo y te mostraré nuestro plan.',
    position: 'center',
    skipAllowed: true,
    objective: 'none',
  },
  // Paso 1: Explicar vista de semana
  {
    id: 'week-view-intro',
    message: 'Esta es la vista de semana. Aquí crearemos tareas para organizar nuestro plan de acción.',
    position: 'bottom-left',
    skipAllowed: true,
    objective: 'none',
  },
  // Paso 2: Crear evento - SOLO pedir clic en espacio en blanco
  {
    id: 'create-event',
    message: 'Haz clic en un espacio en blanco para crear un evento.',
    position: 'bottom-left',
    highlightElement: 'calendar-grid',
    arrowDirection: 'up',
    skipAllowed: false,
    actionRequired: true,
    objective: 'click-empty-cell',
    showInModal: false,
  },
  // Paso 3: Nombrar evento - cuando ya está abierto el modal
  {
    id: 'name-event',
    message: 'Ahora ponle un nombre al evento, como por ejemplo: "Ir al gimnasio".',
    position: 'bottom-left',
    highlightElement: 'event-title-input',
    arrowDirection: 'up',
    skipAllowed: false,
    actionRequired: true,
    objective: 'enter-event-name',
    showInModal: true,
  },
  // Paso 3.5: Presionar botón crear
  {
    id: 'press-create',
    message: 'Haz clic en el botón crear para cerrar el modal.',
    position: 'bottom-left',
    highlightElement: 'create-button',
    arrowDirection: 'up',
    skipAllowed: false,
    actionRequired: true,
    objective: 'press-create-button',
    showInModal: true,
  },
  // Paso 4: Felicitación por crear la primera tarea
  {
    id: 'first-task-created',
    message: '¡Muy bien! Creaste tu primera tarea. Ahora vamos a editarla para hacerla recurrente.',
    position: 'bottom-left',
    skipAllowed: false,
    actionRequired: false,
    objective: 'none',
    showInModal: false,
  },
  // Paso 5: Entrar al evento para editarlo
  {
    id: 'click-event-to-edit',
    message: 'Haz clic en el evento que acabas de crear para editarlo.',
    position: 'bottom-left',
    skipAllowed: false,
    actionRequired: true,
    objective: 'click-event-item',
    showInModal: false,
  },
  // Paso 6: Hacer clic en Repetir (dentro del modal de edición)
  {
    id: 'click-recurrence',
    message: 'Al gym no vas a ir solo una vez, ni tampoco todos los días. Haz clic en la parte de "Repetir" para configurar la recurrencia.',
    position: 'bottom-left',
    highlightElement: 'recurrence-button',
    arrowDirection: 'up', // Usar 'up' y rotar 180 grados para que apunte hacia abajo
    skipAllowed: false,
    actionRequired: true,
    objective: 'open-recurrence-modal',
    showInModal: true,
    needScroll: true, // Necesita hacer scroll hacia abajo
  },
  // Paso 7: Activar la repetición (dentro del modal de recurrencia)
  {
    id: 'enable-recurrence',
    message: 'Primero, activa la repetición haciendo clic en el interruptor de "Repetir".',
    position: 'bottom-left',
    highlightElement: 'recurrence-toggle',
    arrowDirection: 'up',
    skipAllowed: false,
    actionRequired: true,
    objective: 'enable-recurrence',
    showInRecurrenceModal: true,
  },
  // Paso 8: Seleccionar modo semanal (dentro del modal de recurrencia)
  {
    id: 'select-weekly-mode',
    message: 'Ahora selecciona "Semanal" para configurar la repetición semanal.',
    position: 'bottom-left',
    highlightElement: 'recurrence-mode-weekly',
    arrowDirection: 'up',
    skipAllowed: false,
    actionRequired: true,
    objective: 'select-weekly-mode',
    showInRecurrenceModal: true,
  },
  // Paso 9: Seleccionar días de la semana (dentro del modal de recurrencia)
  {
    id: 'select-recurrence-days',
    message: 'Ve a la parte de "Semanal" y selecciona: Lunes, Martes, Jueves y Viernes.',
    position: 'bottom-left', // Debe estar abajo mientras selecciona días
    highlightElement: 'recurrence-week-days',
    arrowDirection: 'up',
    skipAllowed: false,
    actionRequired: true,
    objective: 'select-recurrence-days',
    showInRecurrenceModal: true,
  },
  // Paso 10: Guardar recurrencia (dentro del modal de recurrencia)
  {
    id: 'save-recurrence',
    message: 'Ahora haz clic en "Guardar" para guardar la configuración de recurrencia.',
    position: 'top-left', // Debe estar arriba para no tapar el botón de guardar
    skipAllowed: false,
    actionRequired: true,
    objective: 'save-recurrence',
    showInRecurrenceModal: true, // Debe aparecer en el modal de recurrencia
  },
  // Paso 11: Agregar subtareas
  {
    id: 'add-subtasks',
    message: 'Al gym tienes que ir con algunas cosas, ¿no? Agrega dos subtareas: "Llevar agua" y "Llevar desodorante".',
    position: 'top-right', // Al lado del texto para no tapar el teclado
    skipAllowed: false,
    actionRequired: true,
    objective: 'add-subtasks',
    showInModal: true,
    needScroll: true, // Necesita hacer scroll hacia abajo
  },
  // Paso 12: Guardar evento completo
  {
    id: 'save-event-final',
    message: 'Perfecto. Ahora haz clic en el botón "Editar" para guardar el evento completo con todas sus configuraciones.',
    position: 'top-left', // Arriba para no tapar el botón
    highlightElement: 'create-button',
    arrowDirection: 'down', // Flecha apunta hacia abajo al botón, rotar 180 grados
    skipAllowed: false,
    actionRequired: true,
    objective: 'save-event-with-subtasks',
    showInModal: true,
  },
  // Paso 13: Explicar eventos grises
  {
    id: 'explain-gray-events',
    message: '¡Wow! los eventos ahora son de color gris, Un evento gris tiene subtareas incompletas. Cuando completes todas las subtareas, el evento se volverá dorado.',
    position: 'bottom-left',
    skipAllowed: false,
    actionRequired: false,
    objective: 'none',
    showInModal: false,
  },
  // Paso 14: Completar subtareas
  {
    id: 'complete-subtasks',
    message: 'Ahora entra a un evento y marca las dos subtareas como completadas.',
    position: 'bottom-left',
    skipAllowed: false,
    actionRequired: true,
    objective: 'complete-subtasks',
    showInModal: false,
  },
  // Paso 15: Eventos dorados
  {
    id: 'golden-events',
    message: '¡Wow, lo lograste! Los eventos dorados son aquellos que tienen todas sus subtareas completadas. Esto significa que estas trabajando en tus objetivos.',
    position: 'bottom-left',
    skipAllowed: true,
    objective: 'none',
  },
  // Paso 16: Drag and drop
  {
    id: 'drag-and-drop',
    message: 'Puedes arrastrar eventos hacia todas las direcciones. Simplemente mantén presionado un evento ligeramente y muevelo 2 veces para que te enseñe otra funcionalidad.',
    position: 'bottom-left',
    skipAllowed: false,
    actionRequired: true,
    objective: 'drag-event',
    showInModal: false,
  },
  // Paso 17: Estirar eventos
  {
    id: 'resize-events',
    message: 'Puedes estirar los eventos para cambiar su duración. Arrastra desde el borde de arriba un bloque y despues desde el borde de abajo',
    position: 'bottom-left',
    skipAllowed: false,
    actionRequired: true,
    objective: 'resize-event',
    showInModal: false,
  },
  // Paso 18: Mensaje final
  {
    id: 'completion',
    message: 'Muy bien capitán! terminaste el tutorial, esta batalla contra los malos hábitos será larga pero te hará sentir orgulloso.',
    position: 'center',
    skipAllowed: false,
    actionRequired: false,
    objective: 'none',
  },
];

