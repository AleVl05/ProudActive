// EventResizableBlock.tsx - Resizable and draggable event block component
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { CELL_HEIGHT } from '../../../utils/dateConstants';

// Types
interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  duration: number;
  date: string;
  color: string;
  category?: string;
}

interface EventResizableBlockProps {
  ev: Event;
  onResizeCommit: (event: Event, newStartTime: number, newDuration: number) => void;
  onMoveCommit: (event: Event, newStartTime: number, newDate: string) => void;
  onQuickPress: (event: Event) => void;
  cellWidth: number;
  currentView?: 'day' | 'week' | 'month' | 'year';
  subtaskStatus?: { hasSubtasks: boolean; allCompleted: boolean };
}

const EventResizableBlock = React.memo(function EventResizableBlock({ 
  ev, 
  onResizeCommit, 
  onMoveCommit, 
  onQuickPress, 
  cellWidth, 
  currentView = 'week',
  subtaskStatus = { hasSubtasks: false, allCompleted: false }
}: EventResizableBlockProps) {

  const ghostHeight = useRef(new Animated.Value((ev.duration / 30) * CELL_HEIGHT - 2)).current;
  const ghostTopOffset = useRef(new Animated.Value(0)).current;
  const ghostLeftOffset = useRef(new Animated.Value(0)).current;
  const [showGhost, setShowGhost] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const allowDragRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Estado 3: Todas las subtareas completadas → degradé dorado
      return {
        type: 'gradient' as const,
        colors: ['#B8860B', '#DAA520'], // Dorado oscuro a dorado medio
        solidColor: '#B8860B', // Para ghost y handles
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
      return true; // Siempre capturar para manejar click y long press
    },
    onStartShouldSetPanResponderCapture: () => {
      return true;
    },
    onMoveShouldSetPanResponder: (_, gesture) => {
      const dx = Math.abs(gesture.dx || 0);
      const dy = Math.abs(gesture.dy || 0);
      const MOVE_THRESHOLD = 8;
      const shouldCapture = allowDragRef.current || dx >= MOVE_THRESHOLD || dy >= MOVE_THRESHOLD;
      
      return shouldCapture;
    },
    onPanResponderGrant: () => {
      
      // Iniciar timer de long press (1 segundo)
      longPressTimer.current = setTimeout(() => {
        allowDragRef.current = true;
        setShowGhost(true);
        setIsMoving(true);
        ghostTopOffset.setValue(0);
        ghostLeftOffset.setValue(0);
        ghostHeight.setValue((initial.duration / 30) * CELL_HEIGHT - 2);
      }, 1000);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaY = gesture.dy;
      const deltaX = gesture.dx;
      
      // Calcular movimiento vertical (cambio de horario)
      const deltaSlotsY = Math.round(deltaY / CELL_HEIGHT);
      const deltaMinY = deltaSlotsY * 30;
      const newStartTime = Math.max(0, initial.startTime + deltaMinY);
      
      // Calcular movimiento horizontal (cambio de fecha)
      const deltaSlotsX = Math.round(deltaX / cellWidth);
      const newDate = new Date(initial.date);
      newDate.setDate(newDate.getDate() + deltaSlotsX);
      const newDateString = newDate.toISOString().slice(0, 10);
      
      // Actualizar posición del ghost
      ghostTopOffset.setValue(deltaSlotsY * CELL_HEIGHT);
      ghostLeftOffset.setValue(deltaSlotsX * cellWidth);
    },
    onPanResponderRelease: (_, gesture) => {
      // Limpiar timer si existe
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      const deltaY = gesture.dy;
      const deltaX = gesture.dx;
      
      // Si no se activó el drag mode, es un click corto - abrir modal
      if (!allowDragRef.current) {
        
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

      {/* 🎨 ESTÉTICA: Usar degradé o color sólido según estado de subtareas */}
      {colorState.type === 'gradient' ? (
        <LinearGradient
          key={`${ev.id}-${forceRender}`}
          colors={colorState.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }} // Diagonal: superior izquierda → inferior derecha
          style={[
            styles.eventBlock,
            shadowStyle,
            {
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
            { color: '#000' } // 🎨 ESTÉTICA: Texto negro sobre dorado
          ]} numberOfLines={2}>{ev.title}</Text>
          {/* Handles invisibles superior e inferior (hitzone ampliada 12px) */}
          <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12 }} />
          <View {...bottomResponder.panHandlers} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 }} />
          {/* Área central para mover el bloque completo */}
          <View 
            {...moveResponder.panHandlers} 
            style={{ position: 'absolute', top: 12, left: 0, right: 0, height: blockHeight - 24 }}
            onLayout={() => {}}
          />
        </LinearGradient>
      ) : (
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
            currentView === 'week' && styles.eventTextWeek
          ]} numberOfLines={2}>{ev.title}</Text>
          {/* Handles invisibles superior e inferior (hitzone ampliada 12px) */}
          <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12 }} />
          <View {...bottomResponder.panHandlers} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 }} />
          {/* Área central para mover el bloque completo */}
          <View 
            {...moveResponder.panHandlers} 
            style={{ position: 'absolute', top: 12, left: 0, right: 0, height: blockHeight - 24 }}
            onLayout={() => {}}
          />
        </View>
      )}
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
