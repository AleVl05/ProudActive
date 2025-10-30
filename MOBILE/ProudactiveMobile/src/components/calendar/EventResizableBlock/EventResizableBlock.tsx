// EventResizableBlock.tsx - Resizable and draggable event block component
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Modal,
} from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient'; // Deshabilitado - Linear Gradient no funciona

import { CELL_HEIGHT } from '../../../utils/dateConstants';
import ContextMenu from '../ContextMenu';

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
  onDuplicate
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
  const menuVisibleRef = useRef(false);
  const initial = useRef({ startTime: ev.startTime, duration: ev.duration, date: ev.date }).current;

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
      return true;
    },
    onPanResponderGrant: () => {
      
      setShowGhost(true);
      setIsResizing(true);
      ghostTopOffset.setValue(0);
      ghostHeight.setValue((initial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT); // snap 30min
      const deltaMin = deltaSlots * 30;
      const newStart = initial.startTime + deltaMin;
      const newDuration = initial.duration - deltaMin;
      
      // Validaciones robustas
      const minDuration = 30; // 30 minutos mínimo
      const maxDuration = 24 * 60; // 24 horas máximo
      const minStartTime = 0; // No puede empezar antes de medianoche
      const maxStartTime = 24 * 60 - minDuration; // No puede empezar tan tarde que no quede tiempo mínimo
      
      const isValidDuration = newDuration >= minDuration && newDuration <= maxDuration;
      const isValidStart = newStart >= minStartTime && newStart <= maxStartTime;
      const isValid = isValidDuration && isValidStart;
      
      if (isValid) {
        ghostTopOffset.setValue(deltaSlots * CELL_HEIGHT);
        ghostHeight.setValue((newDuration / 30) * CELL_HEIGHT - 2);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newStart = Math.max(0, initial.startTime + deltaMin);
      const newDuration = Math.max(30, initial.duration - deltaMin);
      
      // Validaciones finales
      const minDuration = 30;
      const maxDuration = 24 * 60;
      const maxStartTime = 24 * 60 - minDuration;
      
      const finalStart = Math.min(newStart, maxStartTime);
      const finalDuration = Math.min(Math.max(newDuration, minDuration), maxDuration);
      
      setShowGhost(false);
      setIsResizing(false);
      commitResize(finalStart, finalDuration);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {
      setShowGhost(false);
      setIsResizing(false);
    },
  })).current;

  const bottomResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => {
      return true;
    },
    onPanResponderGrant: () => {
      
      setShowGhost(true);
      setIsResizing(true);
      ghostTopOffset.setValue(0);
      ghostHeight.setValue((initial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newDuration = initial.duration + deltaMin;
      
      // Validaciones robustas
      const minDuration = 30; // 30 minutos mínimo
      const maxDuration = 24 * 60; // 24 horas máximo
      const maxEndTime = 24 * 60; // No puede terminar después de medianoche del día siguiente
      const newEndTime = initial.startTime + newDuration;
      
      const isValidDuration = newDuration >= minDuration && newDuration <= maxDuration;
      const isValidEndTime = newEndTime <= maxEndTime;
      const isValid = isValidDuration && isValidEndTime;
      
      if (isValid) {
        ghostHeight.setValue((newDuration / 30) * CELL_HEIGHT - 2);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newDuration = initial.duration + deltaMin;
      
      // Validaciones finales
      const minDuration = 30;
      const maxDuration = 24 * 60;
      const maxEndTime = 24 * 60;
      const newEndTime = initial.startTime + newDuration;
      
      const finalDuration = Math.min(Math.max(newDuration, minDuration), maxDuration);
      const finalEndTime = initial.startTime + finalDuration;
      const adjustedDuration = finalEndTime > maxEndTime ? maxEndTime - initial.startTime : finalDuration;
      
      setShowGhost(false);
      setIsResizing(false);
      commitResize(initial.startTime, adjustedDuration);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {
      setShowGhost(false);
      setIsResizing(false);
    },
  })).current;

  // PanResponder para mover el bloque completo
  const moveResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => {
      return false; // no captura inicial (tap corto pasa si no hay movimiento)
    },
    onStartShouldSetPanResponderCapture: () => {
      return true; // capturar en la fase de captura para que no pase al fondo (evita "blanco")
    },
    onMoveShouldSetPanResponder: (_, gesture) => {
      const dx = Math.abs(gesture.dx || 0);
      const dy = Math.abs(gesture.dy || 0);
      const MOVE_THRESHOLD = 8;
      const shouldCapture = allowDragRef.current || dx >= MOVE_THRESHOLD || dy >= MOVE_THRESHOLD;
      
      return shouldCapture;
    },
    onPanResponderGrant: () => {
      // Solo iniciar timer de long press (1.5 segundos). NO activar drag aquí
      longPressTimer.current = setTimeout(() => {
        console.log('🎯 LONG PRESS DETECTED - Event:', ev.title, 'ID:', ev.id);
        
        // Calcular posición del menú (arriba del evento)
        const eventHeight = (ev.duration / 30) * CELL_HEIGHT - 2;
        const menuHeight = 100; // Altura aproximada del menú
        const menuY = -menuHeight - 10; // 10px de separación
        
        setMenuPosition({ x: 0, y: menuY });
        setShowContextMenu(true);
        menuVisibleRef.current = true;
      }, 1500);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaY = gesture.dy;
      const deltaX = gesture.dx;
      
      // Si hay movimiento, cancelar long press y cerrar menú
      if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setShowContextMenu(false);
        menuVisibleRef.current = false;
      }
      
      const MOVE_THRESHOLD = 8;
      const passedThreshold = Math.abs(deltaY) >= MOVE_THRESHOLD || Math.abs(deltaX) >= MOVE_THRESHOLD;
      if (passedThreshold && !allowDragRef.current) {
        allowDragRef.current = true;
        setShowGhost(true);
        setIsMoving(true);
        ghostTopOffset.setValue(0);
        ghostLeftOffset.setValue(0);
        ghostHeight.setValue((initial.duration / 30) * CELL_HEIGHT - 2);
      }
      
      if (allowDragRef.current) {
        const deltaSlotsY = Math.round(deltaY / CELL_HEIGHT);
        const deltaSlotsX = Math.round(deltaX / cellWidth);
        ghostTopOffset.setValue(deltaSlotsY * CELL_HEIGHT);
        ghostLeftOffset.setValue(deltaSlotsX * cellWidth);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      // Limpiar timer si existe
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      const deltaY = gesture.dy;
      const deltaX = gesture.dx;
      
      // Si se mostró el menú de long press, NO tratar esto como tap corto
      if (menuVisibleRef.current || showContextMenu) {
        setIsMoving(false);
        setShowGhost(false);
        allowDragRef.current = false;
        return;
      }

      // Si no se activó el drag mode, es un click corto - abrir modal
      if (!allowDragRef.current) {
        // Cerrar menú si está abierto
        setShowContextMenu(false);
        menuVisibleRef.current = false;
        
        if (typeof onQuickPress === 'function') {
          onQuickPress(ev);
        }
        return;
      }
      
      // Si está en drag mode, procesar el movimiento
      const deltaSlotsY = Math.round(deltaY / CELL_HEIGHT);
      const deltaMinY = deltaSlotsY * 30;
      const newStartTime = Math.max(0, initial.startTime + deltaMinY);
      
      const deltaSlotsX = Math.round(deltaX / cellWidth);
      const newDate = new Date(initial.date);
      newDate.setDate(newDate.getDate() + deltaSlotsX);
      const newDateString = newDate.toISOString().slice(0, 10);
      
      setShowGhost(false);
      setIsMoving(false);
      allowDragRef.current = false; // reset gate
      
      // Solo mover si hay cambio significativo
      if (newStartTime !== initial.startTime || newDateString !== initial.date) {
        commitMove(newStartTime, newDateString);
      }
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {
      // Limpiar timer si existe
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setShowGhost(false);
      setIsMoving(false);
      allowDragRef.current = false;
    },
  })).current;

  return (
    <View style={{ flex: 1 }}>
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
            zIndex: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
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
        <Text style={[
          styles.eventText,
          currentView === 'day' && styles.eventTextDay,
          currentView === 'week' && styles.eventTextWeek,
          // 🆕 Texto negro para eventos dorados completados
          colorState.solidColor === '#DAA520' && { color: '#000', fontWeight: '600' },
          // 🆕 Texto blanco para eventos gris oscuro (con subtareas incompletas)
          colorState.solidColor === '#4a4a4a' && { color: '#fff' }
        ]} numberOfLines={2}>{ev.title}</Text>
        {/* Handles invisibles superior e inferior (hitzone ampliada 12px) */}
        <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12 }} />
        <View {...bottomResponder.panHandlers} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 }} />
        {/* Área central para mover el bloque completo */}
        <View 
          {...moveResponder.panHandlers} 
          style={{ position: 'absolute', top: 12, left: 0, right: 0, height: Math.max(blockHeight - 24, 12) }}
          onLayout={() => {}}
        />
      </View>

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
