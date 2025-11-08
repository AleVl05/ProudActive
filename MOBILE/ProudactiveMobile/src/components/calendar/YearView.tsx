// YearView.tsx - Component for year view calendar
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { MonthEvent, monthEventFrontendToBackend } from './monthEventHelpers';
import { apiPostMonthEvent, apiGetCalendars, apiDeleteMonthEvent } from '../../../services/calendarApi';
import { Alert } from 'react-native';

const GOAL_SUGGESTIONS = [
  'Ganar músculo en el gimnasio',
  'Generar $10,000',
  'Comprar mi casa',
  'Comprar mi auto',
  'Aprender un nuevo idioma',
  'Viajar a 3 países',
  'Leer 20 libros',
  'Iniciar mi negocio',
  'Completar mi educación',
  'Mejorar mi salud',
];

interface YearViewProps {
  currentDate: Date;
  yearEvents: MonthEvent[];
  onMonthPress: (year: number, month: number) => void;
  refreshYearEvents?: () => Promise<void>;
}

export default function YearView({
  currentDate,
  yearEvents,
  onMonthPress,
  refreshYearEvents,
}: YearViewProps) {
  const insets = useSafeAreaInsets();
  const [yearPlanModalVisible, setYearPlanModalVisible] = useState(false);
  const [yearPlanPage, setYearPlanPage] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [placedGoals, setPlacedGoals] = useState<Array<{
    id: string;
    goal: string;
    color: string;
    startDayOfYear: number; // Día del año (1-365/366)
    endDayOfYear: number; // Día del año (1-365/366, inclusive)
  }>>([]);
  const customGoalInputRef = useRef<TextInput>(null);
  const monthsBarRef = useRef<View>(null);
  const horizontalScrollViewRef = useRef<ScrollView>(null);
  const sharedScrollXRef = useRef<number>(0); // Ref compartido para el scroll actual
  const [monthsBarLayout, setMonthsBarLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [draggingGoal, setDraggingGoal] = useState<{ goal: string; color: string; startX: number; startY: number } | null>(null);
  const dragAnimatedX = useRef(new Animated.Value(0)).current;
  const dragAnimatedY = useRef(new Animated.Value(0)).current;

  const currentYear = currentDate.getFullYear();

  // Función para eliminar todos los eventos mensuales del año
  const handleDeleteAllYearEvents = async () => {
    try {
      setIsDeleting(true);
      
      // Obtener todos los eventos del año actual
      const eventsToDelete = yearEvents.filter(event => event.year === currentYear);
      
      if (eventsToDelete.length === 0) {
        Alert.alert('Información', 'No hay eventos para eliminar en este año.');
        setDeleteConfirmModalVisible(false);
        setIsDeleting(false);
        return;
      }

      // Eliminar cada evento
      const deletePromises = eventsToDelete.map(event => {
        // El ID del evento puede ser numérico o string
        const eventId = typeof event.id === 'string' ? event.id : String(event.id);
        return apiDeleteMonthEvent(eventId);
      });

      // Esperar a que todas las eliminaciones se completen
      const results = await Promise.allSettled(deletePromises);
      
      // Verificar si hubo algún error
      const errors = results.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        console.error('Error eliminando algunos eventos:', errors);
        Alert.alert('Error', 'Hubo un problema al eliminar algunos eventos. Por favor, intenta de nuevo.');
      } else {
        Alert.alert('Éxito', `Se eliminaron ${eventsToDelete.length} evento(s) del año ${currentYear}.`);
      }

      // Refrescar los eventos del año
      if (refreshYearEvents) {
        await refreshYearEvents();
      }

      setDeleteConfirmModalVisible(false);
    } catch (error) {
      console.error('Error eliminando eventos del año:', error);
      Alert.alert('Error', 'Hubo un problema al eliminar los eventos. Por favor, intenta de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  // DEBUG: Log cuando se cargan los eventos del año (comentado para reducir logs)
  // React.useEffect(() => {
  //   console.log('📅 YEAR VIEW - Events loaded:', {
  //     year: currentYear,
  //     totalEvents: yearEvents.length,
  //     eventsForYear: yearEvents.filter(e => e.year === currentYear).length,
  //     events: yearEvents.filter(e => e.year === currentYear).map(e => ({
  //       id: e.id,
  //       title: e.title,
  //       month: e.month,
  //       startDay: e.startDay,
  //       duration: e.duration,
  //       color: e.color
  //     }))
  //   });
  // }, [yearEvents, currentYear]);

  // Biblioteca completa de 25 colores (igual que en EventModal)
  const COLOR_LIBRARY = [
    '#6b53e2', // Morado
    '#f44336', // Rojo
    '#4caf50', // Verde
    '#ff9800', // Amarillo/Naranja
    '#2196F3', // Azul
    '#9c27b0', // Púrpura
    '#673AB7', // Púrpura oscuro
    '#3F51B5', // Índigo
    '#00BCD4', // Cian/Turquesa
    '#009688', // Verde esmeralda
    '#8BC34A', // Lima
    '#CDDC39', // Amarillo lima
    '#FFEB3B', // Amarillo claro
    '#FFC107', // Ámbar
    '#FF5722', // Naranja oscuro
    '#E91E63', // Rosa
    '#FF4081', // Rosa vibrante
    '#F06292', // Rosa claro
    '#AB47BC', // Púrpura medio
    '#7E57C2', // Púrpura índigo
    '#5C6BC0', // Azul índigo
    '#42A5F5', // Azul claro
    '#26C6DA', // Cian claro
    '#66BB6A', // Verde claro
    '#795548', // Marrón
    '#607D8B', // Azul grisáceo
  ];

  // Estado para mapear cada meta a un color único
  const [goalColorMap, setGoalColorMap] = useState<Map<string, string>>(new Map());

  // Asignar colores aleatorios únicos cuando cambian las metas seleccionadas
  React.useEffect(() => {
    if (selectedGoals.length === 0) {
      setGoalColorMap(new Map());
      return;
    }

    setGoalColorMap(prevMap => {
      // Crear una copia de la biblioteca de colores y mezclarla aleatoriamente
      const shuffledColors = [...COLOR_LIBRARY].sort(() => Math.random() - 0.5);
      const newColorMap = new Map<string, string>();
      
      selectedGoals.forEach((goal, index) => {
        // Si la meta ya tiene un color asignado, mantenerlo
        if (prevMap.has(goal)) {
          newColorMap.set(goal, prevMap.get(goal)!);
        } else {
          // Asignar un color único aleatorio que no esté ya usado
          const usedColors = Array.from(newColorMap.values());
          let availableColor = shuffledColors.find(color => !usedColors.includes(color));
          
          // Si ya se usaron todos los colores, empezar a reutilizar desde el principio
          if (!availableColor) {
            availableColor = shuffledColors[index % shuffledColors.length];
          }
          
          newColorMap.set(goal, availableColor);
        }
      });
      
      return newColorMap;
    });
  }, [selectedGoals]);

  // Función para obtener color de una meta (ahora aleatorio y único)
  const getGoalColor = React.useCallback((goal: string) => {
    return goalColorMap.get(goal) || COLOR_LIBRARY[0]; // Fallback al primer color si no está asignado
  }, [goalColorMap]);

  // Función para obtener el número de días en un año
  const getDaysInYear = (year: number) => {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeapYear ? 366 : 365;
  };

  // Función para convertir día del año a mes y día del mes
  const dayOfYearToMonthDay = (dayOfYear: number, year: number) => {
    const date = new Date(year, 0, 1);
    date.setDate(dayOfYear);
    return {
      month: date.getMonth(),
      day: date.getDate(),
    };
  };

  // Función para convertir mes y día del mes a día del año
  const monthDayToDayOfYear = (month: number, day: number, year: number) => {
    const date = new Date(year, month, day);
    const startOfYear = new Date(year, 0, 1);
    return Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Función para convertir posición X a día del año
  const positionXToDayOfYear = (x: number, width: number, year: number) => {
    const totalDays = getDaysInYear(year);
    const dayPercent = x / width;
    const dayOfYear = Math.floor(dayPercent * totalDays) + 1;
    return Math.max(1, Math.min(totalDays, dayOfYear));
  };

  // Función para convertir día del año a porcentaje de posición
  const dayOfYearToPercent = (dayOfYear: number, year: number) => {
    const totalDays = getDaysInYear(year);
    return ((dayOfYear - 1) / totalDays) * 100;
  };

  // Función para verificar si dos eventos se superponen
  const eventsOverlap = (start1: number, end1: number, start2: number, end2: number) => {
    // Dos eventos se superponen si no cumplen: (end1 < start2) o (end2 < start1)
    return !(end1 < start2 || end2 < start1);
  };

  // Función para asignar tracks (filas) a los eventos basándose en superposiciones
  const assignTracksToGoals = (goals: Array<{ id: string; startDayOfYear: number; endDayOfYear: number }>) => {
    if (goals.length === 0) return new Map<string, number>();

    // Ordenar eventos por fecha de inicio
    const sortedGoals = [...goals].sort((a, b) => a.startDayOfYear - b.startDayOfYear);
    
    // Array de tracks, cada track contiene los eventos que están en esa fila
    const tracks: Array<Array<{ id: string; startDayOfYear: number; endDayOfYear: number }>> = [];
    const trackMap = new Map<string, number>();

    // Para cada evento, encontrar el primer track donde no haya superposición
    sortedGoals.forEach(goal => {
      let assignedTrack = -1;
      
      // Buscar en los tracks existentes
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];
        // Verificar si hay superposición con algún evento en este track
        const hasOverlap = track.some(existingGoal => 
          eventsOverlap(
            goal.startDayOfYear,
            goal.endDayOfYear,
            existingGoal.startDayOfYear,
            existingGoal.endDayOfYear
          )
        );
        
        if (!hasOverlap) {
          assignedTrack = trackIndex;
          break;
        }
      }
      
      // Si no se encontró un track disponible, crear uno nuevo
      if (assignedTrack === -1) {
        assignedTrack = tracks.length;
        tracks.push([]);
      }
      
      // Asignar el evento al track
      tracks[assignedTrack].push(goal);
      trackMap.set(goal.id, assignedTrack);
    });

    return trackMap;
  };

  // Función para crear un PanResponder para una meta draggable
  const createGoalPanResponder = React.useCallback((goal: string, goalIndex: number, initialX: number, initialY: number) => {
    const color = getGoalColor(goal);
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const startX = evt.nativeEvent.pageX;
        const startY = evt.nativeEvent.pageY;
        setDraggingGoal({ goal, color, startX, startY });
        dragAnimatedX.setValue(0);
        dragAnimatedY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        dragAnimatedX.setValue(gestureState.dx);
        dragAnimatedY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt) => {
        const releaseX = evt.nativeEvent.pageX;
        const releaseY = evt.nativeEvent.pageY;
        
        // Verificar si se soltó sobre el calendario de meses
        if (monthsBarLayout) {
          monthsBarRef.current?.measureInWindow((px, py, width, height) => {
            const relativeX = releaseX - px;
            const relativeY = releaseY - py;
            
            // Verificar si está dentro del área del calendario
            if (relativeX >= 0 && relativeX <= width && relativeY >= 0 && relativeY <= height) {
              // Calcular el día del año basado en la posición X
              const dayOfYear = positionXToDayOfYear(relativeX, width, currentYear);
              
              // Crear o actualizar la meta colocada (inicialmente 1 día de duración)
              const newGoalId = `goal-${Date.now()}-${Math.random()}`;
              setPlacedGoals(prev => [...prev, {
                id: newGoalId,
                goal,
                color,
                startDayOfYear: dayOfYear,
                endDayOfYear: dayOfYear, // Inicialmente es un punto (1 día)
              }]);
            }
          });
        }
        
        // Resetear estado
        dragAnimatedX.setValue(0);
        dragAnimatedY.setValue(0);
        setDraggingGoal(null);
      },
      onPanResponderTerminate: () => {
        dragAnimatedX.setValue(0);
        dragAnimatedY.setValue(0);
        setDraggingGoal(null);
      },
    });
  }, [monthsBarLayout, currentYear]);

  // Componente para una línea de meta con handles de redimensionamiento
  // NOTA: React.memo removido temporalmente porque estaba bloqueando re-renders durante el arrastre
  const GoalLine = ({ 
    goalId, 
    color, 
    startPercent, 
    widthPercent, 
    startDayOfYear, 
    endDayOfYear,
    monthsBarLayout,
    setPlacedGoals,
    currentYear,
    track,
    horizontalScrollViewRef
  }: {
    goalId: string;
    color: string;
    startPercent: number;
    widthPercent: number;
    startDayOfYear: number;
    endDayOfYear: number;
    monthsBarLayout: { x: number; y: number; width: number; height: number } | null;
    setPlacedGoals: React.Dispatch<React.SetStateAction<Array<{
      id: string;
      goal: string;
      color: string;
      startDayOfYear: number;
      endDayOfYear: number;
    }>>>;
    currentYear: number;
    track: number;
    horizontalScrollViewRef: React.RefObject<ScrollView | null>;
    sharedScrollXRef: React.MutableRefObject<number>;
  }) => {
    // Animated values para tracking visual fluido durante el arrastre (en píxeles)
    const animatedLeft = useRef(new Animated.Value(0)).current;
    const animatedWidth = useRef(new Animated.Value(0)).current;
    
    // Refs para trackear valores actuales de animación (para evitar acceder a _value)
    const currentAnimatedLeftRef = useRef<number>(0);
    const currentAnimatedWidthRef = useRef<number>(0);
    
    // Refs para valores iniciales y estado de arrastre
    const initialValuesRef = useRef<{ startDayOfYear: number; endDayOfYear: number; startPixel: number; widthPixel: number } | null>(null);
    const isResizingRef = useRef<'left' | 'right' | null>(null);
    
    // Ref para el intervalo de scroll automático
    const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const scrollViewLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
    const initialScrollXRef = useRef<number>(0); // Scroll inicial cuando empieza el gesto
    
    // Calcular posición inicial en píxeles
    const calculatePixels = React.useCallback((startPct: number, widthPct: number) => {
      if (!monthsBarLayout) return { left: 0, width: 0 };
      const left = (startPct / 100) * monthsBarLayout.width;
      const width = (widthPct / 100) * monthsBarLayout.width;
      return { left, width };
    }, [monthsBarLayout]);
    
    // Sincronizar animated values cuando cambian los props (después de release)
    React.useEffect(() => {
      if (!isResizingRef.current && monthsBarLayout) {
        const pixels = calculatePixels(startPercent, widthPercent);
        animatedLeft.setValue(pixels.left);
        animatedWidth.setValue(pixels.width);
        currentAnimatedLeftRef.current = pixels.left;
        currentAnimatedWidthRef.current = pixels.width;
      }
    }, [startPercent, widthPercent, animatedLeft, animatedWidth, monthsBarLayout, calculatePixels]);
    
    // Función para hacer scroll automático cuando el dedo está cerca del borde
    const startAutoScroll = (direction: 'left' | 'right', speed: number) => {
      // Detener cualquier scroll automático existente
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      
      // Usar una función que incrementa el scroll gradualmente desde la posición actual
      const scrollStep = () => {
        if (!horizontalScrollViewRef.current) return;
        
        const scrollDelta = direction === 'left' ? -speed : speed;
        
        // Usar el ref compartido que se actualiza desde onScroll
        sharedScrollXRef.current += scrollDelta;
        // Limitar el scroll a valores no negativos
        sharedScrollXRef.current = Math.max(0, sharedScrollXRef.current);
        
        horizontalScrollViewRef.current.scrollTo({
          x: sharedScrollXRef.current,
          animated: false,
        });
      };
      
      autoScrollIntervalRef.current = setInterval(scrollStep, 16); // ~60fps
    };
    
    const stopAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };
    
    const createResizePanResponder = (isLeftHandle: boolean) => {
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (!monthsBarLayout) return;
          
          // Inicializar layout del ScrollView para scroll automático
          scrollViewLayoutRef.current = { 
            x: monthsBarLayout.x, 
            y: monthsBarLayout.y, 
            width: Dimensions.get('window').width,
            height: monthsBarLayout.height 
          };
          
          // Guardar scroll inicial
          initialScrollXRef.current = sharedScrollXRef.current;
          
          isResizingRef.current = isLeftHandle ? 'left' : 'right';
          const pixels = calculatePixels(startPercent, widthPercent);
          initialValuesRef.current = { 
            startDayOfYear, 
            endDayOfYear,
            startPixel: pixels.left,
            widthPixel: pixels.width
          };
          
          // Resetear animated values a la posición actual
          animatedLeft.setValue(pixels.left);
          animatedWidth.setValue(pixels.width);
          currentAnimatedLeftRef.current = pixels.left;
          currentAnimatedWidthRef.current = pixels.width;
        },
        onPanResponderMove: (evt, gestureState) => {
          if (!monthsBarLayout || !initialValuesRef.current) return;
          
          // Obtener posición del dedo en la pantalla
          const fingerX = evt.nativeEvent.pageX;
          
          // Scroll automático cuando el handle está cerca del borde
          if (scrollViewLayoutRef.current) {
            const EDGE_THRESHOLD = 150; // Distancia desde el borde para activar scroll (px)
            const MAX_SCROLL_SPEED = 15; // Velocidad máxima de scroll (px por frame)
            
            // Calcular posición del dedo relativa al área visible del ScrollView
            const relativeX = fingerX - scrollViewLayoutRef.current.x;
            
            // Calcular distancia desde los bordes del área visible
            const distanceFromLeft = relativeX;
            const distanceFromRight = scrollViewLayoutRef.current.width - relativeX;
            
            // Scroll automático hacia la izquierda
            if (distanceFromLeft < EDGE_THRESHOLD && distanceFromLeft > 0) {
              const speed = Math.max(1, MAX_SCROLL_SPEED * (1 - distanceFromLeft / EDGE_THRESHOLD));
              startAutoScroll('left', speed);
            }
            // Scroll automático hacia la derecha
            else if (distanceFromRight < EDGE_THRESHOLD && distanceFromRight > 0) {
              const speed = Math.max(1, MAX_SCROLL_SPEED * (1 - distanceFromRight / EDGE_THRESHOLD));
              startAutoScroll('right', speed);
            }
            // Detener scroll si el dedo está lejos de los bordes
            else {
              stopAutoScroll();
            }
          }
          
          // Calcular el cambio en píxeles directamente
          // Incluir el scroll acumulado para que el handle siga al dedo cuando hay scroll automático
          // El scroll acumulado es la diferencia entre el scroll actual y el inicial
          const currentScrollAccumulated = sharedScrollXRef.current - initialScrollXRef.current;
          const deltaPixels = gestureState.dx + currentScrollAccumulated;
          
          // Calcular nuevos valores basados en el movimiento
          let newLeft = initialValuesRef.current.startPixel;
          let newWidth = initialValuesRef.current.widthPixel;
          
          if (isLeftHandle) {
            // Mover el inicio y ajustar el ancho
            newLeft = Math.max(0, Math.min(
              initialValuesRef.current.startPixel + initialValuesRef.current.widthPixel - 1,
              initialValuesRef.current.startPixel + deltaPixels
            ));
            newWidth = (initialValuesRef.current.startPixel + initialValuesRef.current.widthPixel) - newLeft;
          } else {
            // Solo ajustar el ancho
            newWidth = Math.max(1, Math.min(
              monthsBarLayout.width - initialValuesRef.current.startPixel,
              initialValuesRef.current.widthPixel + deltaPixels
            ));
          }
          
          // Actualizar visualmente sin re-render (fluido)
          animatedLeft.setValue(newLeft);
          animatedWidth.setValue(newWidth);
          currentAnimatedLeftRef.current = newLeft;
          currentAnimatedWidthRef.current = newWidth;
        },
        onPanResponderRelease: () => {
          // Detener scroll automático
          stopAutoScroll();
          
          // Aplicar cambios finales al estado
          if (initialValuesRef.current && monthsBarLayout) {
            const totalDays = getDaysInYear(currentYear);
            const dayWidth = monthsBarLayout.width / totalDays;
            
            // Convertir posición final en píxeles a días del año
            const finalLeft = currentAnimatedLeftRef.current;
            const finalRight = finalLeft + currentAnimatedWidthRef.current;
            
            const newStartDayOfYear = Math.max(1, Math.min(totalDays, Math.round(finalLeft / dayWidth) + 1));
            const newEndDayOfYear = Math.max(newStartDayOfYear + 1, Math.min(totalDays, Math.round(finalRight / dayWidth) + 1));
            
            setPlacedGoals(prev => {
              const goalIndex = prev.findIndex(g => g.id === goalId);
              if (goalIndex === -1) return prev;
              
              const goal = prev[goalIndex];
              if (goal.startDayOfYear === newStartDayOfYear && goal.endDayOfYear === newEndDayOfYear) {
                return prev;
              }
              
              const newArray = [...prev];
              newArray[goalIndex] = { ...goal, startDayOfYear: newStartDayOfYear, endDayOfYear: newEndDayOfYear };
              return newArray;
            });
          }
          
          isResizingRef.current = null;
          initialValuesRef.current = null;
        },
        onPanResponderTerminate: () => {
          // Detener scroll automático
          stopAutoScroll();
          
          // Resetear a valores originales si se cancela
          if (monthsBarLayout) {
            const pixels = calculatePixels(startPercent, widthPercent);
            animatedLeft.setValue(pixels.left);
            animatedWidth.setValue(pixels.width);
            currentAnimatedLeftRef.current = pixels.left;
            currentAnimatedWidthRef.current = pixels.width;
          }
          isResizingRef.current = null;
          initialValuesRef.current = null;
        },
      });
    };
    
    const leftResizePanResponder = createResizePanResponder(true);
    const rightResizePanResponder = createResizePanResponder(false);
    
    // Altura de cada track (fila)
    const TRACK_HEIGHT = 25;
    // Calcular posición vertical: cada track tiene su propia fila, centrar la línea en el track
    const trackTop = track * TRACK_HEIGHT;
    
    return (
      <Animated.View
        style={[
          styles.yearPlanObjectiveLine,
          {
            backgroundColor: color,
            left: animatedLeft,
            width: animatedWidth,
            top: trackTop + (TRACK_HEIGHT / 2) - 6, // Centrar verticalmente en el track (6 = altura/2)
          }
        ]}
      >
        {/* Handle izquierdo para redimensionar */}
        <View
          {...leftResizePanResponder.panHandlers}
          style={styles.yearPlanObjectiveHandle}
        />
        {/* Handle derecho para redimensionar */}
        <View
          {...rightResizePanResponder.panHandlers}
          style={[styles.yearPlanObjectiveHandle, styles.yearPlanObjectiveHandleRight]}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.yearContainer}>
      {/* Scroll horizontal para la barra de meses */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.yearScrollContent, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}
        nestedScrollEnabled={true}
      >
        <View style={styles.yearView}>
          {/* Scroll vertical para el calendario (barra de meses y líneas) */}
          <ScrollView
            showsVerticalScrollIndicator={true}
            style={styles.calendarScrollContainer}
            contentContainerStyle={styles.calendarScrollContent}
            nestedScrollEnabled={true}
          >
            {/* Contenedor de la barra continua y líneas */}
            <View style={styles.monthsBarContainer}>
            {/* Barra continua de meses */}
            <View style={styles.monthsBarWithTrash}>
              {/* Contenedor para meses y líneas (solo los 12 meses) */}
              <View style={styles.monthsBarWrapper}>
                {/* Barra de meses (solo 12 meses) */}
                <View style={styles.monthsBar}>
                  {[
                    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                  ].map((monthName, monthIndex) => (
                    <TouchableOpacity
                      key={monthIndex}
                      style={styles.monthSegment}
                      onPress={() => {
                        onMonthPress(currentYear, monthIndex);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.monthLabel}>{monthName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Líneas de objetivos debajo de toda la barra (solo sobre los 12 meses) */}
                <View style={styles.objectivesContainer}>
              {yearEvents.map((event, eventIndex) => {
                if (event.year !== currentYear) return null;
                
                // Cada mes ocupa exactamente 1/12 del ancho total de la barra (sin contar el basurero)
                // El basurero es adicional, así que las líneas solo deben cubrir los 12 meses
                const monthWidthPercent = 100 / 12; // ≈ 8.333%
                
                // Posición del inicio del mes en la barra (0 = Enero, 8.333 = Febrero, etc.)
                const monthStartPercent = event.month * monthWidthPercent;
                
                // Días totales en el mes del evento
                const daysInMonth = new Date(currentYear, event.month + 1, 0).getDate();
                
                // Posición relativa dentro del mes (día 1 = 0%, último día = 100% del mes)
                // Convertir días a porcentaje del mes: (startDay - 1) porque día 1 = posición 0
                const relativeStartInMonth = (event.startDay - 1) / daysInMonth;
                const relativeDurationInMonth = event.duration / daysInMonth;
                
                // Posición absoluta desde el inicio de la barra completa
                // mesStartPercent + (posición relativa dentro del mes * ancho del mes)
                const startPercent = monthStartPercent + (relativeStartInMonth * monthWidthPercent);
                let widthPercent = relativeDurationInMonth * monthWidthPercent;
                
                // Asegurar que las líneas no se extiendan más allá de diciembre (100% de los 12 meses)
                // Si la línea se extiende más allá de diciembre, cortarla en el 100%
                const lineEndPercent = startPercent + widthPercent;
                if (lineEndPercent > 100) {
                  widthPercent = 100 - startPercent;
                }
                
                // DEBUG: Log para verificar cálculo de líneas (comentado para reducir logs)
                // console.log('📅 YEAR VIEW - Rendering line:', {
                //   eventId: event.id,
                //   eventTitle: event.title,
                //   month: event.month,
                //   startDay: event.startDay,
                //   duration: event.duration,
                //   daysInMonth,
                //   relativeStartInMonth,
                //   relativeDurationInMonth,
                //   monthStartPercent,
                //   startPercent,
                //   widthPercent
                // });
                
                return (
                  <View
                    key={`${event.id}-${eventIndex}`}
                    style={[
                      styles.objectiveLine,
                      {
                        backgroundColor: event.color,
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                      }
                    ]}
                  />
                );
              })}
                </View>
              </View>
              {/* Basurero separado después de diciembre */}
              <TouchableOpacity
                style={styles.trashSegment}
                onPress={() => {
                  setDeleteConfirmModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={24} color="#dc3545" />
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
      </ScrollView>
      
      {/* Línea divisoria fija */}
      <View style={styles.colorLegendDivider} />
      
      {/* Contenedor de leyenda y botón Planear Año */}
      <View style={[styles.legendAndButtonContainer, { paddingLeft: Math.max(insets.left, 10), paddingRight: Math.max(insets.right, 10) }]}>
        {/* Leyenda de colores con scroll vertical (4 tareas por fila) */}
        <ScrollView
          style={styles.colorLegendScrollContainer}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.colorLegendScrollContent}
        >
          <View style={styles.colorLegendContainer}>
            {(() => {
              // Obtener TODOS los eventos del año (no solo colores únicos)
              const eventsArray = yearEvents
                .filter(event => event.year === currentYear)
                .map(event => ({
                  id: event.id,
                  color: event.color,
                  title: event.title || 'Sin título'
                }));
              
              // DEBUG: Log de leyenda (comentado para reducir logs)
              // console.log('📅 YEAR VIEW - Legend:', {
              //   totalEvents: eventsArray.length,
              //   events: eventsArray
              // });
              
              // Organizar en filas de 4 elementos
              const rows: Array<Array<{ id: string; color: string; title: string }>> = [];
              for (let i = 0; i < eventsArray.length; i += 4) {
                rows.push(eventsArray.slice(i, i + 4));
              }
              
              return rows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.colorLegendRow}>
                  {row.map((event, itemIndex) => (
                    <View 
                      key={`legend-${event.id}-${rowIndex}-${itemIndex}`} 
                      style={styles.colorLegendItem}
                    >
                      <View style={[styles.colorLegendCircle, { backgroundColor: event.color }]} />
                      <Text style={styles.colorLegendText} numberOfLines={1}>{event.title}</Text>
                    </View>
                  ))}
                </View>
              ));
            })()}
          </View>
        </ScrollView>
        
        {/* Botón Planear Año - Fijo a la derecha, independiente del scroll */}
        <TouchableOpacity
          style={styles.yearPlanButtonCompact}
          onPress={() => {
            setYearPlanModalVisible(true);
            setYearPlanPage(1);
            setSelectedGoals([]);
            setPlacedGoals([]);
            setShowAllSuggestions(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.yearPlanButtonTextCompact}>Planear Año</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para Planear Año */}
      <Modal
        visible={yearPlanModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setYearPlanModalVisible(false);
          setYearPlanPage(1);
          setSelectedGoals([]);
          setPlacedGoals([]);
          setShowAllSuggestions(false);
        }}
      >
        <View style={styles.yearPlanModalContainer}>
          {/* Header con indicador de página */}
          <View style={styles.yearPlanModalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (yearPlanPage === 1) {
                  setYearPlanModalVisible(false);
                } else {
                  setYearPlanPage(yearPlanPage - 1);
                }
              }}
              style={styles.yearPlanModalBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.yearPlanModalTitle}>
              {yearPlanPage === 1 ? 'Mis Metas del Año' : 'Asignar Fechas'}
            </Text>
            <Text style={styles.yearPlanModalPageIndicator}>
              {yearPlanPage}/2
            </Text>
          </View>

          {/* Contenido según la página */}
          {yearPlanPage === 1 ? (
            // Página 1: Selección de metas
            <ScrollView style={styles.yearPlanModalContent}>
              <Text style={styles.yearPlanInstructions}>
                Selecciona las metas que quieres alcanzar este año:
              </Text>
              
              {/* Campo para agregar metas personalizadas - PRIMERO */}
              <View style={styles.yearPlanCustomGoalContainer}>
                <TextInput
                  ref={customGoalInputRef}
                  style={styles.yearPlanCustomGoalInput}
                  placeholder="Escribe tu propia meta..."
                  placeholderTextColor="#999"
                  onSubmitEditing={(e) => {
                    const newGoal = e.nativeEvent.text.trim();
                    if (newGoal && !selectedGoals.includes(newGoal)) {
                      setSelectedGoals([...selectedGoals, newGoal]);
                      customGoalInputRef.current?.clear();
                    }
                  }}
                />
              </View>

              {/* Sugerencias de metas - DESPUÉS */}
              <View style={styles.yearPlanSuggestionsContainer}>
                <Text style={styles.yearPlanSuggestionsTitle}>Sugerencias:</Text>
                
                <View style={styles.yearPlanSuggestionsList}>
                  {(showAllSuggestions ? GOAL_SUGGESTIONS : GOAL_SUGGESTIONS.slice(0, 3)).map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.yearPlanGoalChip,
                        selectedGoals.includes(suggestion) && styles.yearPlanGoalChipSelected
                      ]}
                      onPress={() => {
                        if (selectedGoals.includes(suggestion)) {
                          setSelectedGoals(selectedGoals.filter(g => g !== suggestion));
                        } else {
                          setSelectedGoals([...selectedGoals, suggestion]);
                        }
                      }}
                    >
                      <Ionicons
                        name={selectedGoals.includes(suggestion) ? 'checkmark-circle' : 'add-circle-outline'}
                        size={20}
                        color={selectedGoals.includes(suggestion) ? Colors.light.tint : Colors.light.text}
                      />
                      <Text style={[
                        styles.yearPlanGoalChipText,
                        selectedGoals.includes(suggestion) && styles.yearPlanGoalChipTextSelected
                      ]}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Fade y botón "Ver más" si hay más de 3 sugerencias y no están todas mostradas */}
                {!showAllSuggestions && GOAL_SUGGESTIONS.length > 3 && (
                  <View style={styles.yearPlanSuggestionsFadeContainer}>
                    {/* Capas de fade para efecto visual */}
                    <View style={styles.yearPlanSuggestionsFadeLayer1} pointerEvents="none" />
                    <View style={styles.yearPlanSuggestionsFadeLayer2} pointerEvents="none" />
                    <View style={styles.yearPlanSuggestionsFadeLayer3} pointerEvents="none" />
                    <TouchableOpacity
                      style={styles.yearPlanShowMoreButton}
                      onPress={() => setShowAllSuggestions(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-down" size={20} color={Colors.light.tint} />
                      <Text style={styles.yearPlanShowMoreText}>Ver más sugerencias</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Metas seleccionadas */}
              {selectedGoals.length > 0 && (
                <View style={styles.yearPlanSelectedContainer}>
                  <Text style={styles.yearPlanSelectedTitle}>Metas seleccionadas ({selectedGoals.length}):</Text>
                  {selectedGoals.map((goal, index) => (
                    <View key={index} style={styles.yearPlanSelectedGoal}>
                      <Text style={styles.yearPlanSelectedGoalText}>{goal}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedGoals(selectedGoals.filter(g => g !== goal))}
                        style={styles.yearPlanRemoveGoalButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Botón Continuar */}
              <TouchableOpacity
                style={[
                  styles.yearPlanContinueButton,
                  selectedGoals.length === 0 && styles.yearPlanContinueButtonDisabled
                ]}
                onPress={() => {
                  if (selectedGoals.length > 0) {
                    setYearPlanPage(2);
                  }
                }}
                disabled={selectedGoals.length === 0}
              >
                <Text style={[
                  styles.yearPlanContinueButtonText,
                  selectedGoals.length === 0 && styles.yearPlanContinueButtonTextDisabled
                ]}>
                  Continuar
                </Text>
                <Ionicons name="arrow-forward" size={20} color={selectedGoals.length > 0 ? 'white' : '#999'} />
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // Página 2: Asignación de fechas (estructura similar a vista de año)
            <ScrollView style={styles.yearPlanDatesScrollContainer} showsVerticalScrollIndicator={true}>
              <View style={styles.yearPlanDatesContainer}>
                <Text style={styles.yearPlanDatesInstructions}>
                  Arrastra tus metas al calendario y estira las líneas para asignar períodos:
                </Text>
                
                {/* Barra de meses (similar a vista de año) */}
                <ScrollView 
                  ref={horizontalScrollViewRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => {
                    // Trackear posición de scroll actual
                    sharedScrollXRef.current = event.nativeEvent.contentOffset.x;
                  }}
                  scrollEventThrottle={16}
                >
                <View 
                  ref={monthsBarRef}
                  style={styles.yearPlanMonthsBarContainer}
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    monthsBarRef.current?.measureInWindow((px, py, fwidth, fheight) => {
                      setMonthsBarLayout({ x: px, y: py, width: fwidth || width, height: fheight || height });
                    });
                  }}
                >
                  <View style={styles.yearPlanMonthsBar}>
                    {[
                      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                    ].map((monthName, monthIndex) => (
                      <View key={monthIndex} style={styles.yearPlanMonthSegment}>
                        <Text style={styles.yearPlanMonthLabel}>{monthName}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Líneas de metas colocadas */}
                  {(() => {
                    // Calcular tracks para evitar superposiciones (una sola vez)
                    const trackMap = assignTracksToGoals(placedGoals);
                    const trackValues = Array.from(trackMap.values());
                    const maxTrack = trackValues.length > 0 ? Math.max(...trackValues) : -1;
                    const numTracks = maxTrack + 1;
                    // Altura dinámica: 25px por track + padding
                    const containerHeight = Math.max(40, numTracks * 25 + 20);
                    
                    return (
                      <View style={[
                        styles.yearPlanObjectivesContainer,
                        { height: containerHeight }
                      ]}>
                        {placedGoals.map((placedGoal) => {
                          // Calcular porcentajes basados en días del año
                          const startPercent = dayOfYearToPercent(placedGoal.startDayOfYear, currentYear);
                          const endPercent = dayOfYearToPercent(placedGoal.endDayOfYear, currentYear);
                          const widthPercent = endPercent - startPercent;
                          const track = trackMap.get(placedGoal.id) || 0;
                          
                          return (
                            <GoalLine
                              key={placedGoal.id}
                              goalId={placedGoal.id}
                              color={placedGoal.color}
                              startPercent={startPercent}
                              widthPercent={widthPercent}
                              startDayOfYear={placedGoal.startDayOfYear}
                              endDayOfYear={placedGoal.endDayOfYear}
                              monthsBarLayout={monthsBarLayout}
                              setPlacedGoals={setPlacedGoals}
                              currentYear={currentYear}
                              track={track}
                              horizontalScrollViewRef={horizontalScrollViewRef}
                              sharedScrollXRef={sharedScrollXRef}
                            />
                          );
                        })}
                      </View>
                    );
                  })()}
                </View>
              </ScrollView>

              {/* Leyenda de metas (similar a vista de año) - Draggable */}
              <View style={styles.yearPlanLegendDivider} />
              <View style={styles.yearPlanLegendWrapper}>
                <ScrollView style={styles.yearPlanLegendScrollContainer}>
                  <View style={styles.yearPlanLegendContainer}>
                    {selectedGoals.map((goal, index) => {
                      const color = getGoalColor(goal);
                      const isDragging = draggingGoal?.goal === goal;
                      
                      return (
                        <View
                          key={index}
                          style={[
                            styles.yearPlanLegendItem,
                            { width: `${100 / 4}%` }, // 4 items por fila
                            isDragging && styles.yearPlanLegendItemDragging
                          ]}
                        >
                          <View
                            {...createGoalPanResponder(goal, index, 0, 0).panHandlers}
                            style={styles.yearPlanLegendItemTouchable}
                          >
                            <View style={[styles.yearPlanLegendCircle, { backgroundColor: color }]} />
                            <Text style={styles.yearPlanLegendText} numberOfLines={1}>{goal}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Botón Finalizar */}
              <TouchableOpacity
                style={styles.yearPlanFinishButton}
                onPress={async () => {
                  try {
                    // Guardar todas las metas colocadas como eventos del mes
                    const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
                    if (!calendarId) {
                      Alert.alert('Error', 'No hay calendarios disponibles');
                      return;
                    }

                    // Crear eventos para cada meta colocada
                    // Convertir días del año a eventos por mes
                    for (const placedGoal of placedGoals) {
                      const startMonthDay = dayOfYearToMonthDay(placedGoal.startDayOfYear, currentYear);
                      const endMonthDay = dayOfYearToMonthDay(placedGoal.endDayOfYear, currentYear);
                      
                      // Si la meta está en un solo mes
                      if (startMonthDay.month === endMonthDay.month) {
                        const startDay = startMonthDay.day;
                        const endDay = endMonthDay.day;
                        const durationDays = endDay - startDay + 1;
                        
                        const monthEvent: MonthEvent = {
                          id: `${placedGoal.id}-${startMonthDay.month}`,
                          title: placedGoal.goal,
                          description: '',
                          startDay,
                          duration: durationDays,
                          color: placedGoal.color,
                          category: 'General',
                          year: currentYear,
                          month: startMonthDay.month,
                        };

                        const backendData = monthEventFrontendToBackend(monthEvent);
                        const payload = {
                          calendar_id: calendarId,
                          title: placedGoal.goal,
                          description: '',
                          color: placedGoal.color,
                          ...backendData,
                        };

                        await apiPostMonthEvent(payload);
                      } else {
                        // La meta abarca múltiples meses
                        // Crear un evento para cada mes que cubre
                        for (let month = startMonthDay.month; month <= endMonthDay.month; month++) {
                          const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
                          let startDay = 1;
                          let durationDays = daysInMonth;
                          
                          if (month === startMonthDay.month) {
                            // Primer mes - desde el día inicial hasta el final del mes
                            startDay = startMonthDay.day;
                            durationDays = daysInMonth - startDay + 1;
                          } else if (month === endMonthDay.month) {
                            // Último mes - desde día 1 hasta el día final
                            startDay = 1;
                            durationDays = endMonthDay.day;
                          } else {
                            // Meses intermedios - todo el mes
                            startDay = 1;
                            durationDays = daysInMonth;
                          }
                          
                          const monthEvent: MonthEvent = {
                            id: `${placedGoal.id}-${month}`,
                            title: placedGoal.goal,
                            description: '',
                            startDay,
                            duration: durationDays,
                            color: placedGoal.color,
                            category: 'General',
                            year: currentYear,
                            month: month,
                          };

                          const backendData = monthEventFrontendToBackend(monthEvent);
                          const payload = {
                            calendar_id: calendarId,
                            title: placedGoal.goal,
                            description: '',
                            color: placedGoal.color,
                            ...backendData,
                          };

                          await apiPostMonthEvent(payload);
                        }
                      }
                    }

                    // Refrescar los eventos del año
                    if (refreshYearEvents) {
                      await refreshYearEvents();
                    }

                    // Cerrar modal y limpiar estado
                    setYearPlanModalVisible(false);
                    setYearPlanPage(1);
                    setSelectedGoals([]);
                    setPlacedGoals([]);
                    setShowAllSuggestions(false);
                  } catch (error) {
                    console.error('Error guardando metas:', error);
                    Alert.alert('Error', 'Hubo un problema al guardar las metas. Por favor, intenta de nuevo.');
                  }
                  }}
                >
                  <Text style={styles.yearPlanFinishButtonText}>Finalizar Planificación</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
          
          {/* Shadow Preview - Sigue el dedo mientras se arrastra (fuera del ScrollView para posicionamiento absoluto) */}
          {draggingGoal && (
            <Animated.View
              style={[
                styles.dragShadowPreview,
                {
                  left: draggingGoal.startX - 50, // Aproximadamente centrar el preview
                  top: draggingGoal.startY - 20,
                  transform: [
                    {
                      translateX: dragAnimatedX,
                    },
                    {
                      translateY: dragAnimatedY,
                    },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <View style={[styles.dragShadowPreviewCircle, { backgroundColor: draggingGoal.color }]} />
              <Text style={styles.dragShadowPreviewText} numberOfLines={1}>{draggingGoal.goal}</Text>
            </Animated.View>
          )}
        </View>
      </Modal>

      {/* Modal de confirmación para eliminar todos los eventos del año */}
      <Modal
        visible={deleteConfirmModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!isDeleting) {
            setDeleteConfirmModalVisible(false);
          }
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIconContainer}>
              <Ionicons name="warning" size={48} color="#dc3545" />
            </View>
            <Text style={styles.deleteModalTitle}>Eliminar todos los eventos del año</Text>
            <Text style={styles.deleteModalMessage}>
              ¿Estás seguro de que deseas eliminar todos los eventos mensuales del año {currentYear}?
              Esta acción no se puede deshacer.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => {
                  if (!isDeleting) {
                    setDeleteConfirmModalVisible(false);
                  }
                }}
                disabled={isDeleting}
              >
                <Text style={styles.deleteModalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonConfirm, { marginLeft: 12 }]}
                onPress={handleDeleteAllYearEvents}
                disabled={isDeleting}
              >
                <Text style={styles.deleteModalButtonConfirmText}>
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  yearContainer: { flex: 1, backgroundColor: Colors.light.background },
  yearScrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 20, minHeight: 120 },
  yearView: { flex: 1 },
  calendarScrollContainer: {
    flex: 1,
    maxHeight: Dimensions.get('window').height * 0.5, // 50% de la altura de la pantalla para el scroll vertical
  },
  calendarScrollContent: {
    paddingBottom: 20, // Espacio adicional para las líneas que se extienden
  },
  monthsBarContainer: {
    position: 'relative',
    width: '100%',
    minHeight: 200, // Altura mínima aumentada para dar más espacio a las líneas
  },
  monthsBarWithTrash: {
    flexDirection: 'row',
    width: '100%',
    minWidth: 1800,
    alignItems: 'stretch',
  },
  monthsBarWrapper: {
    flex: 1,
    position: 'relative',
  },
  monthsBar: { 
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'visible', // Cambiar a 'visible' para que las líneas se vean
    marginBottom: 0, // Eliminar marginBottom ya que las líneas estarán justo debajo
    width: '100%',
  },
  monthSegment: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 60,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  trashSegment: {
    width: 150,
    marginLeft: 8,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'stretch',
  },
  objectivesContainer: {
    position: 'absolute',
    top: 65, // Justo debajo de la barra (60px de altura aproximada + 5px de padding)
    left: 0,
    height: 40,
    width: '100%',
    zIndex: 2,
    pointerEvents: 'none', // Permitir que los toques pasen a través
    backgroundColor: 'transparent', // Asegurar que el fondo sea transparente
  },
  objectiveLine: {
    position: 'absolute',
    height: 12, // Aumentar altura para mejor visibilidad
    borderRadius: 6,
    top: '50%',
    marginTop: -6, // Ajustar marginTop para centrar
    zIndex: 3,
    minWidth: 2, // Asegurar un ancho mínimo para visibilidad
  },
  colorLegendDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
  },
  legendAndButtonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 1, // Solo 1px para que la línea se vea
    paddingBottom: 10,
  },
  colorLegendScrollContainer: {
    flex: 1,
    marginRight: 10,
    height: 60, // Altura fija para mostrar solo 1 fila (4 tareas)
    maxHeight: 60,
    overflow: 'hidden',
  },
  colorLegendScrollContent: {
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 4,
  },
  colorLegendContainer: {
    flexDirection: 'column',
  },
  colorLegendRow: {
    flexDirection: 'row',
    marginBottom: 4,
    width: '100%',
    flexShrink: 0,
    minHeight: 52, // Altura mínima para una fila
  },
  colorLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: `${100 / 4}%`, // 4 elementos por fila (25% cada uno)
    flexShrink: 0,
  },
  colorLegendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  colorLegendText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  // Estilos para botón Planear Año compacto
  yearPlanButtonCompact: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  yearPlanButtonTextCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  // Estilos para Modal Planear Año
  yearPlanModalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  yearPlanModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  yearPlanModalBackButton: {
    padding: 8,
  },
  yearPlanModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  yearPlanModalPageIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  yearPlanModalContent: {
    flex: 1,
    padding: 20,
  },
  yearPlanInstructions: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
    fontWeight: '600',
  },
  yearPlanSuggestionsContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  yearPlanSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  yearPlanSuggestionsList: {
    position: 'relative',
  },
  yearPlanSuggestionsFadeContainer: {
    position: 'relative',
    marginTop: -40,
    height: 60,
    zIndex: 1,
  },
  yearPlanSuggestionsFadeLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.light.background,
    opacity: 0.6,
  },
  yearPlanSuggestionsFadeLayer2: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.light.background,
    opacity: 0.8,
  },
  yearPlanSuggestionsFadeLayer3: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.light.background,
    opacity: 1,
  },
  yearPlanShowMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 8,
  },
  yearPlanShowMoreText: {
    fontSize: 15,
    color: Colors.light.tint,
    fontWeight: '600',
    marginLeft: 8,
  },
  yearPlanGoalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  yearPlanGoalChipSelected: {
    backgroundColor: Colors.light.tint + '20',
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  yearPlanGoalChipText: {
    fontSize: 15,
    color: Colors.light.text,
    marginLeft: 12,
    flex: 1,
  },
  yearPlanGoalChipTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  yearPlanCustomGoalContainer: {
    marginBottom: 24,
  },
  yearPlanCustomGoalInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  yearPlanSelectedContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  yearPlanSelectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  yearPlanSelectedGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yearPlanSelectedGoalText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  yearPlanRemoveGoalButton: {
    padding: 4,
  },
  yearPlanContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  yearPlanContinueButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  yearPlanContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginRight: 8,
  },
  yearPlanContinueButtonTextDisabled: {
    color: '#999',
  },
  // Estilos para página 2 (Asignación de fechas)
  yearPlanDatesScrollContainer: {
    flex: 1,
  },
  yearPlanDatesContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  yearPlanDatesInstructions: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 16,
    fontWeight: '600',
  },
  yearPlanMonthsBarContainer: {
    position: 'relative',
    width: '100%',
    minWidth: 1800,
    marginBottom: 20,
  },
  yearPlanMonthsBar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 60,
  },
  yearPlanMonthSegment: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 60,
  },
  yearPlanMonthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  yearPlanObjectivesContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    height: 200, // Altura suficiente para múltiples tracks (8 tracks * 25px cada uno)
    width: '100%',
  },
  yearPlanObjectiveLine: {
    position: 'absolute',
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearPlanObjectiveLineCenter: {
    flex: 1,
    height: '100%',
    zIndex: 1,
  },
  yearPlanObjectiveHandle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333',
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  yearPlanObjectiveHandleRight: {
    left: 'auto',
    right: -8,
  },
  yearPlanLegendDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
  },
  yearPlanLegendWrapper: {
    position: 'relative',
    flex: 1,
  },
  yearPlanLegendScrollContainer: {
    maxHeight: 200,
    paddingHorizontal: 10,
  },
  yearPlanLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  yearPlanLegendItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  yearPlanLegendItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearPlanLegendItemDragging: {
    opacity: 0.5,
  },
  yearPlanLegendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  yearPlanLegendText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  dragShadowPreview: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dragShadowPreviewCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  dragShadowPreviewText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  yearPlanFinishButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  yearPlanFinishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  // Estilos para modal de confirmación de eliminación
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalIconContainer: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  deleteModalButtonConfirm: {
    backgroundColor: '#dc3545',
  },
  deleteModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  deleteModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

