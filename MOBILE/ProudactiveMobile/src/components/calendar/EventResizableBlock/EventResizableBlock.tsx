// EventResizableBlock.tsx - Resizable and draggable event block component
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient'; // Deshabilitado - Linear Gradient no funciona

import { CELL_HEIGHT } from '../../../utils/dateConstants';
import ContextMenu from '../ContextMenu';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Types
interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  duration: number;
  date: string;
  color: string;
  category: string;
  // Campos de recurrencia
  is_recurring?: boolean;
  recurrence_rule?: string | object | null;
  recurrence_end_date?: string | null;
  // Campos para detectar si viene de una serie
  series_id?: string | number | null;
  original_start_utc?: string | null;
  // 🆕 Campos de información de subtareas
  subtasks_count?: number;
  subtasks_completed_count?: number;
}

interface EventResizableBlockProps {
  ev: Event;
  onResizeCommit: (event: Event, newStartTime: number, newDuration: number) => void;
  onMoveCommit: (event: Event, newStartTime: number, newDate: string) => void;
  onQuickPress: (event: Event) => void;
  cellWidth: number;
  currentView?: 'day' | 'week' | 'month' | 'year';
  subtaskStatus?: { hasSubtasks: boolean; allCompleted: boolean };
  onLongPress?: (handler: () => void) => void; // Nueva prop para manejar long press externo
  onDuplicate?: (event: Event) => void; // Volver a exponer duplicar hacia el padre
  renderOnlyBottomHandler?: boolean; // 🔧 FIX: Solo renderizar handler de abajo (para bloques extendidos)
  currentCellStartTime?: number; // 🔧 FIX: startTime de la celda actual (para calcular ghost offset)
}

const EventResizableBlock = React.memo(function EventResizableBlock({ 
  ev, 
  onResizeCommit, 
  onMoveCommit, 
  onQuickPress, 
  cellWidth, 
  currentView = 'week',
  subtaskStatus = { hasSubtasks: false, allCompleted: false },
  onLongPress,
  onDuplicate,
  renderOnlyBottomHandler = false,
  currentCellStartTime
}: EventResizableBlockProps) {

  const ghostHeight = useRef(new Animated.Value((ev.duration / 30) * CELL_HEIGHT - 2)).current;
  const ghostTopOffset = useRef(new Animated.Value(0)).current;
  const ghostLeftOffset = useRef(new Animated.Value(0)).current;
  const [showGhost, setShowGhost] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const allowDragRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActivationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActivatedRef = useRef(false); // Flag para saber si ya se activó el drag después del hold
  const isScrollDetectedRef = useRef(false); // Flag para indicar que se detectó scroll (no tap)
  const menuVisibleRef = useRef(false);
  const touchStartTimeRef = useRef<number | null>(null); // Para detectar quick press
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null); // Posición del toque inicial
  const isFingerDownRef = useRef(false); // Flag para saber si el dedo está abajo
  // Usar useRef para almacenar los valores iniciales y actualizarlos cuando ev cambia
  const initialRef = useRef({ startTime: ev.startTime, duration: ev.duration, date: ev.date });
  
  // Actualizar initialRef cuando ev cambia
  useEffect(() => {
    initialRef.current = { startTime: ev.startTime, duration: ev.duration, date: ev.date };
  }, [ev.startTime, ev.duration, ev.date]);
  
  // Usar una función que siempre lea el valor actual
  const getInitial = useCallback(() => initialRef.current, []);

  // Función para calcular el estilo del texto según la duración
  const getTextStyle = useCallback(() => {
    const height = (ev.duration / 30) * CELL_HEIGHT - 2;
    const minHeightForTwoLines = 40; // Altura mínima para mostrar 2 líneas
    
    if (height < minHeightForTwoLines) {
      return {
        fontSize: 12,
        lineHeight: 14,
        numberOfLines: 1
      };
    } else if (height < 60) {
      return {
        fontSize: 13,
        lineHeight: 16,
        numberOfLines: 2
      };
    } else {
      return {
        fontSize: 14,
        lineHeight: 18,
        numberOfLines: 2
      };
    }
  }, [ev.duration]);

  useEffect(() => {
    return () => {
      allowDragRef.current = false;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, []);

  // Cerrar menú cuando se toque fuera
  useEffect(() => {
    if (showContextMenu) {
      const timer = setTimeout(() => {
        setShowContextMenu(false);
        menuVisibleRef.current = false;
      }, 5000); // Cerrar automáticamente después de 5 segundos
      
      return () => clearTimeout(timer);
    }
  }, [showContextMenu]);

  // Función para activar long press externamente
  const triggerLongPress = useCallback(() => {
    console.log('🎯 LONG PRESS DETECTED - Event (External):', ev.title, 'ID:', ev.id);
    
    // Calcular posición del menú (arriba del evento)
    const eventHeight = (ev.duration / 30) * CELL_HEIGHT - 2;
    const menuHeight = 100; // Altura aproximada del menú
    const menuY = -menuHeight - 10; // 10px de separación
    
    setMenuPosition({ x: 0, y: menuY });
    setShowContextMenu(true);
  }, [ev]);

  // Exponer la función de long press al componente padre usando useRef
  const longPressHandlerRef = useRef<(() => void) | null>(null);
  const prevHandlerRef = useRef<(() => void) | null>(null);
  const prevOnLongPressRef = useRef<typeof onLongPress>(null);
  
  useEffect(() => {
    longPressHandlerRef.current = triggerLongPress;
  }, [triggerLongPress]);

  useEffect(() => {
    // Solo registrar si onLongPress o el handler interno realmente cambiaron
    const handlerChanged = prevHandlerRef.current !== longPressHandlerRef.current;
    const onLongPressChanged = prevOnLongPressRef.current !== onLongPress;
    
    if (onLongPress && longPressHandlerRef.current && (handlerChanged || onLongPressChanged)) {
      prevHandlerRef.current = longPressHandlerRef.current;
      prevOnLongPressRef.current = onLongPress;
      onLongPress(longPressHandlerRef.current);
    }
  }, [onLongPress, triggerLongPress]);

  // 🔧 OPTIMIZACIÓN: Solo forzar re-render cuando realmente cambia la duración
  const [forceRender, setForceRender] = useState(0);
  const prevDuration = useRef(ev.duration);
  
  useEffect(() => {
    if (ev.duration !== prevDuration.current) {
      prevDuration.current = ev.duration;
      setForceRender(prev => prev + 1);
    }
  }, [ev.duration]);

  const commitResize = useCallback((newStartTime: number, newDuration: number) => {
    const minDuration = 30;
    if (newDuration < minDuration) {
      newDuration = minDuration;
    }
    if (newStartTime < 0) {
      return;
    }
    
    onResizeCommit(ev, newStartTime, newDuration);
  }, [ev, onResizeCommit]);

  const commitMove = useCallback((newStartTime: number, newDate: string) => {
    if (newStartTime < 0) return;
    onMoveCommit(ev, newStartTime, newDate);
  }, [ev, onMoveCommit]);

  // 🔧 OPTIMIZACIÓN: Memoizar el cálculo de altura para evitar recálculos innecesarios
  const blockHeight = useMemo(() => (ev.duration / 30) * CELL_HEIGHT - 2, [ev.duration]);
  
  // 🎯 Mostrar icono de agarre si el bloque tiene 2 o más bloques de altura (60+ minutos o 2+ días en mes)
  const showGripIcon = useMemo(() => {
    // Para día/semana: 60+ minutos = 2+ bloques de 30min
    // Para mes: 60+ minutos = 2+ días (cada día = 30 minutos en el cálculo)
    return ev.duration >= 60;
  }, [ev.duration]);

  // 🎨 ESTÉTICA: Calcular color del evento basándose en estado de subtareas (TRES ESTADOS)
  const colorState = useMemo(() => {
    const { hasSubtasks, allCompleted } = subtaskStatus;
    
    if (hasSubtasks && allCompleted) {
      // Estado 3: Todas las subtareas completadas → color dorado sólido
      return {
        type: 'solid' as const,
        solidColor: '#DAA520', // Dorado medio sólido
      };
    } else if (hasSubtasks && !allCompleted) {
      // Estado 2: Tiene subtareas pero no todas completadas → gris oscuro
      return {
        type: 'solid' as const,
        solidColor: '#4a4a4a', // Gris oscuro
      };
    } else {
      // Estado 1: Sin subtareas → color original
      return {
        type: 'solid' as const,
        solidColor: ev.color,
      };
    }
  }, [subtaskStatus, ev.color]);
  
  // 🎯 Color del icono de agarre según el color del bloque
  const gripIconColor = useMemo(() => {
    // Para eventos dorados (completados), usar negro
    if (colorState.solidColor === '#DAA520') {
      return 'rgba(0, 0, 0, 0.6)';
    }
    // Para otros colores, usar blanco semitransparente
    return 'rgba(255, 255, 255, 0.7)';
  }, [colorState.solidColor]);

  // 🎨 ESTÉTICA: Estilo de shadow para efecto de "resplandor" cuando está completado
  const shadowStyle = useMemo(() => {
    const { hasSubtasks, allCompleted } = subtaskStatus;
    
    if (hasSubtasks && allCompleted) {
      return {
        shadowColor: '#B8860B', // Dorado oscuro
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
        elevation: 10,
      };
    }
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    };
  }, [subtaskStatus]);

  const topResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => {
      console.log('🔝 DEBUG - Top Resize onStartShouldSetPanResponder', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      return true;
    },
    onPanResponderGrant: () => {
      // Actualizar initial con los valores actuales de ev al comenzar el resize
      const currentInitial = getInitial();
      
      console.log('🔝 DEBUG - Top Resize onPanResponderGrant', {
        eventId: ev.id,
        eventTitle: ev.title,
        startTime: currentInitial.startTime,
        duration: currentInitial.duration,
        timestamp: Date.now()
      });
      
      setShowGhost(true);
      setIsResizing(true);
      ghostTopOffset.setValue(0);
      ghostHeight.setValue((currentInitial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      const currentInitial = getInitial();
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT); // snap 30min
      const deltaMin = deltaSlots * 30;
      // Al estirar desde arriba: mantener el final constante, solo cambiar inicio y duración
      // Si deltaMin es negativo (hacia arriba), el inicio disminuye y la duración aumenta
      // Si deltaMin es positivo (hacia abajo), el inicio aumenta y la duración disminuye
      const newStart = currentInitial.startTime + deltaMin;
      const newDuration = currentInitial.duration - deltaMin; // Si deltaMin es negativo, duration aumenta
      
      // Validaciones robustas
      const minDuration = 30; // 30 minutos mínimo
      const maxDuration = 24 * 60; // 24 horas máximo
      const minStartTime = 0; // No puede empezar antes de medianoche
      const maxStartTime = 24 * 60 - minDuration; // No puede empezar tan tarde que no quede tiempo mínimo
      
      // Calcular el final del evento para validación
      const newEndTime = newStart + newDuration;
      const maxEndTime = 24 * 60;
      
      const isValidDuration = newDuration >= minDuration && newDuration <= maxDuration;
      const isValidStart = newStart >= minStartTime && newStart <= maxStartTime;
      const isValidEnd = newEndTime <= maxEndTime;
      const isValid = isValidDuration && isValidStart && isValidEnd;
      
      console.log('🔝 DEBUG - Top Resize onPanResponderMove', {
        eventId: ev.id,
        eventTitle: ev.title,
        gestureDy: gesture.dy,
        gestureDx: gesture.dx,
        deltaSlots,
        deltaMin,
        newStart,
        newDuration,
        isValid,
        timestamp: Date.now()
      });
      
      if (isValid) {
        ghostTopOffset.setValue(deltaSlots * CELL_HEIGHT);
        ghostHeight.setValue((newDuration / 30) * CELL_HEIGHT - 2);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const currentInitial = getInitial();
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      
      // Al estirar desde arriba: mantener el tiempo FINAL constante
      // Si estiras hacia arriba (deltaMin negativo), el inicio disminuye y la duración AUMENTA
      // Si estiras hacia abajo (deltaMin positivo), el inicio aumenta y la duración DISMINUYE
      const originalEndTime = currentInitial.startTime + currentInitial.duration; // Tiempo final original (CONSTANTE)
      let newStart = currentInitial.startTime + deltaMin;
      let newDuration = originalEndTime - newStart; // Calcular duración para mantener el final constante
      
      // Validaciones finales
      const minDuration = 30;
      const maxDuration = 24 * 60;
      const minStartTime = 0;
      const maxEndTime = 24 * 60;
      
      // Asegurar que el final no exceda el máximo
      const finalEndTime = Math.min(originalEndTime, maxEndTime);
      
      // Ajustar inicio si es necesario
      newStart = Math.max(minStartTime, newStart);
      newStart = Math.min(newStart, maxEndTime - minDuration); // No puede empezar tan tarde que no quepa mínimo
      
      // Recalcular duración basándose en el final constante
      newDuration = finalEndTime - newStart;
      
      // Asegurar duración mínima y máxima
      newDuration = Math.max(minDuration, Math.min(newDuration, maxDuration));
      
      // Si la duración cambió por validaciones, ajustar el inicio para mantener el final
      if (newDuration !== (finalEndTime - newStart)) {
        newStart = finalEndTime - newDuration;
        newStart = Math.max(minStartTime, newStart);
      }
      
      const finalStart = newStart;
      const finalDuration = newDuration;
      
      console.log('🔝 DEBUG - Top Resize onPanResponderRelease', {
        eventId: ev.id,
        eventTitle: ev.title,
        finalStart,
        finalDuration,
        originalStart: currentInitial.startTime,
        originalDuration: currentInitial.duration,
        timestamp: Date.now()
      });
      
      setShowGhost(false);
      setIsResizing(false);
      commitResize(finalStart, finalDuration);
    },
    onPanResponderTerminationRequest: () => {
      console.log('🔝 DEBUG - Top Resize onPanResponderTerminationRequest', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      return false;
    },
    onPanResponderTerminate: () => {
      console.log('🔝 DEBUG - Top Resize onPanResponderTerminate', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      setShowGhost(false);
      setIsResizing(false);
    },
  })).current;

  const bottomResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => {
      console.log('🔽 DEBUG - Bottom Resize onStartShouldSetPanResponder', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      return true;
    },
    onPanResponderGrant: () => {
      // Actualizar initial con los valores actuales de ev al comenzar el resize
      const currentInitial = getInitial();
      
      console.log('🔵 DEBUG - Bottom Resize Grant:', {
        eventId: ev.id,
        eventTitle: ev.title,
        renderOnlyBottomHandler,
        currentInitialStartTime: currentInitial.startTime,
        currentInitialDuration: currentInitial.duration,
        evStartTime: ev.startTime,
        evDuration: ev.duration
      });
      
      setShowGhost(true);
      setIsResizing(true);
      
      // 🔧 FIX: Cuando renderOnlyBottomHandler, el componente está en la última celda
      // El ghost debe mostrarse desde el inicio del bloque hasta el final extendido
      // Calcular offset negativo para posicionar el ghost desde el inicio
      if (renderOnlyBottomHandler && currentCellStartTime !== undefined) {
        // El ghost debe empezar desde ev.startTime (inicio del bloque)
        // El componente está en la celda actual con startTime = currentCellStartTime
        // Calcular la diferencia en minutos y convertir a píxeles
        const timeDiffMinutes = currentInitial.startTime - currentCellStartTime;
        const timeDiffSlots = timeDiffMinutes / 30;
        const offsetY = timeDiffSlots * CELL_HEIGHT;
        ghostTopOffset.setValue(offsetY);
        console.log('🔵 DEBUG - Bottom Handler Ghost Offset:', {
          eventId: ev.id,
          currentCellStartTime,
          eventStartTime: currentInitial.startTime,
          timeDiffMinutes,
          timeDiffSlots,
          offsetY
        });
      } else {
        ghostTopOffset.setValue(0);
      }
      
      ghostHeight.setValue((currentInitial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      const currentInitial = getInitial();
      
      // 🔧 FIX: Si el handler está en la última celda (renderOnlyBottomHandler), 
      // el gesture.dy es relativo a esa celda, pero necesitamos calcular correctamente
      let deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      let deltaMin = deltaSlots * 30;
      
      // Si estamos en la última celda, el gesture.dy negativo (hacia arriba) debería reducir la duración
      // y positivo (hacia abajo) debería aumentarla, que es el comportamiento normal
      const newDuration = currentInitial.duration + deltaMin;
      
      console.log('🔽 DEBUG - Bottom Resize onPanResponderMove', {
        eventId: ev.id,
        eventTitle: ev.title,
        renderOnlyBottomHandler,
        gestureDy: gesture.dy,
        gestureDx: gesture.dx,
        deltaSlots,
        deltaMin,
        currentDuration: currentInitial.duration,
        newDuration,
        currentStartTime: currentInitial.startTime,
        timestamp: Date.now()
      });
      
      // Validaciones robustas
      const minDuration = 30; // 30 minutos mínimo
      const maxDuration = 24 * 60; // 24 horas máximo
      const maxEndTime = 24 * 60; // No puede terminar después de medianoche del día siguiente
      const newEndTime = currentInitial.startTime + newDuration;
      
      const isValidDuration = newDuration >= minDuration && newDuration <= maxDuration;
      const isValidEndTime = newEndTime <= maxEndTime;
      const isValid = isValidDuration && isValidEndTime;
      
      if (isValid) {
        ghostHeight.setValue((newDuration / 30) * CELL_HEIGHT - 2);
        // 🔧 FIX: Mantener el offset correcto durante el movimiento cuando renderOnlyBottomHandler
        if (renderOnlyBottomHandler && currentCellStartTime !== undefined) {
          const timeDiffMinutes = currentInitial.startTime - currentCellStartTime;
          const timeDiffSlots = timeDiffMinutes / 30;
          const offsetY = timeDiffSlots * CELL_HEIGHT;
          ghostTopOffset.setValue(offsetY);
        }
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const currentInitial = getInitial();
      
      // 🔧 FIX: Mismo cálculo que en Move
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newDuration = currentInitial.duration + deltaMin;
      
      console.log('🔽 DEBUG - Bottom Resize onPanResponderRelease', {
        eventId: ev.id,
        eventTitle: ev.title,
        renderOnlyBottomHandler,
        gestureDy: gesture.dy,
        gestureDx: gesture.dx,
        deltaSlots,
        deltaMin,
        currentDuration: currentInitial.duration,
        newDuration,
        currentStartTime: currentInitial.startTime,
        willCommit: true,
        timestamp: Date.now()
      });
      
      // Validaciones finales
      const minDuration = 30;
      const maxDuration = 24 * 60;
      const maxEndTime = 24 * 60;
      const newEndTime = currentInitial.startTime + newDuration;
      
      const finalDuration = Math.min(Math.max(newDuration, minDuration), maxDuration);
      const finalEndTime = currentInitial.startTime + finalDuration;
      const adjustedDuration = finalEndTime > maxEndTime ? maxEndTime - currentInitial.startTime : finalDuration;
      
      console.log('🔵 DEBUG - Bottom Resize Final Commit:', {
        eventId: ev.id,
        finalDuration: adjustedDuration,
        finalStartTime: currentInitial.startTime,
        originalDuration: currentInitial.duration,
        originalStartTime: currentInitial.startTime
      });
      
      setShowGhost(false);
      setIsResizing(false);
      commitResize(currentInitial.startTime, adjustedDuration);
    },
    onPanResponderTerminationRequest: () => {
      console.log('🔽 DEBUG - Bottom Resize onPanResponderTerminationRequest', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      return false;
    },
    onPanResponderTerminate: () => {
      console.log('🔽 DEBUG - Bottom Resize onPanResponderTerminate', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      setShowGhost(false);
      setIsResizing(false);
    },
  })).current;

  // 🔧 FIX: Función para iniciar el timer de detección de drag
  const startDragDetectionTimer = useCallback(() => {
    const hasTimer = dragActivationTimerRef.current !== null;
    const hasDragActivated = dragActivatedRef.current;
    
    console.log('🔵 DEBUG - startDragDetectionTimer CALLED', {
      eventId: ev.id,
      eventTitle: ev.title,
      allowDrag: allowDragRef.current,
      dragActivated: dragActivatedRef.current,
      hasTimer,
      isMoving,
      isResizing,
      isScrollDetected: isScrollDetectedRef.current,
      menuVisible: menuVisibleRef.current,
      showGhost,
      timestamp: Date.now()
    });
    
    if (!dragActivatedRef.current && !dragActivationTimerRef.current) {
      // Reset flags
      allowDragRef.current = false;
      isScrollDetectedRef.current = false;
      
      console.log('🔵 DEBUG - Starting 500ms drag activation timer', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      
      // Iniciar timer para activar drag después de 500ms SIN movimiento
      dragActivationTimerRef.current = setTimeout(() => {
        const timerStillValid = dragActivationTimerRef.current !== null;
        const scrollDetected = isScrollDetectedRef.current;
        const fingerStillDown = isFingerDownRef.current;
        
        console.log('🔵 DEBUG - Drag activation timer FIRED', {
          eventId: ev.id,
          eventTitle: ev.title,
          timerStillValid,
          scrollDetected,
          fingerStillDown,
          willActivate: timerStillValid && !scrollDetected && fingerStillDown,
          timestamp: Date.now()
        });
        
        // Solo activar si aún no se ha cancelado (no hubo movimiento)
        // Y VERIFICAR QUE EL DEDO SIGA EN EL BLOQUE
        if (dragActivationTimerRef.current !== null && !isScrollDetectedRef.current && isFingerDownRef.current) {
          console.log('✅ DEBUG - DRAG ACTIVATED - Setting moving state', {
            eventId: ev.id,
            eventTitle: ev.title,
            timestamp: Date.now()
          });
          
          dragActivatedRef.current = true;
          allowDragRef.current = true;
          setShowGhost(true);
          setIsMoving(true);
          ghostTopOffset.setValue(0);
          ghostLeftOffset.setValue(0);
          const currentInitial = getInitial();
          ghostHeight.setValue((currentInitial.duration / 30) * CELL_HEIGHT - 2);
          
          // 🔧 FIX: Cancelar long press timer cuando se activa el drag
          // Si el usuario activó el drag, quiere mover el bloque, no mostrar el menú
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        } else {
          console.log('❌ DEBUG - Drag activation CANCELLED', {
            eventId: ev.id,
            eventTitle: ev.title,
            reason: !timerStillValid ? 'timer cleared' : scrollDetected ? 'scroll detected' : !fingerStillDown ? 'finger not down' : 'unknown',
            timestamp: Date.now()
          });
        }
        dragActivationTimerRef.current = null;
      }, 500); // 500ms de hold SIN movimiento antes de activar drag
      
      // Timer para long press (1.5 segundos) para el menú contextual
      longPressTimer.current = setTimeout(() => {
        console.log('📌 DEBUG - Long press timer FIRED', {
          eventId: ev.id,
          eventTitle: ev.title,
          timestamp: Date.now()
        });
        
        // Calcular posición del menú (arriba del evento)
        const eventHeight = (ev.duration / 30) * CELL_HEIGHT - 2;
        const menuHeight = 100; // Altura aproximada del menú
        const menuY = -menuHeight - 10; // 10px de separación
        
        setMenuPosition({ x: 0, y: menuY });
        setShowContextMenu(true);
        menuVisibleRef.current = true;
      }, 1500);
    } else {
      console.log('⚠️ DEBUG - startDragDetectionTimer SKIPPED', {
        eventId: ev.id,
        eventTTitle: ev.title,
        reason: dragActivatedRef.current ? 'drag already activated' : 'timer already exists',
        timestamp: Date.now()
      });
    }
  }, [ev.duration, ev.id, ev.title]);

  // PanResponder para mover el bloque completo
  const moveResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => {
      const shouldCapture = dragActivatedRef.current;
      console.log('🔄 DEBUG - Move onStartShouldSetPanResponder', {
        eventId: ev.id,
        eventTitle: ev.title,
        dragActivated: dragActivatedRef.current,
        shouldCapture,
        timestamp: Date.now()
      });
      // 🔧 FIX: Capturar solo si el drag ya está activado
      // Esto permite que el ScrollView maneje el gesto inicialmente
      return shouldCapture;
    },
    onStartShouldSetPanResponderCapture: () => {
      console.log('🔄 DEBUG - Move onStartShouldSetPanResponderCapture', {
        eventId: ev.id,
        eventTitle: ev.title,
        dragActivated: dragActivatedRef.current,
        timestamp: Date.now()
      });
      // 🔧 FIX: NO capturar en capture phase - esto permite que el ScrollView capture el gesto para scroll
      // El timer se inicia desde onTouchStart en el View
      return false;
    },
    onMoveShouldSetPanResponder: (_, gesture) => {
      // 🔧 FIX: Solo capturar si el drag ya está activado
      // Si el drag NO está activado, NO capturar (permite que ScrollView haga scroll)
      const dx = Math.abs(gesture.dx || 0);
      const dy = Math.abs(gesture.dy || 0);
      const SCROLL_THRESHOLD = 10; // Si hay movimiento >= 10px, es probablemente scroll
      
      console.log('🔄 DEBUG - Move onMoveShouldSetPanResponder', {
        eventId: ev.id,
        eventTitle: ev.title,
        dragActivated: dragActivatedRef.current,
        dx,
        dy,
        scrollThreshold: SCROLL_THRESHOLD,
        isScroll: dx >= SCROLL_THRESHOLD || dy >= SCROLL_THRESHOLD,
        timestamp: Date.now()
      });
      
      // Si el drag ya está activado, siempre capturar para mover el bloque
      if (dragActivatedRef.current) {
        return true;
      }
      
      // 🔧 FIX: Si hay movimiento significativo y el drag NO está activado, cancelar timer y NO capturar
      // Esto permite que el ScrollView capture el gesto y haga scroll
      if (dx >= SCROLL_THRESHOLD || dy >= SCROLL_THRESHOLD) {
        console.log('📜 DEBUG - SCROLL DETECTED - Cancelling drag timer', {
          eventId: ev.id,
          eventTitle: ev.title,
          dx,
          dy,
          timestamp: Date.now()
        });
        
        // Cancelar el timer de activación de drag ya que hay movimiento (es scroll)
        if (dragActivationTimerRef.current) {
          clearTimeout(dragActivationTimerRef.current);
          dragActivationTimerRef.current = null;
          console.log('🛑 DEBUG - Drag timer cancelled due to scroll', {
            eventId: ev.id,
            eventTitle: ev.title,
            timestamp: Date.now()
          });
        }
        isScrollDetectedRef.current = true;
        // También cancelar long press si hay movimiento
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        return false; // NO capturar - dejar que ScrollView maneje el scroll
      }
      
      // Si no hay movimiento significativo y aún no se activó el drag, no capturar aún
      // El timer de 500ms activará el drag si no hay movimiento
      return false;
    },
    onPanResponderGrant: () => {
      console.log('✅ DEBUG - onPanResponderGrant (PanResponder captured gesture)', {
        eventId: ev.id,
        eventTitle: ev.title,
        allowDrag: allowDragRef.current,
        dragActivated: dragActivatedRef.current,
        isMoving,
        isResizing,
        showGhost,
        timestamp: Date.now()
      });
      // 🔧 FIX: Este grant solo se llama si el PanResponder capturó el gesto
      // Esto solo debería pasar si dragActivatedRef.current es true
      // El timer ya se inició en onStartShouldSetPanResponderCapture
    },
    onPanResponderMove: (_, gesture) => {
      // 🔧 FIX: Este método solo se llama si el PanResponder capturó el gesto
      // Si estamos aquí, significa que dragActivatedRef.current es true
      // Mover el bloque solo si el drag está activado
      const willMove = allowDragRef.current && dragActivatedRef.current;
      
      console.log('🔄 DEBUG - onPanResponderMove (dragging block)', {
        eventId: ev.id,
        eventTitle: ev.title,
        allowDrag: allowDragRef.current,
        dragActivated: dragActivatedRef.current,
        isMoving,
        showGhost,
        dx: gesture.dx,
        dy: gesture.dy,
        willMove,
        timestamp: Date.now()
      });
      
      if (allowDragRef.current && dragActivatedRef.current) {
        const deltaY = gesture.dy;
        const deltaX = gesture.dx;
        const deltaSlotsY = Math.round(deltaY / CELL_HEIGHT);
        const deltaSlotsX = Math.round(deltaX / cellWidth);
        ghostTopOffset.setValue(deltaSlotsY * CELL_HEIGHT);
        ghostLeftOffset.setValue(deltaSlotsX * cellWidth);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      console.log('👋 DEBUG - onPanResponderRelease (PanResponder released)', {
        eventId: ev.id,
        eventTitle: ev.title,
        allowDrag: allowDragRef.current,
        dragActivated: dragActivatedRef.current,
        isMoving,
        isScrollDetected: isScrollDetectedRef.current,
        menuVisible: menuVisibleRef.current,
        showContextMenu,
        showGhost,
        finalDx: gesture.dx,
        finalDy: gesture.dy,
        timestamp: Date.now()
      });
      
      // Limpiar todos los timers
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (dragActivationTimerRef.current) {
        clearTimeout(dragActivationTimerRef.current);
        dragActivationTimerRef.current = null;
      }
      
      // Si se mostró el menú de long press, NO tratar esto como tap corto
      if (menuVisibleRef.current || showContextMenu) {
        console.log('📌 DEBUG - Release ignored - menu visible', {
          eventId: ev.id,
          eventTitle: ev.title,
          timestamp: Date.now()
        });
        setIsMoving(false);
        setShowGhost(false);
        allowDragRef.current = false;
        dragActivatedRef.current = false;
        isScrollDetectedRef.current = false;
        return;
      }
      
      // 🔧 FIX: Si se detectó scroll, NO tratar el release como tap
      if (isScrollDetectedRef.current) {
        console.log('📜 DEBUG - Release ignored - scroll detected', {
          eventId: ev.id,
          eventTitle: ev.title,
          timestamp: Date.now()
        });
        setIsMoving(false);
        setShowGhost(false);
        allowDragRef.current = false;
        dragActivatedRef.current = false;
        isScrollDetectedRef.current = false;
        return; // Salir sin hacer nada - el scroll ya está manejado por el ScrollView
      }
      
      // Si está en drag mode, procesar el movimiento
      if (allowDragRef.current && dragActivatedRef.current) {
        const currentInitial = getInitial();
        const deltaY = gesture.dy;
        const deltaX = gesture.dx;
        const deltaSlotsY = Math.round(deltaY / CELL_HEIGHT);
        const deltaMinY = deltaSlotsY * 30;
        const newStartTime = Math.max(0, currentInitial.startTime + deltaMinY);
        
        const deltaSlotsX = Math.round(deltaX / cellWidth);
        const newDate = new Date(currentInitial.date);
        newDate.setDate(newDate.getDate() + deltaSlotsX);
        const newDateString = newDate.toISOString().slice(0, 10);
        
        console.log('✅ DEBUG - Move commit', {
          eventId: ev.id,
          eventTitle: ev.title,
          oldStartTime: currentInitial.startTime,
          newStartTime,
          oldDate: currentInitial.date,
          newDate: newDateString,
          deltaY,
          deltaX,
          timestamp: Date.now()
        });
        
        setShowGhost(false);
        setIsMoving(false);
        allowDragRef.current = false;
        dragActivatedRef.current = false;
        
        // Solo mover si hay cambio significativo
        if (newStartTime !== currentInitial.startTime || newDateString !== currentInitial.date) {
          commitMove(newStartTime, newDateString);
        }
      } else {
        console.log('⚠️ DEBUG - Release - drag not activated, cleaning state', {
          eventId: ev.id,
          eventTitle: ev.title,
          timestamp: Date.now()
        });
        // Si no se activó el drag, limpiar flags
        setIsMoving(false);
        setShowGhost(false);
        allowDragRef.current = false;
        dragActivatedRef.current = false;
        isScrollDetectedRef.current = false;
      }
    },
    onPanResponderTerminationRequest: () => {
      const shouldTerminate = isScrollDetectedRef.current || !dragActivatedRef.current;
      console.log('🔄 DEBUG - Move onPanResponderTerminationRequest', {
        eventId: ev.id,
        eventTitle: ev.title,
        isScrollDetected: isScrollDetectedRef.current,
        dragActivated: dragActivatedRef.current,
        shouldTerminate,
        timestamp: Date.now()
      });
      // 🔧 FIX: Permitir terminar si detectamos scroll o si el drag no está activado
      // Esto permite que el ScrollView capture el gesto para hacer scroll
      if (isScrollDetectedRef.current || !dragActivatedRef.current) {
        return true; // Permitir que otro responder (ScrollView) tome el control
      }
      // No terminar si el drag está activado
      return false;
    },
    onPanResponderTerminate: () => {
      console.log('🔄 DEBUG - Move onPanResponderTerminate', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      
      // Limpiar todos los timers
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (dragActivationTimerRef.current) {
        clearTimeout(dragActivationTimerRef.current);
        dragActivationTimerRef.current = null;
      }
      
      setShowGhost(false);
      setIsMoving(false);
      allowDragRef.current = false;
      dragActivatedRef.current = false;
      isScrollDetectedRef.current = false;
    },
  })).current;

  return (
    <View style={{ flex: 1 }}>
      {/* 🔧 FIX: Mostrar ghost siempre, pero calcular offset correcto cuando renderOnlyBottomHandler */}
      {showGhost && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            right: 2,
            transform: [
              { translateY: ghostTopOffset },
              { translateX: ghostLeftOffset }
            ],
            height: ghostHeight,
            borderWidth: 3,
            borderStyle: 'dashed',
            borderColor: colorState.solidColor, // 🎨 ESTÉTICA: Usar color efectivo
            borderRadius: 4,
            backgroundColor: `${colorState.solidColor}40`, // 40% opacity
            zIndex: isResizing ? 2000 : 200, // 🔧 FIX: zIndex más alto cuando está resizing para que esté por encima del bloque
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: isResizing ? 15 : 5, // También aumentar elevation en Android
          }}
        >
          {/* Indicador de resize en el ghost */}
          <View style={{
            position: 'absolute',
            top: 4,
            left: 4,
            right: 4,
            height: 3,
            backgroundColor: '#fff',
            borderRadius: 2,
            opacity: 0.9,
            borderWidth: 1,
            borderColor: colorState.solidColor // 🎨 ESTÉTICA: Usar color efectivo
          }} />
          <View style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            right: 4,
            height: 3,
            backgroundColor: '#fff',
            borderRadius: 2,
            opacity: 0.9,
            borderWidth: 1,
            borderColor: colorState.solidColor // 🎨 ESTÉTICA: Usar color efectivo
          }} />
        </Animated.View>
      )}

      {/* 🔧 FIX: Si solo renderizar handler de abajo, mostrar solo el handler invisible en la celda actual */}
      {renderOnlyBottomHandler ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CELL_HEIGHT, zIndex: 10 }}>
          {/* Handler de abajo en la última celda - 12px de altura fija */}
          <View 
            {...bottomResponder.panHandlers} 
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: 12,
              zIndex: 15
            }} 
          />
        </View>
      ) : (
        <>
          {/* 🎨 ESTÉTICA: Usar color sólido (LinearGradient deshabilitado) */}
          <View 
            key={`${ev.id}-${forceRender}`}
            style={[
              styles.eventBlock, 
              shadowStyle,
              { 
                backgroundColor: colorState.solidColor,
                height: blockHeight,
                minHeight: blockHeight,
                zIndex: 1000,
              }
            ]}
          >
            {/* 🎯 Icono de agarre en la parte superior para bloques grandes */}
            {showGripIcon && (
              <View style={{
                position: 'absolute',
                top: 4,
                left: 0,
                right: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 11,
              }}>
                {/* Tres líneas horizontales apiladas como indicador de agarre */}
                <View style={{
                  width: 24,
                  height: 8,
                  justifyContent: 'space-between',
                }}>
                  <View style={{
                    width: '100%',
                    height: 1.5,
                    backgroundColor: gripIconColor,
                    borderRadius: 0.75,
                  }} />
                  <View style={{
                    width: '100%',
                    height: 1.5,
                    backgroundColor: gripIconColor,
                    borderRadius: 0.75,
                  }} />
                  <View style={{
                    width: '100%',
                    height: 1.5,
                    backgroundColor: gripIconColor,
                    borderRadius: 0.75,
                  }} />
                </View>
              </View>
            )}
            <Text style={[
              styles.eventText,
              currentView === 'day' && styles.eventTextDay,
              currentView === 'week' && styles.eventTextWeek,
              // 🆕 Texto negro para eventos dorados completados
              colorState.solidColor === '#DAA520' && { color: '#000', fontWeight: '600' },
              // 🆕 Texto blanco para eventos gris oscuro (con subtareas incompletas)
              colorState.solidColor === '#4a4a4a' && { color: '#fff' },
              // Ajustar padding top si hay icono de agarre
              showGripIcon && { paddingTop: 16 }
            ]} numberOfLines={2}>{ev.title}</Text>
            {/* Handles invisibles superior e inferior (hitzone ampliada) */}
            {/* Handler superior - 12px de altura fija */}
            <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, zIndex: 10 }} />
            
            {/* Handler inferior - 12px de altura fija */}
            <View 
              {...bottomResponder.panHandlers} 
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                height: 12,
                zIndex: 10
              }} 
            />
            
            {/* Área central para mover el bloque completo */}
            <View 
              {...moveResponder.panHandlers}
              onTouchStart={(e) => {
                const touch = e.nativeEvent.touches[0];
                const touchX = touch?.pageX || 0;
                const touchY = touch?.pageY || 0;
                
                // Guardar tiempo de inicio del touch para detectar quick press
                touchStartTimeRef.current = Date.now();
                touchPositionRef.current = { x: touchX, y: touchY };
                isFingerDownRef.current = true;
                
                const previousState = {
                  allowDrag: allowDragRef.current,
                  dragActivated: dragActivatedRef.current,
                  hasDragTimer: dragActivationTimerRef.current !== null,
                  hasLongPressTimer: longPressTimer.current !== null,
                  isMoving,
                  isResizing,
                  isScrollDetected: isScrollDetectedRef.current,
                  menuVisible: menuVisibleRef.current,
                  showGhost
                };
                
                console.log('👆 DEBUG - onTouchStart (finger down on block)', {
                  eventId: ev.id,
                  eventTitle: ev.title,
                  previousState,
                  touchX,
                  touchY,
                  timestamp: Date.now()
                });
                
                // 🔧 FIX: Iniciar timer de detección cuando el usuario toca el bloque
                // Esto NO interfiere con el scroll porque no capturamos el gesto
                startDragDetectionTimer();
                
                console.log('👆 DEBUG - Resetting scroll state and starting timer', {
                  eventId: ev.id,
                  eventTitle: ev.title,
                  timestamp: Date.now()
                });
              }}
              onTouchEnd={(e) => {
                const touchEndTime = Date.now();
                const touchDuration = touchStartTimeRef.current ? touchEndTime - touchStartTimeRef.current : 0;
                const QUICK_PRESS_MAX_DURATION = 300; // Máximo 300ms para considerar quick press
                
                isFingerDownRef.current = false;
                
                const currentState = {
                  allowDrag: allowDragRef.current,
                  dragActivated: dragActivatedRef.current,
                  hasDragTimer: dragActivationTimerRef.current !== null,
                  hasLongPressTimer: longPressTimer.current !== null,
                  isMoving,
                  isResizing,
                  isScrollDetected: isScrollDetectedRef.current,
                  menuVisible: menuVisibleRef.current,
                  showContextMenu,
                  showGhost
                };
                
                console.log('👋 DEBUG - onTouchEnd (finger up from block)', {
                  eventId: ev.id,
                  eventTitle: ev.title,
                  currentState,
                  touchDuration,
                  timestamp: Date.now()
                });
                
                // 🔧 FIX: Limpiar estado si el PanResponder no capturó el gesto
                // Esto ocurre cuando el usuario suelta rápido sin activar drag
                // Solo limpiar si no hay drag activo (para evitar interferir con PanResponderRelease)
                if (!dragActivatedRef.current && !isResizing) {
                  console.log('🔵 DEBUG - PanResponder did not capture, cleaning state', {
                    eventId: ev.id,
                    eventTitle: ev.title,
                    touchDuration,
                    timestamp: Date.now()
                  });
                  
                  // Cancelar todos los timers
                  if (dragActivationTimerRef.current) {
                    clearTimeout(dragActivationTimerRef.current);
                    dragActivationTimerRef.current = null;
                  }
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                  
                  // Verificar si fue un quick press válido
                  const isValidQuickPress = 
                    touchDuration > 0 && 
                    touchDuration <= QUICK_PRESS_MAX_DURATION &&
                    !isScrollDetectedRef.current &&
                    !menuVisibleRef.current &&
                    !showContextMenu &&
                    !dragActivatedRef.current;
                  
                  console.log('🔵 DEBUG - Quick press validation', {
                    eventId: ev.id,
                    eventTitle: ev.title,
                    touchDuration,
                    maxDuration: QUICK_PRESS_MAX_DURATION,
                    isScrollDetected: isScrollDetectedRef.current,
                    menuVisible: menuVisibleRef.current,
                    showContextMenu,
                    dragActivated: dragActivatedRef.current,
                    isValidQuickPress,
                    timestamp: Date.now()
                  });
                  
                  // Limpiar flags y estado visual
                  setIsMoving(false);
                  setShowGhost(false);
                  allowDragRef.current = false;
                  dragActivatedRef.current = false;
                  isScrollDetectedRef.current = false;
                  touchStartTimeRef.current = null;
                  touchPositionRef.current = null;
                  
                  // Solo llamar onQuickPress si fue un quick press válido
                  if (isValidQuickPress) {
                    console.log('✅ DEBUG - Quick press detected, calling onQuickPress', {
                      eventId: ev.id,
                      eventTitle: ev.title,
                      timestamp: Date.now()
                    });
                    onQuickPress(ev);
                  }
                } else {
                  touchStartTimeRef.current = null;
                  touchPositionRef.current = null;
                }
              }}
              style={{ position: 'absolute', top: 12, left: 0, right: 0, height: Math.max(blockHeight - 24, 12) }}
              onLayout={() => {}}
            />
          </View>
        </>
      )}

      {/* Menú contextual */}
      <ContextMenu
        visible={showContextMenu}
        position={menuPosition}
        currentView={currentView}
        onDuplicate={() => {
          if (typeof onDuplicate === 'function') {
            onDuplicate(ev);
          }
          setShowContextMenu(false);
          menuVisibleRef.current = false;
        }}
        onDelete={() => {
          console.log('🗑️ Eliminar Evento:', ev.title);
          setShowContextMenu(false);
          menuVisibleRef.current = false;
        }}
        eventTitle={ev.title}
      />
    </View>
  );
});

// Styles - necesito copiar los estilos del archivo original
const styles = {
  eventBlock: {
    position: 'absolute' as const,
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 8,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  eventText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  eventTextDay: {
    fontSize: 14,
    lineHeight: 16,
  },
  eventTextWeek: {
    fontSize: 12,
    lineHeight: 14,
  },
};

export default EventResizableBlock;
