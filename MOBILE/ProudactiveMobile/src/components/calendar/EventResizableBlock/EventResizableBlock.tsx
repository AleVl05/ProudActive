// EventResizableBlock.tsx - Resizable event block component (drag and drop removed)
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Pressable,
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
  onMoveCommit?: (event: Event, newStartTime: number, newDate: string) => void; // Nueva prop para mover eventos
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
  const ghostTopOffsetRef = useRef(0); // Ref para rastrear el valor actual del offset Y
  const ghostLeftOffsetRef = useRef(0); // Ref para rastrear el valor actual del offset X
  const [showGhost, setShowGhost] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActivationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuVisibleRef = useRef(false);
  const isResizingRef = useRef(false); // Ref para rastrear estado de resize de forma síncrona
  const isMovingRef = useRef(false); // Ref para rastrear estado de drag de forma síncrona
  const dragTouchStartRef = useRef<{ x: number; y: number; time: number; relativeY?: number } | null>(null);
  const hasMovedRef = useRef(false); // Para detectar si hubo movimiento durante el timer
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
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (dragActivationTimer.current) {
        clearTimeout(dragActivationTimer.current);
        dragActivationTimer.current = null;
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

  // Función para mostrar el menú contextual (long press)
  const showContextMenuHandler = useCallback(() => {
    if (isResizing || showContextMenu) {
      return; // No mostrar menú si está resizing o ya está visible
    }
    
    // Calcular posición del menú (arriba del evento)
    const eventHeight = (ev.duration / 30) * CELL_HEIGHT - 2;
    const menuHeight = 100; // Altura aproximada del menú
    const menuY = -menuHeight - 10; // 10px de separación
    
    setMenuPosition({ x: 0, y: menuY });
    setShowContextMenu(true);
    menuVisibleRef.current = true;
  }, [ev, isResizing, showContextMenu]);
  
  // Función para activar long press externamente (compatibilidad con código existente)
  const triggerLongPress = useCallback(() => {
    showContextMenuHandler();
  }, [showContextMenuHandler]);

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
    if (onMoveCommit) {
      onMoveCommit(ev, newStartTime, newDate);
    }
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

  // Refs para detectar movimiento en handlers de resize (para distinguir entre resize y long press)
  const topHandlerTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const bottomHandlerTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  // PanResponder para drag and drop del área central
  const dragResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false, // No capturar inmediatamente - permitir scroll
    onStartShouldSetPanResponderCapture: () => false, // No capturar en capture phase
    onMoveShouldSetPanResponder: (_, gesture) => {
      // Solo capturar si el drag está activado
      if (isMovingRef.current) {
        return true;
      }
      // Si hay movimiento significativo y NO está activado el drag, NO capturar (permitir scroll)
      if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
        // Cancelar timer de activación si existe
        if (dragActivationTimer.current) {
          hasMovedRef.current = true;
          clearTimeout(dragActivationTimer.current);
          dragActivationTimer.current = null;
          dragTouchStartRef.current = null;
        }
        return false; // No capturar - permitir scroll
      }
      return false;
    },
    onPanResponderGrant: () => {
      // Este solo se llama si isMovingRef.current es true (ya activado)
      // No necesitamos hacer nada aquí porque el drag ya está activado
    },
    onPanResponderMove: (_, gesture) => {
      // Si el drag está activado, mover el bloque
      if (isMovingRef.current) {
        // Cancelar el timer de 2 segundos si hay movimiento (significa que está haciendo drag activo)
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        
        const deltaY = gesture.dy;
        const deltaX = gesture.dx;
        const deltaSlotsY = Math.round(deltaY / CELL_HEIGHT);
        const deltaSlotsX = Math.round(deltaX / cellWidth);
        
        // Si hay offset inicial (renderOnlyBottomHandler), sumarlo al movimiento
        const initialOffset = dragTouchStartRef.current?.relativeY || 0;
        const newTopOffset = initialOffset + (deltaSlotsY * CELL_HEIGHT);
        const newLeftOffset = deltaSlotsX * cellWidth;
        ghostTopOffset.setValue(newTopOffset);
        ghostLeftOffset.setValue(newLeftOffset);
        ghostTopOffsetRef.current = newTopOffset;
        ghostLeftOffsetRef.current = newLeftOffset;
      }
    },
    onPanResponderRelease: (_, gesture) => {
      // Limpiar todos los timers
      if (dragActivationTimer.current) {
        clearTimeout(dragActivationTimer.current);
        dragActivationTimer.current = null;
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      // Si el drag estaba activado, hacer commit del movimiento
      if (isMovingRef.current) {
        const currentInitial = getInitial();
        
        // Obtener el offset actual del ghost desde los refs (que ya incluye el offset inicial si es renderOnlyBottomHandler)
        const currentGhostOffsetY = ghostTopOffsetRef.current;
        const currentGhostOffsetX = ghostLeftOffsetRef.current;
        
        // Calcular el movimiento total: el offset del ghost es relativo al inicio del bloque
        const deltaSlotsY = Math.round(currentGhostOffsetY / CELL_HEIGHT);
        const deltaMinY = deltaSlotsY * 30;
        const newStartTime = Math.max(0, currentInitial.startTime + deltaMinY);
        
        const deltaSlotsX = Math.round(currentGhostOffsetX / cellWidth);
        const newDate = new Date(currentInitial.date);
        newDate.setDate(newDate.getDate() + deltaSlotsX);
        const newDateString = newDate.toISOString().slice(0, 10);
        
        // Limpiar estado
        setShowGhost(false);
        setIsMoving(false);
        isMovingRef.current = false;
        dragTouchStartRef.current = null;
        ghostTopOffsetRef.current = 0;
        ghostLeftOffsetRef.current = 0;
        
        // Solo mover si hay cambio significativo
        if (newStartTime !== currentInitial.startTime || newDateString !== currentInitial.date) {
          commitMove(newStartTime, newDateString);
        }
      } else {
        // Si no estaba en drag, limpiar refs
        dragTouchStartRef.current = null;
        hasMovedRef.current = false;
      }
    },
    onPanResponderTerminationRequest: () => {
      // Permitir terminar si no hay drag activado (para scroll)
      return !isMovingRef.current;
    },
    onPanResponderTerminate: () => {
      // Limpiar todos los timers
      if (dragActivationTimer.current) {
        clearTimeout(dragActivationTimer.current);
        dragActivationTimer.current = null;
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      if (isMovingRef.current) {
        setShowGhost(false);
        setIsMoving(false);
        isMovingRef.current = false;
        ghostTopOffsetRef.current = 0;
        ghostLeftOffsetRef.current = 0;
      }
      dragTouchStartRef.current = null;
      hasMovedRef.current = false;
    },
  })).current;
  
  // Función para iniciar el timer de activación de drag
  const startDragActivation = useCallback((touchX: number, touchY: number) => {
    // Limpiar cualquier timer anterior
    if (dragActivationTimer.current) {
      clearTimeout(dragActivationTimer.current);
    }
    
    const currentInitial = getInitial();
    
    // Calcular offset Y relativo si estamos en renderOnlyBottomHandler
    let relativeY = 0;
    if (renderOnlyBottomHandler && currentCellStartTime !== undefined) {
      const timeDiffMinutes = currentInitial.startTime - currentCellStartTime;
      relativeY = (timeDiffMinutes / 30) * CELL_HEIGHT;
    }
    
    dragTouchStartRef.current = {
      x: touchX,
      y: touchY,
      time: Date.now(),
      relativeY: relativeY
    };
    hasMovedRef.current = false;
    
    // Timer de 500ms para activar drag (si no hay movimiento)
    dragActivationTimer.current = setTimeout(() => {
      // Si no hubo movimiento durante 500ms, activar drag
      if (dragTouchStartRef.current && !hasMovedRef.current && !isResizingRef.current && !isMovingRef.current) {
        isMovingRef.current = true;
        setIsMoving(true);
        setShowGhost(true);
        
        // Ajustar offset inicial si estamos en renderOnlyBottomHandler
        const initialOffset = dragTouchStartRef.current.relativeY || 0;
        ghostTopOffset.setValue(initialOffset);
        ghostLeftOffset.setValue(0);
        ghostTopOffsetRef.current = initialOffset;
        ghostLeftOffsetRef.current = 0;
        ghostHeight.setValue((currentInitial.duration / 30) * CELL_HEIGHT - 2);
        
        // Iniciar timer de 2000ms total (1500ms más) para panel
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        longPressTimer.current = setTimeout(() => {
          // Si después de 2 segundos totales aún estamos en drag, mostrar panel
          if (isMovingRef.current && dragTouchStartRef.current) {
            isMovingRef.current = false;
            setIsMoving(false);
            setShowGhost(false);
            showContextMenuHandler();
          }
        }, 1500); // 1500ms más para completar 2000ms total (500ms ya pasaron)
      }
      dragActivationTimer.current = null;
    }, 500);
  }, [showContextMenuHandler, renderOnlyBottomHandler, currentCellStartTime]);
  
  // Función para cancelar el timer de activación si hay movimiento
  const cancelDragActivation = useCallback(() => {
    if (dragActivationTimer.current) {
      hasMovedRef.current = true;
      clearTimeout(dragActivationTimer.current);
      dragActivationTimer.current = null;
      dragTouchStartRef.current = null;
    }
  }, []);
  
  const topResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => {
      console.log('🔝 DEBUG - Top Resize onStartShouldSetPanResponder', {
        eventId: ev.id,
        eventTitle: ev.title,
        timestamp: Date.now()
      });
      return true;
    },
    onPanResponderGrant: (evt) => {
      // Guardar información del touch inicial para detectar si es solo long press o resize
      const touch = evt.nativeEvent.touches[0];
      if (touch) {
        topHandlerTouchStartRef.current = {
          x: touch.pageX,
          y: touch.pageY,
          time: Date.now()
        };
        
        // Iniciar timer para long press (si no hay movimiento después de 2 segundos)
        longPressTimer.current = setTimeout(() => {
          // Si aún estamos aquí y no se ha movido significativamente, es long press
          // Cancelar el resize y mostrar menú
          if (topHandlerTouchStartRef.current && isResizing) {
            setShowGhost(false);
            setIsResizing(false);
            showContextMenuHandler();
          }
        }, 2000);
      }
      
      // Iniciar resize inmediatamente (como funcionaba antes)
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
      isResizingRef.current = true; // Actualizar ref también
      ghostTopOffset.setValue(0);
      ghostHeight.setValue((currentInitial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      // Si hay movimiento significativo, cancelar timer de long press (es resize, no long press)
      if (longPressTimer.current && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5)) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        topHandlerTouchStartRef.current = null;
      }
      
      // Procesar movimiento del resize
      
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
      console.log('🔝 DEBUG - Top Resize onPanResponderRelease CALLED', {
        eventId: ev.id,
        eventTitle: ev.title,
        isResizing: isResizing,
        isResizingRef: isResizingRef.current,
        gestureDy: gesture.dy,
        timestamp: Date.now()
      });
      
      // Limpiar timer y refs PRIMERO
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      topHandlerTouchStartRef.current = null;
      
      // Si no estábamos resizing, no hacer commit (puede ser solo un tap)
      if (!isResizingRef.current && !isResizing) {
        console.log('🔝 DEBUG - Top Resize Release: No estaba resizing, saliendo');
        return;
      }
      
      // Limpiar estado visual PRIMERO
      setShowGhost(false);
      setIsResizing(false);
      isResizingRef.current = false;
      
      // Calcular y commit el resize
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
      
      console.log('🔝 DEBUG - Top Resize onPanResponderRelease - COMMITTING', {
        eventId: ev.id,
        eventTitle: ev.title,
        finalStart,
        finalDuration,
        originalStart: currentInitial.startTime,
        originalDuration: currentInitial.duration,
        deltaSlots,
        deltaMin,
        timestamp: Date.now()
      });
      
      // Hacer commit del resize
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
      
      // Limpiar timer y refs
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      topHandlerTouchStartRef.current = null;
      
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
    onPanResponderGrant: (evt) => {
      // Guardar información del touch inicial para detectar si es solo long press o resize
      const touch = evt.nativeEvent.touches[0];
      if (touch) {
        bottomHandlerTouchStartRef.current = {
          x: touch.pageX,
          y: touch.pageY,
          time: Date.now()
        };
        
        // Iniciar timer para long press (si no hay movimiento después de 2 segundos)
        longPressTimer.current = setTimeout(() => {
          // Si aún estamos aquí y no se ha movido significativamente, es long press
          // Cancelar el resize y mostrar menú
          if (bottomHandlerTouchStartRef.current && isResizing) {
            setShowGhost(false);
            setIsResizing(false);
            showContextMenuHandler();
          }
        }, 2000);
      }
      
      // Iniciar resize inmediatamente (como funcionaba antes)
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
      isResizingRef.current = true; // Actualizar ref también
      
      // 🔧 FIX: Cuando renderOnlyBottomHandler, calcular offset correcto
      if (renderOnlyBottomHandler && currentCellStartTime !== undefined) {
        const timeDiffMinutes = currentInitial.startTime - currentCellStartTime;
        const timeDiffSlots = timeDiffMinutes / 30;
        const offsetY = timeDiffSlots * CELL_HEIGHT;
        ghostTopOffset.setValue(offsetY);
      } else {
        ghostTopOffset.setValue(0);
      }
      
      ghostHeight.setValue((currentInitial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      // Si hay movimiento significativo, cancelar timer de long press (es resize, no long press)
      if (longPressTimer.current && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5)) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        bottomHandlerTouchStartRef.current = null;
      }
      
      // Procesar movimiento del resize
      
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
      console.log('🔽 DEBUG - Bottom Resize onPanResponderRelease CALLED', {
        eventId: ev.id,
        eventTitle: ev.title,
        isResizing: isResizing,
        isResizingRef: isResizingRef.current,
        gestureDy: gesture.dy,
        timestamp: Date.now()
      });
      
      // Limpiar timer y refs PRIMERO
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      bottomHandlerTouchStartRef.current = null;
      
      // Si no estábamos resizing, no hacer commit (puede ser solo un tap)
      if (!isResizingRef.current && !isResizing) {
        console.log('🔽 DEBUG - Bottom Resize Release: No estaba resizing, saliendo');
        return;
      }
      
      // Limpiar estado visual PRIMERO
      setShowGhost(false);
      setIsResizing(false);
      isResizingRef.current = false;
      
      // Calcular y commit el resize
      const currentInitial = getInitial();
      
      // 🔧 FIX: Mismo cálculo que en Move
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newDuration = currentInitial.duration + deltaMin;
      
      console.log('🔽 DEBUG - Bottom Resize onPanResponderRelease - COMMITTING', {
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
      
      // Hacer commit del resize
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
      
      // Limpiar timer y refs
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      bottomHandlerTouchStartRef.current = null;
      
      // Limpiar estado visual si estábamos resizing
      if (isResizing || isResizingRef.current) {
        setShowGhost(false);
        setIsResizing(false);
        isResizingRef.current = false;
      }
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
              zIndex: 20
            }} 
          />
          
          {/* Área de drag and drop también en el cuerpo (celdas intermedias y finales) */}
          <View 
            {...dragResponder.panHandlers}
            onTouchStart={(e) => {
              const touch = e.nativeEvent.touches[0];
              if (touch && !isResizingRef.current && !isMovingRef.current) {
                startDragActivation(touch.pageX, touch.pageY);
              }
            }}
            onTouchMove={(e) => {
              // Si hay movimiento durante el timer, cancelarlo (es scroll, no drag)
              if (dragActivationTimer.current && !isMovingRef.current) {
                cancelDragActivation();
              }
            }}
            onTouchEnd={() => {
              // Limpiar timers si no se activó el drag
              if (!isMovingRef.current) {
                if (dragActivationTimer.current) {
                  clearTimeout(dragActivationTimer.current);
                  dragActivationTimer.current = null;
                }
                dragTouchStartRef.current = null;
                hasMovedRef.current = false;
              }
            }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 }}
          >
            <Pressable 
              android_ripple={null}
              onPress={() => {
                // Solo llamar onQuickPress si no hay menú visible, no está resizing y no está moviendo
                if (!showContextMenu && !isResizing && !isMoving) {
                  onQuickPress(ev);
                }
              }}
              style={({ pressed }) => [
                { flex: 1, opacity: 1 } // Mantener opacidad constante
              ]}
            />
          </View>
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
            {/* Handles invisibles superior e inferior para resize (zIndex alto para prioridad) */}
            {/* Handler superior - 12px de altura fija */}
            <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, zIndex: 20 }} />
            
            {/* Handler inferior - 12px de altura fija */}
            <View 
              {...bottomResponder.panHandlers} 
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                height: 12,
                zIndex: 20
              }} 
            />
            
            {/* Área completa para quick press, drag and drop, y long press (cabeza + cuerpo) */}
            <View 
              {...dragResponder.panHandlers}
              onTouchStart={(e) => {
                const touch = e.nativeEvent.touches[0];
                if (touch && !isResizingRef.current && !isMovingRef.current) {
                  startDragActivation(touch.pageX, touch.pageY);
                }
              }}
              onTouchMove={(e) => {
                // Si hay movimiento durante el timer, cancelarlo (es scroll, no drag)
                if (dragActivationTimer.current && !isMovingRef.current) {
                  cancelDragActivation();
                }
              }}
              onTouchEnd={() => {
                // Limpiar timers si no se activó el drag
                if (!isMovingRef.current) {
                  if (dragActivationTimer.current) {
                    clearTimeout(dragActivationTimer.current);
                    dragActivationTimer.current = null;
                  }
                  dragTouchStartRef.current = null;
                  hasMovedRef.current = false;
                }
              }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 }}
            >
              <Pressable 
                android_ripple={null}
                onPress={() => {
                  // Solo llamar onQuickPress si no hay menú visible, no está resizing y no está moviendo
                  if (!showContextMenu && !isResizing && !isMoving) {
                    onQuickPress(ev);
                  }
                }}
                style={({ pressed }) => [
                  { flex: 1, opacity: 1 } // Mantener opacidad constante
                ]}
              />
            </View>
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
