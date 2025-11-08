// calendar.tsx - Main calendar component with day/week/month views
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Animated,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

// Importación opcional de expo-screen-orientation (requiere rebuild nativo)
let ScreenOrientation: any = null;
let ScreenOrientationAvailable = false;
let warningShown = false;

try {
  ScreenOrientation = require('expo-screen-orientation');
  // Verificar que el módulo realmente funciona
  if (ScreenOrientation && ScreenOrientation.lockAsync && ScreenOrientation.unlockAsync) {
    ScreenOrientationAvailable = true;
  } else {
    if (!warningShown) {
      console.warn('expo-screen-orientation no está disponible. Necesitas hacer rebuild de la app nativa.');
      warningShown = true;
    }
  }
} catch (e) {
  // Mostrar warning solo una vez
  if (!warningShown) {
    console.warn('expo-screen-orientation no está disponible. Necesitas hacer rebuild de la app nativa.');
    warningShown = true;
  }
  ScreenOrientationAvailable = false;
}
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { API_BASE } from '../../src/config/api';
import authService from '../../services/auth';
import {
  apiPutEventTimes,
  apiPutEvent,
  apiGetCalendars,
  apiPostEvent,
  apiDeleteEvent,
  apiFetchEvents,
  apiFetchMonthEvents,
  apiPostMonthEvent,
  apiPutMonthEvent,
  apiDeleteMonthEvent,
  apiGetSubtasks,
  apiCreateSubtask,
  apiUpdateSubtask,
  apiDeleteSubtask,
  apiUpdateMultipleSubtasks,
  apiGetSubtasksForInstance,
  apiToggleSubtaskInstance,
  apiToggleMultipleSubtaskInstances,
  apiHideSubtaskForInstance,
  apiCreateCustomSubtask,
  apiUpdateCustomSubtask,
  apiDeleteCustomSubtask,
  apiGetPreferences,
  apiRegisterDailyAccess
} from '../../services/calendarApi';
import {
  WEEK_DAY_ITEMS,
  WEEK_DAY_CODES,
  WEEK_DAY_LABEL_BY_CODE,
  WEEK_DAY_SHORT_BY_CODE,
  MONTH_DAY_ITEMS,
  MONTH_WEEKDAY_HEADERS,
  CELL_HEIGHT,
  START_HOUR,
  END_HOUR,
  DEFAULT_TIMEZONE
} from '../../src/utils/dateConstants';
import {
  dateKeyToLocalDate,
  dateKeyToDate,
  formatDateKey,
  formatDisplayMonthYear,
  getWeekDayCode,
  buildMonthMatrix
} from '../../src/utils/dateUtils';
import {
  createDefaultRecurrenceConfig,
  cloneRecurrenceConfig,
  clampRecurrenceInterval,
  getRecurrenceTitle,
  extractRecurrenceFromEvent,
  adjustStartDateToRecurrenceRule,
  generateRecurrentInstances,
  sanitizeRecurrenceDraft,
  RECURRENCE_MODE_LABEL,
  INTERVAL_UNIT_LABEL
} from '../../src/utils/recurrenceUtils';
import {
  toggleItemInArray,
  sortNumericArray
} from '../../src/utils/eventUtils';
import GridBackground from '../../src/components/calendar/GridBackground';
import RecurrenceModal from '../../src/components/calendar/RecurrenceModal';
import EventModal from '../../src/components/calendar/EventModal';
import DeleteModal from '../../src/components/calendar/DeleteModal';
import SubtaskChangesModal from '../../src/components/calendar/SubtaskChangesModal';
import EventResizableBlock from '../../src/components/calendar/EventResizableBlock/EventResizableBlock';
import MonthView from '../../src/components/calendar/MonthView';
import YearView from '../../src/components/calendar/YearView';
import { MonthEvent, fetchMonthEvents as fetchMonthEventsHelper, fetchYearEvents as fetchYearEventsHelper, monthEventFrontendToBackend } from '../../src/components/calendar/monthEventHelpers';
import TutorialOverlay from '../../src/components/tutorial/TutorialOverlay';
import { calendarTutorialSteps } from '../../src/components/tutorial/tutorialSteps';
import tutorialService from '../../src/utils/tutorialService';

const { width } = Dimensions.get('window');









interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: number; // minutos desde las 6 AM
  duration: number; // minutos
  color: string;
  category: string;
  date: string; // 'YYYY-MM-DD' -> fecha absoluta del evento
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

type RecurrenceMode = 'daily' | 'weekly' | 'monthly';

interface RecurrenceConfig {
  enabled: boolean;
  mode: RecurrenceMode;
  interval: number;
  weekDays: string[]; // códigos ISO-8601: 'MO', 'TU'...
  monthDays: number[]; // 1-31
  hasEndDate: boolean;
  endDate: string | null; // YYYY-MM-DD
}

interface RecurrenceRule {
  frequency: string;
  interval: number;
  byWeekDays?: string[];
  byMonthDays?: number[];
}

// Utilidades fecha/UTC mínimas para API


interface EventResizableBlockProps {
  ev: Event;
  onResizeCommit: (event: Event, newStartTime: number, newDuration: number) => void;
  cellWidth: number;
  onQuickPress?: (ev: Event) => void; // <-- NEW
  currentView?: 'day' | 'week' | 'month' | 'year'; // <-- NEW: Para estilos condicionales
}

// EventResizableBlock - MOVIDO A ../../src/components/calendar/EventResizableBlock/EventResizableBlock.tsx

// MonthEvent interface moved to monthEventHelpers.ts

interface SelectedCell {
  dayIndex: number;
  timeIndex: number;
  startTime: number;
}

interface SelectedMonthCell {
  dayIndex: number;
  day: number;
}

interface CalendarViewProps {}

// Componente del Modal de Repetición - MOVIDO A ./components/calendar/RecurrenceModal.tsx

export default function CalendarView({}: CalendarViewProps) {
  const insets = useSafeAreaInsets();

  // ===== ESTADO PRINCIPAL =====
  const [events, setEvents] = useState<Event[]>([]);
  // 🔧 FIX: Ref para leer eventos actuales de forma síncrona (para onMoveCommit)
  const eventsRef = useRef<Event[]>([]);
  
  // Actualizar ref cuando cambien los eventos
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  
  // Debug: Rastrear cambios de events (comentado para limpiar consola)
  // useEffect(() => {
  //   console.log('📅 events CHANGED', { 
  //     newCount: events.length,
  //     timestamp: new Date().toISOString(),
  //     stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
  //   });
  // }, [events]);
  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);
  const [yearEvents, setYearEvents] = useState<MonthEvent[]>([]); // Eventos del año completo
  const [selectedEvent, setSelectedEvent] = useState<Event | MonthEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Estados de YearView movidos a YearView.tsx
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventColor, setEventColor] = useState('#6b53e2');
  
  // ===== ESTADO PARA PREVENIR DOBLE CLIC =====
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedMonthCell, setSelectedMonthCell] = useState<SelectedMonthCell | null>(null);
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estado para fecha/hora personalizada seleccionada desde el picker
  const [customDateKey, setCustomDateKey] = useState<string | null>(null);
  const [customStartTime, setCustomStartTime] = useState<number | null>(null);
  
  // Debug: Rastrear cambios de currentDate (comentado para limpiar consola)
  // useEffect(() => {
  //   console.log('📅 currentDate CHANGED', { 
  //     newDate: currentDate.toISOString().slice(0, 10),
  //     timestamp: new Date().toISOString(),
  //     stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
  //   });
  // }, [currentDate]);
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>(() => createDefaultRecurrenceConfig());
  const [recurrenceModalVisible, setRecurrenceModalVisible] = useState(false);
  const [tempRecurrenceConfig, setTempRecurrenceConfig] = useState<RecurrenceConfig | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recurrenceCalendarMonth, setRecurrenceCalendarMonth] = useState<Date>(new Date());
  
  // Estado para subtareas
  interface SubtaskItem {
    id: string;
    text: string;
    completed: boolean;
    type?: 'master' | 'custom';
    instance_id?: string | null;
    sort_order?: number;
  }
  
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [originalSubtasks, setOriginalSubtasks] = useState<SubtaskItem[]>([]); // Para detectar cambios
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmOption, setAlarmOption] = useState<string>('at_start');
  const [subtaskChangesModalVisible, setSubtaskChangesModalVisible] = useState(false);
  const [eventLongPressHandlers, setEventLongPressHandlers] = useState<{[eventId: string]: () => void}>({});
  const [pendingSubtaskChanges, setPendingSubtaskChanges] = useState<{
    added: SubtaskItem[];
    removed: SubtaskItem[];
    modified: SubtaskItem[];
  } | null>(null);
  
  // Cache de subtareas para evitar llamadas repetidas a la API
  const [subtasksCache, setSubtasksCache] = useState<{[eventId: string]: SubtaskItem[]}>({});
  
  // ===== PREFERENCIAS DE HORAS DEL CALENDARIO =====
  const [userStartHour, setUserStartHour] = useState<number>(START_HOUR);
  const [userEndHour, setUserEndHour] = useState<number>(END_HOUR);
  
  // Función para cargar preferencias del usuario
  const loadUserPreferences = useCallback(async () => {
    try {
      console.log('🔄 Cargando preferencias del usuario...');
      const response = await apiGetPreferences();
      if (response.ok) {
        const result = await response.json();
        console.log('📋 Preferencias recibidas:', result.data);
        if (result.success && result.data) {
          const newStartHour = result.data.start_hour ?? START_HOUR;
          const newEndHour = result.data.end_hour ?? END_HOUR;
          console.log(`✅ Actualizando horas: ${newStartHour}:00 - ${newEndHour === 24 ? '00:00' : newEndHour + ':00'}`);
          setUserStartHour(newStartHour);
          setUserEndHour(newEndHour);
        } else {
          console.warn('⚠️ Preferencias sin datos, usando valores por defecto');
          setUserStartHour(START_HOUR);
          setUserEndHour(END_HOUR);
        }
      } else {
        console.error('❌ Error en respuesta de preferencias:', response.status);
        setUserStartHour(START_HOUR);
        setUserEndHour(END_HOUR);
      }
    } catch (error) {
      console.error('❌ Error loading user preferences:', error);
      // Usar valores por defecto si falla
      setUserStartHour(START_HOUR);
      setUserEndHour(END_HOUR);
    }
  }, []);
  
  // Cargar preferencias del usuario al iniciar
  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);
  
  // Estado para animación de días consecutivos
  const [showConsecutiveDaysModal, setShowConsecutiveDaysModal] = useState(false);
  const [consecutiveDaysCount, setConsecutiveDaysCount] = useState(0);
  const consecutiveDaysScale = useRef(new Animated.Value(1)).current;

  // Recargar preferencias cuando el usuario vuelve a esta pantalla (desde perfil)
  useFocusEffect(
    useCallback(() => {
      loadUserPreferences();
      // Registrar acceso diario cuando se enfoca el calendario
      apiRegisterDailyAccess()
        .then(async (response) => {
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.was_increased) {
              // Mostrar animación de celebración
              setConsecutiveDaysCount(result.data.consecutive_days);
              setShowConsecutiveDaysModal(true);
              
              // Animación de escala
              Animated.sequence([
                Animated.timing(consecutiveDaysScale, {
                  toValue: 1.2,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(consecutiveDaysScale, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]).start();
              
              // Cerrar automáticamente después de 3 segundos
              setTimeout(() => {
                setShowConsecutiveDaysModal(false);
              }, 3000);
            }
          }
        })
        .catch((error) => {
          console.error('Error registrando acceso diario:', error);
        });
    }, [loadUserPreferences])
  );
  
  // ===== ESTADO DEL TUTORIAL =====
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  
  // Ref para evitar múltiples llamadas a handleTutorialNext para el mismo objetivo
  const tutorialObjectiveCompletedRef = useRef<string | null>(null);
  const tutorialNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ===== HELPER: Registrar handlers de long press =====
  const longPressActiveRef = useRef<{[eventId: string]: boolean}>({});
  const stableHandlersRef = useRef<Map<string, () => void>>(new Map());
  
  const registerEventLongPressHandler = useCallback((eventId: string, handler: () => void) => {
    // Solo actualizar si el handler realmente cambió
    const existing = stableHandlersRef.current.get(eventId);
    if (existing === handler) {
      return; // Ya está registrado, no hacer nada
    }
    stableHandlersRef.current.set(eventId, handler);
    
    setEventLongPressHandlers(prev => {
      // Evitar actualizar si el handler no cambió para este eventId
      if (prev[eventId] === handler) {
        return prev;
      }
      return { ...prev, [eventId]: handler };
    });
  }, []);

  // Cache de funciones wrapper estables por eventId
  const wrapperCacheRef = useRef<Map<string, (handler: () => void) => void>>(new Map());

  // Función estable para pasar a EventResizableBlock
  const createLongPressHandler = useCallback((eventId: string) => {
    // Obtener o crear wrapper estable para este eventId
    if (!wrapperCacheRef.current.has(eventId)) {
      const wrapperFn = (handler: () => void) => {
        const existing = stableHandlersRef.current.get(eventId);
        // Solo registrar si el handler realmente cambió
        if (existing !== handler) {
          const wrapped = () => {
            longPressActiveRef.current[eventId] = true;
            
            // Detectar si el tutorial está esperando long-press-event
            if (tutorialVisible && !tutorialCompleted && calendarTutorialSteps && calendarTutorialSteps.length > tutorialStep) {
              const currentStepData = calendarTutorialSteps[tutorialStep] as any;
              if (currentStepData?.objective === 'long-press-event' && tutorialObjectiveCompletedRef.current !== 'long-press-event') {
                console.log('✅ Objetivo cumplido: long-press-event');
                tutorialObjectiveCompletedRef.current = 'long-press-event';
                if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
                tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
              }
            }
            
            handler();
            // Liberar después de un tiempo
            setTimeout(() => {
              longPressActiveRef.current[eventId] = false;
            }, 600);
          };
          registerEventLongPressHandler(eventId, wrapped);
        }
      };
      wrapperCacheRef.current.set(eventId, wrapperFn);
    }
    return wrapperCacheRef.current.get(eventId)!;
  }, [registerEventLongPressHandler, tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext]);

  

  // ===== HELPER: Calcular estado de subtareas del evento =====
  const getSubtaskStatus = useCallback((eventId: string): { hasSubtasks: boolean; allCompleted: boolean } => {
    const eventSubtasks = subtasksCache[eventId];
    const hasSubtasks = eventSubtasks && eventSubtasks.length > 0;
    const allCompleted = hasSubtasks && eventSubtasks.every(subtask => subtask.completed);
    
    return { hasSubtasks, allCompleted };
  }, [subtasksCache]);

  // ===== HANDLERS DE MODALES =====
  const handleOpenRecurrenceModal = useCallback(() => {
  setTempRecurrenceConfig(cloneRecurrenceConfig(recurrenceConfig));
  setRecurrenceCalendarMonth(new Date(currentDate));
    setRecurrenceModalVisible(true);
  }, [recurrenceConfig, currentDate]);

  const handleSaveRecurrenceConfig = useCallback((newConfig: RecurrenceConfig) => {
    setRecurrenceConfig(newConfig);
    setRecurrenceModalVisible(false);
    setTempRecurrenceConfig(null);
    
    // Detectar si debemos avanzar el tutorial (objetivo: save-recurrence)
    if (tutorialVisible && !tutorialCompleted) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      if (currentStepData?.objective === 'save-recurrence') {
        console.log('✅ Objetivo cumplido: save-recurrence');
        setTimeout(() => handleTutorialNext(), 500);
      }
    }
  }, [tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext]);

  const handleCloseModal = useCallback(() => {
    // Detectar si debemos avanzar el tutorial cuando se cierra el modal después de completar subtareas
    if (tutorialVisible && !tutorialCompleted) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      if (currentStepData?.objective === 'complete-subtasks') {
        // Verificar que todas las subtareas estén completadas
        if (subtasks.length > 0 && subtasks.every(st => st.completed)) {
          console.log('✅ Objetivo cumplido: complete-subtasks (modal cerrado con subtareas completadas)');
          setTimeout(() => handleTutorialNext(), 500);
        }
      }
    }
    setModalVisible(false);
    setSelectedEvent(null);
    setSelectedCell(null);
    setSelectedMonthCell(null);
    setRecurrenceConfig(createDefaultRecurrenceConfig());
    // Limpiar subtareas al cerrar modal
    setSubtasks([]);
    setOriginalSubtasks([]);
    setNewSubtaskText('');
    setShowSubtaskInput(false);
    // Limpiar fecha personalizada
    setCustomDateKey(null);
    setCustomStartTime(null);
    setPendingSubtaskChanges(null);
    setSubtaskChangesModalVisible(false);
  }, [tutorialVisible, tutorialCompleted, tutorialStep, subtasks, handleTutorialNext, calendarTutorialSteps]);

  // ===== GESTIÓN DE SUBTAREAS =====
  const loadSubtasks = useCallback(async (eventId: string, event?: Event | MonthEvent | null, forceReload: boolean = false) => {
    // console.log('🔍 loadSubtasks - START', {
    //   eventId,
    //   hasEvent: !!event,
    //   forceReload,
    //   cacheHasEvent: !!subtasksCache[eventId]
    // });
    
    // Verificar si ya tenemos las subtareas en caché (solo si no es force reload)
    if (!forceReload && subtasksCache[eventId]) {
      const cached = subtasksCache[eventId];
      // console.log('📦 loadSubtasks - Using CACHE', { count: cached.length });
      setSubtasks(cached);
      setOriginalSubtasks(JSON.parse(JSON.stringify(cached))); // Deep copy
      return;
    }
    
    try {
      // Determinar si el evento es una instancia de serie recurrente
      const eventData = event || selectedEvent;
      const isRecurringInstance = eventData && 'series_id' in eventData && eventData.series_id !== null && eventData.series_id !== undefined;
      
      console.log('🔍 loadSubtasks - Event analysis', {
        eventId,
        title: eventData?.title,
        isRecurringInstance,
        series_id: eventData && 'series_id' in eventData ? eventData.series_id : null,
        is_recurring: eventData && 'is_recurring' in eventData ? eventData.is_recurring : null,
        hasEvent: !!event,
        hasSelectedEvent: !!selectedEvent
      });
      
      let response;
      let loadedSubtasks: SubtaskItem[] = [];
      
      if (isRecurringInstance) {
        // Usar endpoint de instancias para eventos recurrentes
        // console.log('🔄 loadSubtasks - Calling apiGetSubtasksForInstance', { eventId });
        response = await apiGetSubtasksForInstance(eventId);
        
        // console.log('📥 loadSubtasks - Response from apiGetSubtasksForInstance', {
        //   ok: response.ok,
        //   status: response.status
        // });
        
        if (response.ok) {
          const result = await response.json();
          // console.log('📋 loadSubtasks - Result from instance endpoint', {
          //   success: result.success,
          //   subtasksCount: result.data?.subtasks?.length || 0,
          //   masterEventId: result.data?.master_event_id,
          //   isRecurringInstance: result.data?.is_recurring_instance
          // });
          
          // El endpoint devuelve subtareas con type, instance_id, etc.
          loadedSubtasks = result.data.subtasks.map((subtask: any) => ({
            id: subtask.id.toString(),
            text: subtask.text,
            completed: subtask.completed || false,
            type: subtask.type || 'master',
            instance_id: subtask.instance_id ? subtask.instance_id.toString() : null,
            sort_order: subtask.sort_order || 0
          }));
          
          // console.log('✅ loadSubtasks - Loaded subtasks from instance', {
          //   count: loadedSubtasks.length,
          //   subtasks: loadedSubtasks.map(st => ({ id: st.id, text: st.text, type: st.type, completed: st.completed }))
          // });
        } else {
          const errorText = await response.text();
          // Error loading subtasks from instance endpoint
        }
      } else {
        // Usar endpoint normal para eventos únicos o maestros
        // console.log('📝 loadSubtasks - Calling apiGetSubtasks (normal endpoint)', { eventId });
        response = await apiGetSubtasks(eventId);
        
        // console.log('📥 loadSubtasks - Response from apiGetSubtasks', {
        //   ok: response.ok,
        //   status: response.status
        // });
        
        if (response.ok) {
          const result = await response.json();
          // console.log('📋 loadSubtasks - Result from normal endpoint', {
          //   success: result.success,
          //   subtasksCount: result.data?.length || 0
          // });
          
          loadedSubtasks = result.data.map((subtask: any) => ({
            id: subtask.id.toString(),
            text: subtask.text,
            completed: subtask.completed || false,
            type: 'master',
            sort_order: subtask.sort_order || 0
          }));
          
          // console.log('✅ loadSubtasks - Loaded subtasks from normal endpoint', {
          //   count: loadedSubtasks.length,
          //   subtasks: loadedSubtasks.map(st => ({ id: st.id, text: st.text, completed: st.completed }))
          // });
        } else {
          const errorText = await response.text();
          // Error loading subtasks from normal endpoint
        }
      }
      
      // Guardar en caché y mostrar
      // console.log('💾 loadSubtasks - Saving to cache and state', {
      //   eventId,
      //   count: loadedSubtasks.length
      // });
      
      setSubtasksCache(prev => ({
        ...prev,
        [eventId]: loadedSubtasks
      }));
      setSubtasks(loadedSubtasks);
      setOriginalSubtasks(JSON.parse(JSON.stringify(loadedSubtasks))); // Deep copy para comparar cambios
      
      // console.log('✅ loadSubtasks - COMPLETE', {
      //   eventId,
      //   loadedCount: loadedSubtasks.length
      // });
      
    } catch (error) {
      // Exception loading subtasks
      setSubtasks([]);
      setOriginalSubtasks([]);
    }
  }, [subtasksCache, selectedEvent]);

  // Función para migrar subtareas de un evento a otro
  const migrateSubtasks = useCallback(async (oldEventId: string, newEventId: string, oldEvent?: Event | null, newEvent?: Event | null) => {
    try {
      console.log('🔧 migrateSubtasks - START', {
        oldEventId,
        newEventId,
        oldEventTitle: oldEvent?.title,
        oldEventSeriesId: oldEvent?.series_id
      });
      
      // DETECTAR: ¿El evento viejo es un MAESTRO de serie?
      const isOldEventMaster = oldEvent && oldEvent.is_recurring && !oldEvent.series_id;
      
      // DETECTAR: ¿El evento viejo es un evento ÚNICO?
      const isOldEventUnique = oldEvent && !oldEvent.is_recurring && !oldEvent.series_id;
      
      // DETECTAR: ¿El evento viejo es una INSTANCIA de serie (override)?
      // Una instancia tiene series_id o original_start_utc
      const isOldEventInstance = oldEvent && (oldEvent.series_id || oldEvent.original_start_utc);
      
      // DETECTAR: ¿El nuevo evento es un override (tiene series_id)?
      // Necesitamos verificar el evento nuevo para saber si es override
      // Por ahora asumimos que si oldEvent tiene series_id, el nuevo también lo tendrá
      const isNewEventOverride = isOldEventInstance;
      
      let oldSubtasks: any[] = [];
      
      // 1. Obtener subtareas del evento viejo
      // Si es instancia, usar apiGetSubtasksForInstance para obtener estados de instancia
      if (isOldEventInstance) {
        console.log('🔧 migrateSubtasks - Obteniendo subtareas de instancia', { oldEventId });
        const instanceResponse = await apiGetSubtasksForInstance(oldEventId);
        if (instanceResponse.ok) {
          const instanceResult = await instanceResponse.json();
          oldSubtasks = instanceResult.data?.subtasks || [];
          console.log('🔧 migrateSubtasks - Subtareas de instancia obtenidas', {
            count: oldSubtasks.length,
            completed: oldSubtasks.filter(st => st.completed).length
          });
        }
      } else {
        // Para eventos únicos o maestros, usar endpoint normal
        const response = await apiGetSubtasks(oldEventId);
        if (response.ok) {
          const result = await response.json();
          oldSubtasks = result.data || [];
          console.log('🔧 migrateSubtasks - Subtareas normales obtenidas', {
            count: oldSubtasks.length,
            completed: oldSubtasks.filter(st => st.completed).length
          });
        }
      }
      
      if (oldSubtasks.length === 0) {
        console.log('🔧 migrateSubtasks - No hay subtareas para migrar');
        return;
      }
      
      // 2. Si el nuevo evento es un override, las subtareas ya existen en el master
      // Solo necesitamos crear las instancias de subtareas con sus estados
      if (isNewEventOverride && oldEvent?.series_id) {
        console.log('🔧 migrateSubtasks - Nuevo evento es override, creando instancias de subtareas');
        for (const oldSubtask of oldSubtasks) {
          if (oldSubtask.completed && oldSubtask.id) {
            try {
              // Crear instancia de subtarea con estado completado
              const toggleResponse = await apiToggleSubtaskInstance(
                oldSubtask.id.toString(),
                newEventId,
                true
              );
              if (toggleResponse.ok) {
                console.log('🔧 migrateSubtasks - Instancia de subtarea creada como completada', {
                  subtaskId: oldSubtask.id,
                  newEventId
                });
              } else {
                console.log('⚠️ migrateSubtasks - Error creando instancia de subtarea', {
                  subtaskId: oldSubtask.id,
                  status: toggleResponse.status
                });
              }
            } catch (error) {
              console.log('⚠️ migrateSubtasks - Excepción creando instancia de subtarea', error);
            }
          }
        }
      } else {
        // 3. Para eventos únicos, crear las subtareas en el nuevo evento
        console.log('🔧 migrateSubtasks - Creando subtareas en nuevo evento único');
        for (let i = 0; i < oldSubtasks.length; i++) {
          const oldSubtask = oldSubtasks[i];
          const createResponse = await apiCreateSubtask(
            newEventId, 
            oldSubtask.text, 
            i
          );
          
          if (createResponse.ok) {
            const createdResult = await createResponse.json();
            const newSubtaskId = createdResult.data?.id;
            
            // CRÍTICO: Si la subtarea original estaba completada, copiar ese estado
            if (oldSubtask.completed && newSubtaskId) {
              const updateResponse = await apiUpdateSubtask(newSubtaskId.toString(), {
                completed: true
              });
              
              if (updateResponse.ok) {
                console.log('🔧 migrateSubtasks - Estado completado copiado', {
                  subtaskId: newSubtaskId
                });
              } else {
                console.log('⚠️ migrateSubtasks - Error copiando estado completado', {
                  subtaskId: newSubtaskId
                });
              }
            }
          }
        }
        
        // 4. CRÍTICO: Solo borrar subtareas del viejo si es un evento ÚNICO
        // NO borrar si es maestro (otras instancias las usan) NI si es instancia (pertenecen al master)
        if (isOldEventUnique) {
          console.log('🔧 migrateSubtasks - Borrando subtareas del evento viejo (único)');
          for (const oldSubtask of oldSubtasks) {
            try {
              await apiDeleteSubtask(oldSubtask.id.toString());
            } catch (deleteError) {
              console.log('⚠️ migrateSubtasks - Error borrando subtarea vieja', deleteError);
            }
          }
        }
      }
      
      // 5. Recargar subtareas del nuevo evento
      // 🔧 FIX: Usar el evento nuevo si está disponible, o leerlo desde eventsRef
      let eventForLoadSubtasks = newEvent;
      if (!eventForLoadSubtasks) {
        eventForLoadSubtasks = eventsRef.current.find(e => e.id === newEventId);
      }
      
      console.log('🔧 migrateSubtasks - Recargando subtareas del nuevo evento', {
        newEventId,
        hasNewEvent: !!newEvent,
        hasEventFromRef: !!eventForLoadSubtasks,
        hasSeriesId: !!eventForLoadSubtasks?.series_id
      });
      
      // Pasar el evento para que loadSubtasks detecte correctamente como instancia
      await loadSubtasks(newEventId, eventForLoadSubtasks || undefined, true);
      console.log('✅ migrateSubtasks - COMPLETE');
    } catch (error) {
      console.log('❌ migrateSubtasks - ERROR', error);
    }
  }, [loadSubtasks]);

  // Funciones para manejar subtareas
  const handleAddSubtask = useCallback(async () => {
    if (newSubtaskText.trim()) {
      const tempId = `temp-${Date.now()}`;
      const newSubtask: SubtaskItem = {
        id: tempId,
        text: newSubtaskText.trim(),
        completed: false,
        type: 'master',
        sort_order: subtasks.length
      };
      
      // Optimistic update - mostrar inmediatamente
      setSubtasks(prev => [...prev, newSubtask]);
      setNewSubtaskText('');
      setShowSubtaskInput(false);
      
      // IMPORTANTE: Detectar si es instancia recurrente
      const isRecurringInstance = selectedEvent && 
        'series_id' in selectedEvent && 
        selectedEvent.series_id !== null;
      
      // Si estamos editando un evento existente Y NO es instancia recurrente
      // → crear la subtarea inmediatamente
      // Si ES instancia recurrente → dejar como temporal, el modal se mostrará al guardar
      if (selectedEvent && !isRecurringInstance) {
        try {
          const response = await apiCreateSubtask(
            selectedEvent.id, 
            newSubtaskText.trim(), 
            subtasks.length
          );
          
          if (response.ok) {
            const result = await response.json();
            // Reemplazar la subtarea temporal con la real
            const realSubtask: SubtaskItem = {
              id: result.data.id.toString(),
              text: result.data.text,
              completed: result.data.completed || false,
              type: 'master',
              sort_order: result.data.sort_order || subtasks.length
            };
            
            const updatedSubtasks = [...subtasks.filter(st => st.id !== tempId), realSubtask];
            setSubtasks(updatedSubtasks);
            
            // Invalidar caché para forzar recarga
            setSubtasksCache(prev => {
              const newCache = { ...prev };
              delete newCache[selectedEvent.id];
              return newCache;
            });
            
            // Actualizar originalSubtasks también
            setOriginalSubtasks(JSON.parse(JSON.stringify(updatedSubtasks)));
          } else {
            // Si falla, remover la subtarea temporal
            setSubtasks(prev => prev.filter(subtask => subtask.id !== tempId));
          }
        } catch (error) {
          // Si falla, remover la subtarea temporal
          setSubtasks(prev => prev.filter(subtask => subtask.id !== tempId));
        }
      } else if (isRecurringInstance) {
        // No hacer nada, quedará como temporal y el modal se mostrará al guardar
      }
    }
  }, [newSubtaskText, selectedEvent, subtasks]);

  const handleToggleSubtask = useCallback(async (id: string) => {
    try {
      console.log('🔄 handleToggleSubtask - START', { subtaskId: id });
      
      const subtask = subtasks.find(s => s.id === id);
      if (!subtask) {
        console.warn('⚠️  handleToggleSubtask - No subtask found', {
          subtaskId: id
        });
        return;
      }
      
      const newCompletedState = !subtask.completed;
      
      // Si es una subtarea temporal (antes de crear el evento), solo actualizar localmente
      const isTemporarySubtask = id.startsWith('temp-');
      
      // Si es temporal, permitir toggle local incluso sin selectedEvent
      if (isTemporarySubtask) {
        console.log('🔄 handleToggleSubtask - Toggling temporary subtask (local only)', {
          subtaskId: id,
          text: subtask.text,
          currentState: subtask.completed,
          newState: newCompletedState
        });
        
        // Optimistic update - actualizar UI inmediatamente
        const updatedSubtasks = subtasks.map(st => 
          st.id === id 
            ? { ...st, completed: newCompletedState }
            : st
        );
        setSubtasks(updatedSubtasks);
        
        // Si hay selectedEvent, actualizar caché también
        if (selectedEvent) {
          setSubtasksCache(prev => ({
            ...prev,
            [selectedEvent.id]: updatedSubtasks
          }));
        }
        
        console.log('✅ handleToggleSubtask - Temporary subtask toggle complete (local only)');
        return;
      }
      
      // Para subtareas no temporales, necesitamos selectedEvent
      if (!selectedEvent) {
        console.warn('⚠️  handleToggleSubtask - No event selected for non-temporary subtask', {
          subtaskId: id
        });
        return;
      }
      
      console.log('🔄 handleToggleSubtask - Toggling', {
        subtaskId: id,
        text: subtask.text,
        currentState: subtask.completed,
        newState: newCompletedState,
        type: subtask.type,
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title
      });
      
      // Optimistic update - actualizar UI inmediatamente
      const updatedSubtasks = subtasks.map(st => 
        st.id === id 
          ? { ...st, completed: newCompletedState }
          : st
      );
      setSubtasks(updatedSubtasks);
      
      // Actualizar caché
      setSubtasksCache(prev => ({
        ...prev,
        [selectedEvent.id]: updatedSubtasks
      }));
      
      console.log('✅ handleToggleSubtask - Optimistic update complete');
      
      // Solo actualizar en el servidor si no es una subtarea temporal
      if (!isTemporarySubtask) {
        // Determinar si es instancia de serie recurrente
        const isRecurringInstance = 'series_id' in selectedEvent && selectedEvent.series_id !== null && selectedEvent.series_id !== undefined;
        
        console.log('🌐 handleToggleSubtask - Syncing to server', {
          isRecurringInstance,
          subtaskType: subtask.type,
          seriesId: 'series_id' in selectedEvent ? selectedEvent.series_id : null
        });
        
        if (isRecurringInstance && subtask.type === 'master') {
          // Para subtareas heredadas en instancias, usar subtask instances
          console.log('🔄 handleToggleSubtask - Calling apiToggleSubtaskInstance');
          const response = await apiToggleSubtaskInstance(
            id,
            selectedEvent.id,
            newCompletedState
          );
          
          console.log('📥 handleToggleSubtask - Response from apiToggleSubtaskInstance', {
            ok: response.ok,
            status: response.status
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ handleToggleSubtask - Failed, reverting', {
              error: errorText
            });
            // Revertir si falla
            setSubtasks(prev => 
              prev.map(st => 
                st.id === id 
                  ? { ...st, completed: subtask.completed }
                  : st
              )
            );
          } else {
            console.log('✅ handleToggleSubtask - Instance toggle SUCCESS');
          }
        } else if (subtask.type === 'custom') {
          // Para subtareas custom, usar el endpoint de custom subtasks
          console.log('🔄 handleToggleSubtask - Calling apiUpdateCustomSubtask');
          const response = await apiUpdateCustomSubtask(id, {
            completed: newCompletedState
          });
          
          console.log('📥 handleToggleSubtask - Response from apiUpdateCustomSubtask', {
            ok: response.ok,
            status: response.status
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ handleToggleSubtask - Failed, reverting', {
              error: errorText
            });
            // Revertir si falla
            setSubtasks(prev => 
              prev.map(st => 
                st.id === id 
                  ? { ...st, completed: subtask.completed }
                  : st
              )
            );
          } else {
            console.log('✅ handleToggleSubtask - Custom toggle SUCCESS');
          }
        } else {
          // Para eventos únicos o maestros, usar el endpoint normal
          console.log('🔄 handleToggleSubtask - Calling apiUpdateSubtask (normal)');
          const response = await apiUpdateSubtask(id, {
            completed: newCompletedState
          });
          
          console.log('📥 handleToggleSubtask - Response from apiUpdateSubtask', {
            ok: response.ok,
            status: response.status
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ handleToggleSubtask - Failed, reverting', {
              error: errorText
            });
            // Revertir si falla
            setSubtasks(prev => 
              prev.map(st => 
                st.id === id 
                  ? { ...st, completed: subtask.completed }
                  : st
              )
            );
          } else {
            console.log('✅ handleToggleSubtask - Normal toggle SUCCESS');
          }
        }
      } else {
        console.log('ℹ️  handleToggleSubtask - Temporary subtask, no server sync');
      }
      
      console.log('✅ handleToggleSubtask - COMPLETE');
    } catch (error) {
      console.error('❌ handleToggleSubtask - EXCEPTION', {
        subtaskId: id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, [subtasks, selectedEvent]);

  const handleDeleteSubtask = useCallback(async (id: string) => {
    // Optimistic update - remover inmediatamente
    const originalSubtasks = subtasks;
    const updatedSubtasks = subtasks.filter(subtask => subtask.id !== id);
    setSubtasks(updatedSubtasks);
    
    // Actualizar caché si estamos editando un evento existente
    if (selectedEvent) {
      setSubtasksCache(prev => ({
        ...prev,
        [selectedEvent.id]: updatedSubtasks
      }));
    }
    
    // CRÍTICO: Para instancias recurrentes, NO eliminar del servidor inmediatamente
    // Esperar a que el usuario elija "Solo este día" o "Toda la serie" en el modal
    const isRecurringInstance = selectedEvent && ('series_id' in selectedEvent && selectedEvent.series_id);
    
    // Solo eliminar del servidor si:
    // 1. NO es una subtarea temporal
    // 2. NO es una instancia recurrente (si lo es, el modal manejará la eliminación)
    if (!id.startsWith('temp-') && !isRecurringInstance) {
      try {
        const response = await apiDeleteSubtask(id);
        
        if (!response.ok) {
          // Si falla, restaurar la subtarea
          setSubtasks(originalSubtasks);
        }
      } catch (error) {
        // Si falla, restaurar la subtarea
        setSubtasks(originalSubtasks);
        console.error('Error al eliminar subtarea:', error);
      }
    }
    // Para subtareas temporales o instancias recurrentes, la eliminación es solo local
    // El modal manejará la eliminación en el servidor para instancias recurrentes
  }, [subtasks, selectedEvent]);

  const handleEditSubtask = useCallback(async (id: string, newText: string) => {
    // Optimistic update - actualizar inmediatamente
    const updatedSubtasks = subtasks.map(subtask => 
      subtask.id === id 
        ? { ...subtask, text: newText }
        : subtask
    );
    setSubtasks(updatedSubtasks);
    
    // Actualizar caché si estamos editando un evento existente
    if (selectedEvent) {
      setSubtasksCache(prev => ({
        ...prev,
        [selectedEvent.id]: updatedSubtasks
      }));
    }
    
    // Solo actualizar en el servidor si no es una subtarea temporal
    if (!id.startsWith('temp-')) {
      try {
        const response = await apiUpdateSubtask(id, {
          text: newText
        });
        
        if (!response.ok) {
          // Si falla, revertir el cambio (necesitaríamos el texto original)
          console.error('Error al actualizar subtarea en servidor');
        }
      } catch (error) {
        console.error('Error al editar subtarea:', error);
      }
    }
    // Para subtareas temporales, el cambio se mantiene localmente
    // y se sincronizará cuando se guarde el evento
  }, []);

  // Detectar cambios estructurales en subtareas (ignorando toggles de completed)
  const detectSubtaskStructuralChanges = useCallback(() => {
    const added: SubtaskItem[] = [];
    const removed: SubtaskItem[] = [];
    const modified: SubtaskItem[] = [];

    // Filtrar subtareas temporales (se consideran "added")
    const currentNonTemp = subtasks.filter(st => !st.id.startsWith('temp-'));
    const currentTemp = subtasks.filter(st => st.id.startsWith('temp-'));
    
    added.push(...currentTemp);

    // Comparar con originales
    const originalMap = new Map(originalSubtasks.map(st => [st.id, st]));
    const currentMap = new Map(currentNonTemp.map(st => [st.id, st]));

    // Detectar eliminadas
    for (const [id, original] of originalMap) {
      if (!currentMap.has(id)) {
        removed.push(original);
      }
    }

    // Detectar agregadas (no temporales)
    for (const [id, current] of currentMap) {
      if (!originalMap.has(id)) {
        added.push(current);
      }
    }

    // Detectar modificadas (texto o sort_order)
    for (const [id, current] of currentMap) {
      const original = originalMap.get(id);
      if (original) {
        const textChanged = current.text !== original.text;
        const orderChanged = (current.sort_order || 0) !== (original.sort_order || 0);
        
        if (textChanged || orderChanged) {
          modified.push(current);
        }
      }
    }

    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0;

    return {
      hasChanges,
      changes: { added, removed, modified }
    };
  }, [subtasks, originalSubtasks]);

  // Handler: Aplicar cambios de subtareas solo a este día (liberar evento)
  const handleApplySubtaskChangesToThisDay = useCallback(async () => {
    if (!selectedEvent || !pendingSubtaskChanges) return;
    
    try {
      console.log('🔧 handleApplySubtaskChangesToThisDay - START', {
        selectedEventId: selectedEvent.id,
        changes: pendingSubtaskChanges
      });
      
      setSubtaskChangesModalVisible(false);
      
      // 1. Crear custom_subtasks para las subtareas NUEVAS (added)
      for (const addedSubtask of pendingSubtaskChanges.added) {
        console.log('🔧 Creating custom subtask for this day only', {
          text: addedSubtask.text,
          eventInstanceId: selectedEvent.id
        });
        
        try {
          const response = await apiCreateCustomSubtask(
            selectedEvent.id, // Usar el ID original (puede ser virtual como "684_2025-10-22")
            addedSubtask.text,
            undefined,
            addedSubtask.sort_order || 0
          );
          
          if (response.ok) {
            console.log('✅ Custom subtask created successfully');
          } else {
            const errorData = await response.json();
            console.error('❌ Failed to create custom subtask', { error: errorData });
          }
        } catch (error) {
          console.error('❌ Exception creating custom subtask', { error });
        }
      }
      
      // 2. Ocultar subtareas del master ELIMINADAS (removed) solo para esta instancia
      for (const removedSubtask of pendingSubtaskChanges.removed) {
        // Solo ocultar si es una subtarea master, no custom
        if (removedSubtask.type === 'master') {
          console.log('🔧 Hiding master subtask for this day only', {
            subtaskId: removedSubtask.id,
            text: removedSubtask.text,
            eventInstanceId: selectedEvent.id
          });
          
          try {
            const response = await apiHideSubtaskForInstance(
              removedSubtask.id,
              selectedEvent.id
            );
            
            if (response.ok) {
              console.log('✅ Master subtask hidden successfully');
            } else {
              const errorData = await response.json();
              console.error('❌ Failed to hide master subtask', { error: errorData });
            }
          } catch (error) {
            console.error('❌ Exception hiding master subtask', { error });
          }
        } else if (removedSubtask.type === 'custom') {
          // Si es custom, eliminarla directamente
          console.log('🔧 Deleting custom subtask', {
            customSubtaskId: removedSubtask.id,
            text: removedSubtask.text
          });
          
          try {
            const response = await apiDeleteCustomSubtask(removedSubtask.id);
            
            if (response.ok) {
              console.log('✅ Custom subtask deleted successfully');
            } else {
              const errorData = await response.json();
              console.error('❌ Failed to delete custom subtask', { error: errorData });
            }
          } catch (error) {
            console.error('❌ Exception deleting custom subtask', { error });
          }
        }
      }
      
      console.log('✅ handleApplySubtaskChangesToThisDay - COMPLETE', {
        createdCustomSubtasks: pendingSubtaskChanges.added.length,
        hiddenMasterSubtasks: pendingSubtaskChanges.removed.filter(s => s.type === 'master').length,
        deletedCustomSubtasks: pendingSubtaskChanges.removed.filter(s => s.type === 'custom').length
      });
      
      // 3. Limpiar estado
      setPendingSubtaskChanges(null);
      await refreshEvents();
      setModalVisible(false);
      handleCloseModal();
      
      console.log('✅ SubtaskChangesModal - Se ejecutó correctamente "Solo este día"');
      refreshSubtasksColorsWithDelay(); // Recargar colores de subtareas automáticamente con delay de 3 segundos
      
    } catch (error) {
      console.error('❌ Error al liberar evento:', error);
      Alert.alert('Error', 'No se pudieron aplicar los cambios solo a este día');
    }
  }, [selectedEvent, pendingSubtaskChanges]);

  // Handler: Aplicar cambios de subtareas a toda la serie
  const handleApplySubtaskChangesToSeries = useCallback(async () => {
    if (!selectedEvent || !pendingSubtaskChanges) return;
    
    try {
      setSubtaskChangesModalVisible(false);
      
      // Obtener el ID del evento maestro
      const masterEventId = ('series_id' in selectedEvent && selectedEvent.series_id) 
        ? String(selectedEvent.series_id)
        : selectedEvent.id;
      
      // 1. Aplicar agregadas
      for (const added of pendingSubtaskChanges.added) {
        await apiCreateSubtask(masterEventId, added.text, added.sort_order || 0);
      }
      
      // 2. Aplicar eliminadas (soft delete)
      for (const removed of pendingSubtaskChanges.removed) {
        await apiDeleteSubtask(removed.id);
      }
      
      // 3. Aplicar modificadas
      for (const modified of pendingSubtaskChanges.modified) {
        await apiUpdateSubtask(modified.id, {
          text: modified.text,
          sort_order: modified.sort_order
        });
      }
      
      // 4. Limpiar y refrescar
      setPendingSubtaskChanges(null);
      await refreshEvents();
      setModalVisible(false);
      handleCloseModal();
      
      console.log('✅ SubtaskChangesModal - Se ejecutó correctamente "Toda la serie"');
      refreshSubtasksColorsWithDelay(); // Recargar colores de subtareas automáticamente con delay de 3 segundos
      
    } catch (error) {
      console.error('Error al aplicar cambios a la serie:', error);
      Alert.alert('Error', 'No se pudieron aplicar los cambios a toda la serie');
    }
  }, [selectedEvent, pendingSubtaskChanges]);

  // Función refinada para cargar subtareas de todos los eventos (solo cuando es necesario)
  const loadAllEventsSubtasks = useCallback(async (events: Event[], forceReload: boolean = false, targetDate?: Date) => {
    // console.log('🎯 loadAllEventsSubtasks - START', { count: events.length, forceReload });
    
    try {
      // Si forceReload es true, procesar todos los eventos. Si no, solo los que no están en cache
      const eventsToProcess = forceReload 
        ? events 
        : events.filter(event => !subtasksCache[event.id]);
      
      if (eventsToProcess.length === 0) {
        // console.log('🎯 loadAllEventsSubtasks - All events already have subtasks loaded');
        return;
      }
      
      // console.log('🎯 loadAllEventsSubtasks - Processing', { 
      //   total: events.length, 
      //   toProcess: eventsToProcess.length,
      //   forceReload
      // });
      
      // 🎯 FILTRAR SOLO EVENTOS DE LA SEMANA/DÍA ACTUAL
      let visibleEvents: Event[] = [];
      
      // Usar targetDate si se proporciona, sino usar currentDate
      const dateToUse = targetDate || currentDate;
      
      if (currentView === 'week') {
        const weekStart = startOfWeek(dateToUse);
        const weekEnd = addDays(weekStart, 6);
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        
        visibleEvents = eventsToProcess.filter(event => {
          const eventDate = event.date;
          return eventDate >= weekStartStr && eventDate <= weekEndStr;
        });
        
        // console.log('🎯 FILTRO SEMANA - Rango:', weekStartStr, 'a', weekEndStr, '| Eventos visibles:', visibleEvents.length, 'de', eventsToProcess.length);
      } else if (currentView === 'day') {
        // Para la vista de día, cargar toda la semana para mejor experiencia visual
        const weekStart = startOfWeek(dateToUse);
        const weekEnd = addDays(weekStart, 6);
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        
        visibleEvents = eventsToProcess.filter(event => {
          const eventDate = event.date;
          return eventDate >= weekStartStr && eventDate <= weekEndStr;
        });
        
        // console.log('🎯 FILTRO DÍA (SEMANA) - Rango:', weekStartStr, 'a', weekEndStr, '| Eventos visibles:', visibleEvents.length, 'de', eventsToProcess.length);
      } else {
        // Para month y year, usar todos los eventos por ahora
        visibleEvents = eventsToProcess;
        console.log('🎯 FILTRO MES/AÑO - Usando todos los eventos:', eventsToProcess.length);
      }
      
      // Procesar en lotes más grandes para mejor performance
      const batchSize = 10; // Aumentado de 3 a 10
      
      // Procesar todos los lotes en paralelo para máxima velocidad
      const allBatches = [];
      for (let i = 0; i < visibleEvents.length; i += batchSize) {
        const batch = visibleEvents.slice(i, i + batchSize);
        allBatches.push(batch);
      }
      
      // Procesar todos los lotes simultáneamente
      const allBatchPromises = allBatches.map(async (batch, batchIndex) => {
        const batchPromises = batch.map(async (event) => {
          try {
            // console.log('🎯 DEBUG - Event:', event.title, 'Date:', event.date);
            await loadSubtasks(event.id, event, true);
            // console.log('🎯 loadAllEventsSubtasks - Loaded subtasks for', event.id);
          } catch (error) {
            console.log('🎯 loadAllEventsSubtasks - Error loading', event.id, error instanceof Error ? error.message : String(error));
          }
        });
        
        await Promise.all(batchPromises);
        // console.log(`🎯 BATCH ${batchIndex + 1}/${allBatches.length} COMPLETE`);
      });
      
      // Esperar a que todos los lotes terminen
      await Promise.all(allBatchPromises);
      
      // console.log('🎯 loadAllEventsSubtasks - END');
    } catch (error) {
      console.log('🎯 loadAllEventsSubtasks - Error:', error instanceof Error ? error.message : String(error));
    }
  }, [loadSubtasks, subtasksCache]);

  // Función para refrescar eventos después de crear/editar
  const refreshEvents = useCallback(async () => {
    try {
      const rangeStart = new Date(currentDate);
      rangeStart.setDate(rangeStart.getDate() - 7); // 1 semana atrás
      const rangeEnd = new Date(currentDate);
      rangeEnd.setDate(rangeEnd.getDate() + 30); // 1 mes adelante
      
      
      const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
      if (fetched) {
        // Reemplazar completamente los eventos para evitar duplicados
        setEvents(fetched);
      }
    } catch (error) {
    }
  }, [currentDate]);

  // ===== MONTH EVENTS: Funciones helper movidas a monthEventHelpers.ts =====
  
  // Wrapper functions para mantener compatibilidad con código existente
  const fetchMonthEvents = useCallback(async (year: number, month: number) => {
    return fetchMonthEventsHelper(year, month);
  }, []);

  const fetchYearEvents = useCallback(async (year: number) => {
    return fetchYearEventsHelper(year);
  }, []);

  // Refrescar month events (similar a refreshEvents pero para month)
  const refreshMonthEvents = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const fetched = await fetchMonthEvents(year, month);
      setMonthEvents(fetched);
    } catch (error) {
      // Error refreshing month events
    }
  }, [currentDate, fetchMonthEvents]);

  // ===== DUPLICAR EVENTO =====
  const handleDuplicateEvent = useCallback(async (event: Event) => {
    try {
      const slot = 30; // +30m debajo
      const dayMinutes = 24 * 60;
      const newStartTimeRaw = event.startTime + event.duration + slot;
      const safeStart = Math.min(newStartTimeRaw, dayMinutes - event.duration);

      // 🔧 FIX: Convertir safeStart (en minutos desde userStartHour) a minutos desde START_HOUR
      const safeStartFromStartHour = safeStart + (userStartHour - START_HOUR) * 60;
      const safeEndFromStartHour = (safeStart + event.duration) + (userStartHour - START_HOUR) * 60;
      
      const startLocal = dateKeyToLocalDate(event.date, safeStartFromStartHour);
      const endLocal = dateKeyToLocalDate(event.date, safeEndFromStartHour);

      const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
      if (!calendarId) throw new Error('No hay calendars disponibles');

      const payload = {
        calendar_id: calendarId,
        title: event.title,
        description: event.description || '',
        start_utc: startLocal.toISOString(),
        end_utc: endLocal.toISOString(),
        color: event.color,
        is_recurring: false,
        recurrence_rule: null,
        recurrence_end_date: null,
      };

      const postRes = await apiPostEvent(payload);
      const created = await postRes.json();

      if (postRes.ok && created?.data?.id) {
        await migrateSubtasks(String(event.id), String(created.data.id), event);
        await refreshEvents();
        Alert.alert('Éxito', 'Evento duplicado correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo duplicar el evento');
      }
    } catch (e) {
      console.error('Error al duplicar evento:', e);
      Alert.alert('Error', 'No se pudo duplicar el evento');
    }
  }, [refreshEvents, migrateSubtasks]);

  // Función para eliminar un evento único
  const handleDeleteSingleEvent = useCallback(async (eventId: string) => {
    try {
      // Detectar si es MonthEvent o Event normal
      const event = selectedEvent;
      const isMonthEvent = event && 'startDay' in event;
      
      if (isMonthEvent) {
        const deleteRes = await apiDeleteMonthEvent(String(eventId));
        if (deleteRes.ok) {
          setModalVisible(false);
          setDeleteModalVisible(false);
          setEventTitle('');
          setEventDescription('');
          setSelectedEvent(null);
          setSelectedCell(null);
          await refreshMonthEvents();
        }
      } else {
        const deleteRes = await apiDeleteEvent(String(eventId));
        if (deleteRes.ok) {
          setModalVisible(false);
          setDeleteModalVisible(false);
          setEventTitle('');
          setEventDescription('');
          setSelectedEvent(null);
          setSelectedCell(null);
          await refreshEvents();
        }
      }
    } catch (error) {
      // Error deleting event
    }
  }, [refreshEvents, refreshMonthEvents, selectedEvent]);

  const handleDeleteEvent = useCallback(() => {
    if (!selectedEvent) return;
    
    
    // Verificar si es un evento con campos de recurrencia
    const hasRecurrenceFields = 'is_recurring' in selectedEvent;
    
    // Verificar si el evento tiene recurrencia O si pertenece a una serie (series_id)
    const hasRecurrence = hasRecurrenceFields && selectedEvent.is_recurring;
    const belongsToSeries = hasRecurrenceFields && selectedEvent.series_id;
    
    // 🔥 NUEVO: Detectar si es una instancia generada de una serie (formato "ID_fecha")
    const isGeneratedInstance = typeof selectedEvent.id === 'string' && selectedEvent.id.includes('_');
    
    // 🔥 NUEVO: Detectar si es un evento que viene de una serie (tiene is_recurring pero no es el original)
    const isFromSeries = hasRecurrenceFields && selectedEvent.is_recurring && !isGeneratedInstance;
    
    
    if (hasRecurrence || belongsToSeries || isGeneratedInstance || isFromSeries) {
      // Evento con recurrencia O que pertenece a una serie - mostrar modal de confirmación
      setDeleteModalVisible(true);
    } else {
      // Evento único independiente - eliminar directamente
      
      // Implementar eliminación directa
      handleDeleteSingleEvent(selectedEvent.id);
    }
  }, [selectedEvent, handleDeleteSingleEvent]);

  // Función wrapper para eliminar desde long press (shortcut del botón de eliminar del modal)
  const handleDeleteEventFromLongPress = useCallback((event: Event | MonthEvent) => {
    // Configurar el evento seleccionado para que el modal de confirmación tenga acceso a él
    setSelectedEvent(event);
    
    // Ejecutar la misma lógica que handleDeleteEvent pero con el evento pasado como parámetro
    // Verificar si es un evento con campos de recurrencia
    const hasRecurrenceFields = 'is_recurring' in event;
    
    // Verificar si el evento tiene recurrencia O si pertenece a una serie (series_id)
    const hasRecurrence = hasRecurrenceFields && event.is_recurring;
    const belongsToSeries = hasRecurrenceFields && event.series_id;
    
    // Detectar si es una instancia generada de una serie (formato "ID_fecha")
    const isGeneratedInstance = typeof event.id === 'string' && event.id.includes('_');
    
    // Detectar si es un evento que viene de una serie (tiene is_recurring pero no es el original)
    const isFromSeries = hasRecurrenceFields && event.is_recurring && !isGeneratedInstance;
    
    if (hasRecurrence || belongsToSeries || isGeneratedInstance || isFromSeries) {
      // Evento con recurrencia O que pertenece a una serie - mostrar modal de confirmación
      // Usar setTimeout para asegurar que selectedEvent se actualice antes de mostrar el modal
      setTimeout(() => {
        setDeleteModalVisible(true);
      }, 0);
    } else {
      // Evento único independiente - eliminar directamente
      handleDeleteSingleEvent(event.id);
    }
  }, [handleDeleteSingleEvent]);

  // Función para analizar qué eventos eliminar basado en la estructura de series
  const analyzeEventsToDelete = useCallback((event: Event | MonthEvent, deleteType: 'single' | 'series', allEvents: Event[]): number[] => {
    const eventsToDelete: number[] = [];
    
    // Verificar si el evento tiene campos de recurrencia
    const hasRecurrenceFields = 'is_recurring' in event || 'series_id' in event;
    
    if (!hasRecurrenceFields) {
      // Evento regular sin recurrencia - eliminar solo este

      eventsToDelete.push(Number(event.id));
      return eventsToDelete;
    }
    
    // Evento con campos de recurrencia
    const isRecurring = 'is_recurring' in event && event.is_recurring;
    const hasSeriesId = 'series_id' in event && event.series_id;
    
    // Un evento NO puede ser override de sí mismo
    const isOverride = hasSeriesId && event.series_id !== event.id;
    const isSeriesOriginal = isRecurring && !isOverride;
    
    
    if (deleteType === 'single') {
      // Solo eliminar este evento específico

      eventsToDelete.push(Number(event.id));
      
    } else if (deleteType === 'series') {
      // Eliminar toda la serie
      if (isOverride && 'series_id' in event) {
        // Es un override - eliminar la serie original y todos sus overrides
        const seriesId = Number(event.series_id);

        
        // Agregar la serie original
        eventsToDelete.push(seriesId);
        
        // Buscar todos los overrides de esta serie
        const overrides = allEvents.filter(ev => 
          'series_id' in ev && ev.series_id === seriesId
        );
        
        
        // Agregar todos los overrides
        overrides.forEach(override => {
          eventsToDelete.push(Number(override.id));
        });
        
      } else if (isSeriesOriginal) {
        // Es la serie original - eliminar la serie y todos sus overrides
        let seriesId: number;
        
        // Manejar instancias generadas que tienen formato "ID_fecha"
        if (typeof event.id === 'string' && event.id.includes('_')) {
          seriesId = Number(event.id.split('_')[0]);

        } else {
          seriesId = Number(event.id);

        }
        
        // Agregar la serie original
        eventsToDelete.push(seriesId);
        
        // Buscar todos los overrides de esta serie (incluyendo instancias generadas)
        const overrides = allEvents.filter(ev => {
          // Overrides reales con series_id
          if ('series_id' in ev && ev.series_id === seriesId) {
            return true;
          }
          // Instancias generadas con formato "ID_fecha"
          if (typeof ev.id === 'string' && ev.id.includes('_')) {
            const instanceSeriesId = Number(ev.id.split('_')[0]);
            return instanceSeriesId === seriesId;
          }
          return false;
        });
        
        
        // Agregar todos los overrides
        overrides.forEach(override => {
          eventsToDelete.push(Number(override.id));
        });
      }
    }
    
    // Eliminar duplicados y valores inválidos (NaN)
    const validEvents = eventsToDelete.filter(id => !isNaN(id) && id > 0);
    const uniqueEvents = [...new Set(validEvents)];
    
    // Validación adicional: verificar que los eventos existen
    if (uniqueEvents.length === 0) {

      return [];
    }
    

    return uniqueEvents;
  }, []);

  const handleDeleteConfirm = useCallback(async (deleteType: 'single' | 'series') => {
    if (!selectedEvent) {
      setDeleteModalVisible(false);
      return;
    }
    
    try {
      if (deleteType === 'single') {
        // 🎯 NUEVA LÓGICA: Si es una instancia de serie, convertirla en override primero
        const isInstance = typeof selectedEvent.id === 'string' && selectedEvent.id.includes('_');
        
        if (isInstance) {
          
          // Crear override con los mismos datos de la instancia
          // 🎯 CORREGIR: Usar la fecha correcta de la instancia, no la original
          const eventInstance = selectedEvent as Event;
          const instanceDate = eventInstance.date; // Fecha de la instancia (ej: 2025-09-30)
          const instanceStartTime = eventInstance.startTime; // Hora de la instancia
          const instanceDuration = eventInstance.duration;
          
          // Convertir startTime a horas y minutos
          const hours = Math.floor(instanceStartTime / 60);
          const minutes = instanceStartTime % 60;
          const endHours = Math.floor((instanceStartTime + instanceDuration) / 60);
          const endMinutes = (instanceStartTime + instanceDuration) % 60;
          
          // Obtener calendar_id dinámicamente
          const calJson = await apiGetCalendars();
          const calendarId = calJson?.data?.[0]?.id;
          if (!calendarId) throw new Error('No calendars available');

          const overridePayload = {
            calendar_id: calendarId,
            title: eventInstance.title,
            description: eventInstance.description || '',
            start_utc: new Date(`${instanceDate}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).toISOString(),
            end_utc: new Date(`${instanceDate}T${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00.000Z`).toISOString(),
            series_id: eventInstance.series_id,
            original_start_utc: new Date(`${instanceDate}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).toISOString(), // 🎯 CORREGIR: Usar la fecha de la instancia
            color: eventInstance.color,
            all_day: false,
            timezone: 'UTC'
          };
          
          // Crear el override
          const createRes = await apiPostEvent(overridePayload);
          if (createRes.ok) {
            const overrideData = await createRes.json();
            
            // Ahora eliminar el override recién creado
            const deleteRes = await apiDeleteEvent(String(overrideData.data.id));
            if (deleteRes.ok) {
            }
          }
        } else {
          // Es un evento único o override, eliminar directamente
          const deleteRes = await apiDeleteEvent(String(selectedEvent.id));
          if (!deleteRes.ok) {
          }
        }
      } else {
        // Eliminar toda la serie (lógica existente)
        const eventsToDelete = analyzeEventsToDelete(selectedEvent, deleteType, events);
        
        for (const eventId of eventsToDelete) {
          const deleteRes = await apiDeleteEvent(String(eventId));
          if (!deleteRes.ok) {
          }
        }
      }
      
      // Cerrar todos los modales inmediatamente
      setModalVisible(false);
      setDeleteModalVisible(false);
      setEventTitle('');
      setEventDescription('');
      setSelectedEvent(null);
      setSelectedCell(null);
      
      // Refrescar eventos para actualizar la interfaz

      await refreshEvents();
      

      
    } catch (error) {

    }
  }, [selectedEvent, events, analyzeEventsToDelete, refreshEvents]);

  // ===== REFS Y CONFIGURACIÓN =====
  const resizeLockRef = useRef<Set<string>>(new Set());
  const verticalScrollRef = useRef<ScrollView | null>(null);
  const contentHorizontalRef = useRef<ScrollView | null>(null);
  const headerHorizontalRef = useRef<ScrollView | null>(null);
  const horizontalOffsetRef = useRef(0);
  const availableColors = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#9c27b0'];

  // ===== UTILIDADES DE FECHA =====
  const startOfWeek = useCallback((date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Dom,1=Lun...
    const diffToMon = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMon);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const addDays = useCallback((date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }, []);

  const addMonths = useCallback((date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }, []);

  const toDateKey = useCallback((d: Date) => {
    // Usar fecha local para evitar problemas de timezone
    // Formato: YYYY-MM-DD usando fecha local (no UTC)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Ranuras de tiempo (cada 30 minutos) para vista día/semana
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = userStartHour; hour < userEndHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    console.log(`⏰ TimeSlots recalculados: ${slots.length} slots desde ${userStartHour}:00 hasta ${userEndHour === 24 ? '00:00' : userEndHour + ':00'}`);
    return slots;
  }, [userStartHour, userEndHour]);

  const weekDaysFull = useMemo(() => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], []);

  // Indexar eventos por fecha+hora para búsqueda rápida
  const eventsByCell = useMemo(() => {
    const index: { [key: string]: Event } = {};
    events.forEach(ev => {
      const key = `${ev.date}-${ev.startTime}`;
      index[key] = ev;
    });
    return index;
  }, [events]);


  const formatTime = useCallback((timeIndex: number) => {
    const totalMinutes = userStartHour * 60 + (timeIndex * 30);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [userStartHour]);

  const getRandomColor = useCallback(() => {
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }, []);

  const recurrenceSummary = useMemo(() => {
    if (!recurrenceConfig.enabled) return 'Desligado';

    const unit = INTERVAL_UNIT_LABEL[recurrenceConfig.mode];
    const intervalText = `a cada ${recurrenceConfig.interval} ${recurrenceConfig.interval === 1 ? unit.singular : unit.plural}`;

    let detail = '';
    if (recurrenceConfig.mode === 'weekly') {
      const days = recurrenceConfig.weekDays.map(code => WEEK_DAY_LABEL_BY_CODE[code] ?? code).join(', ');
      detail = days ? ` • ${days}` : ' • —';
    } else if (recurrenceConfig.mode === 'monthly') {
      const days = recurrenceConfig.monthDays.join(', ');
      detail = days ? ` • Dias ${days}` : ' • —';
    }

    const endText = recurrenceConfig.hasEndDate && recurrenceConfig.endDate ? ` • até ${formatDateKey(recurrenceConfig.endDate)}` : '';

    return `${RECURRENCE_MODE_LABEL[recurrenceConfig.mode]} • ${intervalText}${detail}${endText}`;
  }, [recurrenceConfig]);

  const normalizeApiEvent = useCallback((apiEvent: any): Event | null => {
    if (!apiEvent?.id || !apiEvent?.start_utc || !apiEvent?.end_utc) {
      
      return null;
    }

    


    const startDate = new Date(apiEvent.start_utc);
    const endDate = new Date(apiEvent.end_utc);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

    // Verificar si el evento está dentro del rango configurado
    const eventStartHour = startDate.getUTCHours();
    const eventStartMinute = startDate.getUTCMinutes();
    const eventEndHour = endDate.getUTCHours();
    const eventEndMinute = endDate.getUTCMinutes();
    const effectiveEndHour = userEndHour === 24 ? 24 : userEndHour;
    
    // Calcular minutos totales para comparación más precisa
    const eventStartTotalMinutes = eventStartHour * 60 + eventStartMinute;
    const eventEndTotalMinutes = eventEndHour * 60 + eventEndMinute;
    const rangeStartTotalMinutes = userStartHour * 60;
    const rangeEndTotalMinutes = effectiveEndHour === 24 ? 24 * 60 : effectiveEndHour * 60;
    
    // Si el evento está completamente fuera del rango, no mostrarlo (pero no causar error)
    // Evento está fuera si:
    // - Termina completamente antes de start_hour
    // - Empieza completamente después de end_hour
    const isCompletelyBeforeRange = eventEndTotalMinutes < rangeStartTotalMinutes;
    const isCompletelyAfterRange = eventStartTotalMinutes >= rangeEndTotalMinutes;
    
    if (isCompletelyBeforeRange || isCompletelyAfterRange) {
      // Evento fuera del rango - retornar null para no mostrarlo, pero no es un error
      return null;
    }

    const totalStartMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
    const minutesFromCalendarStart = totalStartMinutes - userStartHour * 60;
    const snappedStart = Math.max(0, Math.floor(minutesFromCalendarStart / 30) * 30);

    const rawDuration = Math.max(30, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    const snappedDuration = Math.max(30, Math.round(rawDuration / 30) * 30);


    return {
      id: String(apiEvent.id),
      title: apiEvent.title ?? 'Sin título',
      description: apiEvent.description ?? undefined,
      color: apiEvent.color || '#6b53e2',
      category: apiEvent?.category?.name ?? 'General',
      date: toDateKey(startDate),
      startTime: snappedStart,
      duration: snappedDuration,
      // Campos de recurrencia
      is_recurring: apiEvent.is_recurring || false,
      recurrence_rule: apiEvent.recurrence_rule || null,
      recurrence_end_date: apiEvent.recurrence_end_date || null,
      // Campos para detectar si viene de una serie
      series_id: apiEvent.series_id || null,
      original_start_utc: apiEvent.original_start_utc || null,
    };
  }, [toDateKey, userStartHour, userEndHour]);

  const fetchEventsForRange = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    try {
      // Expandir el rango para capturar eventos recurrentes que puedan generar instancias en el rango visible
      const expandedStart = new Date(rangeStart);
      expandedStart.setMonth(expandedStart.getMonth() - 6); // 6 meses atrás para capturar eventos recurrentes
      
      const expandedEnd = new Date(rangeEnd);
      expandedEnd.setMonth(expandedEnd.getMonth() + 6); // 6 meses adelante para capturar eventos futuros
      
      const response = await apiFetchEvents(expandedStart.toISOString(), expandedEnd.toISOString());
      if (!response.ok) {
        return null;
      }

      const body = await response.json();
      if (!body?.success || !Array.isArray(body.data)) {
        return null;
      }

      const allEvents: Event[] = [];
      const overrides: any[] = [];
      const series: any[] = [];
      
      // Separar eventos en categorías
      for (const item of body.data) {
        
        if (item.series_id && item.original_start_utc) {
          // Es un override

          overrides.push(item);
        } else if (item.is_recurring) {
          // Es una serie recurrente

          series.push(item);
        } else {
          // Evento regular

          const normalizedEvent = normalizeApiEvent(item);
          if (normalizedEvent) {
            allEvents.push(normalizedEvent);
          }
        }
      }

      // Crear mapa de overrides para consulta rápida
      const overridesMap = new Map<string, any>();
      overrides.forEach(override => {
        // Normalizar original_start_utc a ISO UTC para comparación
        const originalStartUtc = new Date(override.original_start_utc).toISOString();
        overridesMap.set(originalStartUtc, override);
      });

      
      // Procesar series recurrentes con overrides
      for (const seriesItem of series) {
        
        const recurrentInstances = generateRecurrentInstances(seriesItem, rangeStart, rangeEnd, overridesMap, userStartHour, userEndHour);
        allEvents.push(...recurrentInstances);
      }

      // 🔥 NUEVO: Procesar overrides independientes (sin serie recurrente activa)

      for (const override of overrides) {
        // Verificar si el override tiene una serie recurrente activa
        const hasActiveSeries = series.some(s => s.id === override.series_id);
        
        if (!hasActiveSeries) {
          // Override independiente - procesar como evento regular
          
          const normalizedOverride = normalizeApiEvent(override);
          if (normalizedOverride) {
            allEvents.push(normalizedOverride);
          } else {
          }
        }
      }

      return allEvents;
    } catch (error) {

      return null;
    }
  }, [normalizeApiEvent]);

  // Cargar month events cuando se cambia a vista de mes
  useEffect(() => {
    // Solo ejecutar si estamos en vista de mes
    if (currentView !== 'month') {
      return;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Función async dentro del useEffect para evitar dependencia de fetchMonthEvents
    (async () => {
      try {
        const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
        const response = await apiFetchMonthEvents(year, month, calendarId);
        
        if (!response.ok) {
          return;
        }

        const body = await response.json();
        if (!body?.success || !Array.isArray(body.data)) {
          return;
        }

        // Transformar todos los eventos del backend al formato frontend
        // Parsear fechas sin problemas de timezone usando YYYY-MM-DD directamente
        const monthEvents: MonthEvent[] = body.data
          .filter((backendEvent: any) => {
            // Filtrar por año y mes correctos
            const eventStartParts = backendEvent.start_date.split('-');
            const eventYear = parseInt(eventStartParts[0], 10);
            const eventMonth = parseInt(eventStartParts[1], 10) - 1; // Backend usa 1-12, frontend usa 0-11
            return eventYear === year && eventMonth === month;
          })
          .map((backendEvent: any) => {
            // Parsear fechas sin problemas de timezone usando YYYY-MM-DD directamente
            const startParts = backendEvent.start_date.split('-');
            const endParts = backendEvent.end_date.split('-');
            const startDay = parseInt(startParts[2], 10);
            const endDay = parseInt(endParts[2], 10);
            
            // Calcular duración en días (diferencia + 1 para ser inclusivo)
            // Ejemplo: día 2 a día 2 = 1 día, día 2 a día 3 = 2 días
            const duration = Math.max(1, endDay - startDay + 1);
            
            return {
              id: backendEvent.id.toString(),
              title: backendEvent.title,
              description: backendEvent.description || '',
              startDay,
              duration,
              color: backendEvent.color || '#6b53e2',
              category: backendEvent.category || 'General',
              year,
              month,
            };
          });

        setMonthEvents(monthEvents);
      } catch (error) {
        // Error loading month events
      }
    })();
  }, [currentView, currentDate.getFullYear(), currentDate.getMonth()]);

  // Cargar eventos del año completo y forzar orientación horizontal cuando se cambia a vista de año
  useEffect(() => {
    if (currentView !== 'year') {
      // Restaurar orientación cuando se sale de la vista de año
      if (ScreenOrientationAvailable && ScreenOrientation) {
        try {
          ScreenOrientation.unlockAsync().catch(() => {});
        } catch (e) {
          // Ignorar errores al desbloquear
        }
      }
      return;
    }
    
    // Forzar orientación horizontal si el módulo está disponible
    if (ScreenOrientationAvailable && ScreenOrientation && ScreenOrientation.OrientationLock) {
      try {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      } catch (e) {
        // Ignorar errores al bloquear orientación
      }
    }
    
    const year = currentDate.getFullYear();
    
    // Función async para cargar eventos del año
    (async () => {
      try {
        const fetched = await fetchYearEvents(year);
        setYearEvents(fetched);
      } catch (error) {
        // Error loading year events
      }
    })();

    // Cleanup: restaurar orientación cuando el componente se desmonte o se salga de la vista
    return () => {
      if (ScreenOrientationAvailable && ScreenOrientation) {
        try {
          ScreenOrientation.unlockAsync().catch(() => {});
        } catch (e) {
          // Ignorar errores al desbloquear
        }
      }
    };
  }, [currentView, currentDate.getFullYear(), fetchYearEvents]);

  useEffect(() => {
    if (currentView !== 'week' && currentView !== 'day') {
      return;
    }

    // Tanto para week como day, usar semana completa (igual que funcionaba antes)
    const weekStart = startOfWeek(currentDate);
    const rangeStart = new Date(weekStart);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = addDays(rangeStart, 6);
    rangeEnd.setHours(23, 59, 59, 999);

    let ignore = false;

    (async () => {
      const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
      
      if (!ignore && fetched) {
        setEvents(fetched);
        // Solo cargar subtareas al cargar el calendario inicialmente
        await loadAllEventsSubtasks(fetched);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [currentView, currentDate, startOfWeek, addDays, fetchEventsForRange, loadAllEventsSubtasks]);

  // Obtener ancho de celda
  const getCellWidth = useCallback(() => {
    if (currentView === 'day') {
      return width - 60;
    } else if (currentView === 'month') {
      return width - 60; // Mismo ancho que vista de día
    } else if (currentView === 'week') {
      return ((width - 60) / 7) * 2; // doble ancho por día
    }
    return (width - 60) / 7;
  }, [currentView, width]);

  // Formatea el header superior usando currentDate
  const formatHeaderDate = useCallback(() => {
    const d = new Date(currentDate);
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    if (currentView === 'day') {
      // Usar fecha local en lugar de UTC para evitar problemas de timezone
      const localDay = d.getDate();
      const localMonth = d.getMonth();
      const localDayName = dayNames[d.getDay()];
      return `Hoy, ${localDayName}, ${localDay} de ${monthNames[localMonth]}`;
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);
      
      // Determinar el mes principal de la semana (usar el mes del inicio de la semana)
      const weekMonth = weekStart.getMonth();
      const weekMonthName = monthNames[weekMonth];
      
      // Calcular el número de semana del mes
      // El día del mes del inicio de la semana
      const dayOfMonth = weekStart.getDate();
      // Calcular qué semana del mes es (redondear hacia arriba)
      const weekNumber = Math.ceil(dayOfMonth / 7);
      
      // Capitalizar la primera letra del mes
      const capitalizedMonth = weekMonthName.charAt(0).toUpperCase() + weekMonthName.slice(1);
      
      return `Semana ${weekNumber}, ${capitalizedMonth}`;
    } else if (currentView === 'month') {
      const formatted = d.toLocaleString('es-ES', { month: 'long' });
      return `${formatted.charAt(0).toUpperCase() + formatted.slice(1)} ${d.getFullYear()}`;
    } else if (currentView === 'year') {
      return `${d.getFullYear()}`;
    }
    return '';
  }, [currentView, currentDate, startOfWeek, addDays]);

  // Manejo de creación/edición de eventos
  // Determina la fecha real (YYYY-MM-DD) que corresponde a la celda seleccionada
  const dateForCell = useCallback((view: string, cell: SelectedCell | SelectedMonthCell | null) => {
    if (!cell) return null;
    if (view === 'day' && 'timeIndex' in (cell as SelectedCell)) {
      // Día actual
      return toDateKey(currentDate);
    }
    if (view === 'week' && 'timeIndex' in (cell as SelectedCell)) {
      const weekStart = startOfWeek(currentDate);
      const dayIndex = (cell as SelectedCell).dayIndex;
      const dayDate = addDays(weekStart, dayIndex);
      return toDateKey(dayDate);
    }
    if (view === 'month' && 'day' in (cell as SelectedMonthCell)) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = (cell as SelectedMonthCell).day;
      const d = new Date(year, month, day);
      return toDateKey(d);
    }
    return null;
  }, [currentDate, startOfWeek, addDays, toDateKey]);

  // ===== MANEJO DE EVENTOS =====
  const handleCellPress = useCallback((dayIndex: number, timeIndex: number) => {
    // Verificar si estamos en el tutorial y si el objetivo es hacer clic en celda vacía
    if (tutorialVisible && !tutorialCompleted) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      if (currentStepData?.objective === 'click-empty-cell') {
        // Solo permitir clic en celdas vacías durante este paso del tutorial
        const startTime = timeIndex * 30;
        let dateKey = '';
        if (currentView === 'day') {
          dateKey = toDateKey(currentDate);
        } else if (currentView === 'week') {
          const weekStart = startOfWeek(currentDate);
          const dayDate = addDays(weekStart, dayIndex);
          dateKey = toDateKey(dayDate);
        } else {
          dateKey = toDateKey(currentDate);
        }
        const lookupKeyFinal = `${dateKey}-${startTime}`;
        const existingEventFinal = eventsByCell[lookupKeyFinal];
        
        // Si hay un evento, no permitir abrir el modal (acción incorrecta)
        if (existingEventFinal) {
          console.log('⚠️ Tutorial: Debes hacer clic en una celda vacía, no en un evento existente');
          return;
        }
      }
    }

    const startTime = timeIndex * 30;
    const lookupKey = `${toDateKey(currentDate)}-${startTime}`;
    const existingEvent = eventsByCell[lookupKey];
    

    // Calcular fecha correspondiente a la celda (usando vista semana)
    let dateKey = '';
    if (currentView === 'day') {
      dateKey = toDateKey(currentDate);
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const dayDate = addDays(weekStart, dayIndex);
      dateKey = toDateKey(dayDate);
    } else {
      // Por defecto usar currentDate
      dateKey = toDateKey(currentDate);
    }

    const lookupKeyFinal = `${dateKey}-${startTime}`;
    const existingEventFinal = eventsByCell[lookupKeyFinal];

    if (existingEventFinal) {
      setSelectedEvent(existingEventFinal);
      setEventTitle(existingEventFinal.title);
      setEventDescription(existingEventFinal.description || '');
      setEventColor(existingEventFinal.color);
      setRecurrenceConfig(extractRecurrenceFromEvent(existingEventFinal));
      // Reset alarm settings when editing existing event
      setAlarmEnabled(false);
      setAlarmOption('at_start');
      setModalVisible(true);
    } else {
      setSelectedEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventColor(getRandomColor());
      setRecurrenceConfig(createDefaultRecurrenceConfig());
      // Limpiar subtareas al crear evento nuevo
      setSubtasks([]);
      setNewSubtaskText('');
      setShowSubtaskInput(false);
      // Reset alarm settings when creating new event
      setAlarmEnabled(false);
      setAlarmOption('at_start');
      setModalVisible(true);
      setSelectedCell({ dayIndex, timeIndex, startTime });
    }
  }, [currentView, currentDate, startOfWeek, addDays, eventsByCell, getRandomColor, toDateKey, tutorialVisible, tutorialCompleted, tutorialStep]);


  const handleSaveEvent = useCallback(async () => {
    // 🔥 CRÍTICO: Detectar tutorial ANTES de cualquier validación
    // Debe detectarse cuando se presiona el botón, independientemente de si pasa las validaciones
    if (tutorialVisible && !tutorialCompleted) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      console.log('🎯 handleSaveEvent - Tutorial check:', {
        step: tutorialStep,
        objective: currentStepData?.objective,
        id: currentStepData?.id,
      });
      
      if (currentStepData?.objective === 'press-create-button') {
        console.log('✅ Objetivo cumplido: press-create-button (botón presionado)');
        // Avanzar inmediatamente cuando se presiona el botón crear
        setTimeout(() => handleTutorialNext(), 500);
      } else if (currentStepData?.objective === 'save-event-with-subtasks') {
        // Verificar que hay subtareas antes de avanzar
        if (subtasks.length >= 2) {
          console.log('✅ Objetivo cumplido: save-event-with-subtasks');
          setTimeout(() => handleTutorialNext(), 500);
        }
      }
    }
    
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    // NUEVO: Detectar cambios estructurales en subtareas antes de guardar
    // Detectar si es instancia recurrente (virtual o override)
    const isRecurringInstance = selectedEvent && (
      ('series_id' in selectedEvent && selectedEvent.series_id !== null) ||
      ('is_recurring' in selectedEvent && selectedEvent.is_recurring && 'original_start_utc' in selectedEvent)
    );
    
    if (isRecurringInstance) {
      const { hasChanges, changes } = detectSubtaskStructuralChanges();
      
      console.log('🔍 handleSaveEvent - Checking subtask changes', {
        isRecurringInstance,
        hasChanges,
        changesDetail: changes
      });
      
      if (hasChanges) {
        // Guardar cambios pendientes y mostrar modal
        console.log('📢 handleSaveEvent - SHOWING MODAL for subtask changes');
        setPendingSubtaskChanges(changes);
        setSubtaskChangesModalVisible(true);
        return; // Detener el save hasta que el usuario decida
      }
    }

    // Almacena el ID temporal del evento que se está creando/editando
    const tempId = selectedEvent?.id; 
    const isNewEvent = !selectedEvent;

    // CRÍTICO: Detectar si hay cambios reales que justifiquen recrear el evento
    // Si solo se marcaron checkboxes (sin cambios estructurales), NO recrear
    const hasRealChanges = selectedEvent && (
      eventTitle !== selectedEvent.title ||
      eventDescription !== (selectedEvent.description || '') ||
      eventColor !== selectedEvent.color
      // Agregar más campos si es necesario
    );
    
    console.log('🔍 handleSaveEvent - Change detection', {
      hasSelectedEvent: !!selectedEvent,
      hasRealChanges,
      titleChanged: selectedEvent ? eventTitle !== selectedEvent.title : 'N/A',
      descChanged: selectedEvent ? eventDescription !== (selectedEvent.description || '') : 'N/A',
      colorChanged: selectedEvent ? eventColor !== selectedEvent.color : 'N/A'
    });

    // Si NO hay cambios reales y NO hay cambios estructurales en subtareas → solo cerrar modal
    if (!isNewEvent && !hasRealChanges && isRecurringInstance) {
      const { hasChanges: hasSubtaskChanges } = detectSubtaskStructuralChanges();
      
      if (!hasSubtaskChanges) {
        console.log('✅ handleSaveEvent - No real changes detected, closing modal without recreating event');
        setModalVisible(false);
        setEventTitle('');
        setEventDescription('');
        setSelectedEvent(null);
        setSelectedCell(null);
        setSelectedMonthCell(null);
        await refreshEvents(); // Solo refrescar UI
        return;
      }
    }

    // 🔥 NUEVA LÓGICA: Detectar si estamos editando recurrencia en un evento que viene de una serie
    // NOTA: Un evento liberado (sin series_id local) que se le aplica recurrencia debe crear nueva serie independiente
    const isEditingRecurrenceOnSeriesEvent = !isNewEvent && 
      selectedEvent && 
      'startTime' in selectedEvent && 
      (selectedEvent.series_id || selectedEvent.original_start_utc) && 
      recurrenceConfig.enabled;


    if (isEditingRecurrenceOnSeriesEvent) {
      
      
      try {
        // 1. Crear nuevo evento recurrente independiente
        // Usar fecha/hora personalizada si existe, de lo contrario usar la del evento
        const eventDate = customDateKey || (selectedEvent && 'date' in selectedEvent ? selectedEvent.date : '');
        const eventStartTime = customStartTime !== null ? customStartTime : (selectedEvent && 'startTime' in selectedEvent ? selectedEvent.startTime : 0);
        const eventDuration = selectedEvent && 'duration' in selectedEvent ? selectedEvent.duration : 30;
        
        // 🔧 FIX: Convertir eventStartTime (en minutos desde userStartHour) a minutos desde START_HOUR
        const eventStartTimeFromStartHour = eventStartTime + (userStartHour - START_HOUR) * 60;
        const eventEndTimeFromStartHour = (eventStartTime + eventDuration) + (userStartHour - START_HOUR) * 60;
        
        const baseStartLocal = dateKeyToLocalDate(eventDate, eventStartTimeFromStartHour);
        const baseEndLocal = dateKeyToLocalDate(eventDate, eventEndTimeFromStartHour);
        
        const recurrenceRule = {
          frequency: recurrenceConfig.mode.toUpperCase(),
          interval: recurrenceConfig.interval,
          ...(recurrenceConfig.mode === 'weekly' && recurrenceConfig.weekDays.length > 0 && { byWeekDays: recurrenceConfig.weekDays }),
          ...(recurrenceConfig.mode === 'monthly' && recurrenceConfig.monthDays.length > 0 && { byMonthDays: recurrenceConfig.monthDays })
        };

        const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
        if (!calendarId) throw new Error('No hay calendars disponibles');

        const payload = {
          calendar_id: calendarId,
          title: eventTitle,
          description: eventDescription,
          start_utc: baseStartLocal.toISOString(),
          end_utc: baseEndLocal.toISOString(),
          color: eventColor,
          is_recurring: true,
          recurrence_rule: JSON.stringify(recurrenceRule),
          recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null,
        };

        const postRes = await apiPostEvent(payload);
        const created = await postRes.json();

        if (postRes.ok && created?.data?.id) {      
          console.log('🔄 handleSaveEvent - Migrating subtasks after creating new recurring event');
          
          // 2. Migrar subtareas del evento anterior al nuevo (pasar selectedEvent para detectar si es maestro)
          await migrateSubtasks(String(selectedEvent.id), String(created.data.id), selectedEvent);
          
          // 3. Eliminar el evento original que venía de la serie
          await apiDeleteEvent(String(selectedEvent.id));
          
          // 4. Refrescar eventos para mostrar la nueva serie
          await refreshEvents();
          
          // 4. Cerrar modal
          setModalVisible(false);
          setEventTitle('');
          setEventDescription('');
          setSelectedEvent(null);
          setSelectedCell(null);
          setSelectedMonthCell(null);
          setRecurrenceConfig(createDefaultRecurrenceConfig());
          
          return;
        } else {
          throw new Error('No se pudo crear la nueva serie recurrente');
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo crear la nueva serie recurrente');
        return;
      }
    }

    if (tempId && !isNewEvent) {
      // 🔥 NUEVA LÓGICA: Si es un evento liberado (sin series_id local), cualquier edición
      // debe crear una nueva serie independiente en lugar de solo actualizar
      if ('startTime' in selectedEvent && 
          !selectedEvent.series_id && 
          !selectedEvent.original_start_utc) {
        

        
        try {
          // 1. Crear nuevo evento (con o sin recurrencia)
          // Usar fecha/hora personalizada si existe, de lo contrario usar la del evento
          const eventDate = customDateKey || (selectedEvent && 'date' in selectedEvent ? selectedEvent.date : '');
          const eventStartTime = customStartTime !== null ? customStartTime : (selectedEvent && 'startTime' in selectedEvent ? selectedEvent.startTime : 0);
          const eventDuration = selectedEvent && 'duration' in selectedEvent ? selectedEvent.duration : 30;
          
          // 🔧 FIX: Convertir eventStartTime (en minutos desde userStartHour) a minutos desde START_HOUR
          const eventStartTimeFromStartHour = eventStartTime + (userStartHour - START_HOUR) * 60;
          const eventEndTimeFromStartHour = (eventStartTime + eventDuration) + (userStartHour - START_HOUR) * 60;
          
          const baseStartLocal = dateKeyToLocalDate(eventDate, eventStartTimeFromStartHour);
          const baseEndLocal = dateKeyToLocalDate(eventDate, eventEndTimeFromStartHour);
          
          let recurrenceRule = null;
          if (recurrenceConfig.enabled) {
            recurrenceRule = {
              frequency: recurrenceConfig.mode.toUpperCase(),
              interval: recurrenceConfig.interval,
              ...(recurrenceConfig.mode === 'weekly' && recurrenceConfig.weekDays.length > 0 && { byWeekDays: recurrenceConfig.weekDays }),
              ...(recurrenceConfig.mode === 'monthly' && recurrenceConfig.monthDays.length > 0 && { byMonthDays: recurrenceConfig.monthDays })
            };
          }

          const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
          if (!calendarId) throw new Error('No hay calendars disponibles');

          const payload = {
            calendar_id: calendarId,
            title: eventTitle,
            description: eventDescription,
            start_utc: baseStartLocal.toISOString(),
            end_utc: baseEndLocal.toISOString(),
            color: eventColor,
            is_recurring: recurrenceConfig.enabled,
            recurrence_rule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
            recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null,
          };

          const postRes = await apiPostEvent(payload);
          const created = await postRes.json();

          if (postRes.ok && created?.data?.id) {
            console.log('🔄 handleSaveEvent - Migrating subtasks after converting to recurring');

            // 2. Migrar subtareas del evento anterior al nuevo (pasar selectedEvent para detectar si es maestro)
            await migrateSubtasks(String(selectedEvent.id), String(created.data.id), selectedEvent);
            
            // 3. Eliminar el evento liberado original
            await apiDeleteEvent(String(selectedEvent.id));
            
            // 4. Refrescar eventos para mostrar la nueva serie
            await refreshEvents();
            
            // 4. Cerrar modal
            setModalVisible(false);
            setEventTitle('');
            setEventDescription('');
            setSelectedEvent(null);
            setSelectedCell(null);
            setSelectedMonthCell(null);
            setRecurrenceConfig(createDefaultRecurrenceConfig());
            
            return;
          } else {
            throw new Error('No se pudo crear la nueva serie independiente');
          }
        } catch (error) {

          Alert.alert('Error', 'No se pudo crear la nueva serie independiente');
          return;
        }
      }
      
      // Lógica para actualizar un evento existente
      if ('startTime' in selectedEvent) {
        
        // Actualizar localmente primero
        setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { 
          ...ev, 
          title: eventTitle, 
          description: eventDescription, 
          color: eventColor,
          // Guardar campos de recurrencia
          is_recurring: recurrenceConfig.enabled,
          recurrence_rule: recurrenceConfig.enabled ? JSON.stringify({
            frequency: recurrenceConfig.mode.toUpperCase(),
            interval: recurrenceConfig.interval,
            ...(recurrenceConfig.mode === 'weekly' && recurrenceConfig.weekDays.length > 0 && { byWeekDays: recurrenceConfig.weekDays }),
            ...(recurrenceConfig.mode === 'monthly' && recurrenceConfig.monthDays.length > 0 && { byMonthDays: recurrenceConfig.monthDays })
          }) : null,
          recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null
        } : ev));
        
        // 🔥 NUEVO: Enviar actualización al servidor
        try {
          // Usar fecha/hora personalizada si existe, de lo contrario usar la del evento
          const eventDate = customDateKey || (selectedEvent && 'date' in selectedEvent ? selectedEvent.date : '');
          const eventStartTime = customStartTime !== null ? customStartTime : (selectedEvent && 'startTime' in selectedEvent ? selectedEvent.startTime : 0);
          const eventDuration = selectedEvent && 'duration' in selectedEvent ? selectedEvent.duration : 30;
          
          // 🔧 FIX: Convertir eventStartTime (en minutos desde userStartHour) a minutos desde START_HOUR
          const eventStartTimeFromStartHour = eventStartTime + (userStartHour - START_HOUR) * 60;
          const eventEndTimeFromStartHour = (eventStartTime + eventDuration) + (userStartHour - START_HOUR) * 60;
          
          const baseStartLocal = dateKeyToLocalDate(eventDate, eventStartTimeFromStartHour);
          const baseEndLocal = dateKeyToLocalDate(eventDate, eventEndTimeFromStartHour);
          
          let recurrenceRule: RecurrenceRule | null = null;
          if (recurrenceConfig.enabled) {
            recurrenceRule = {
              frequency: recurrenceConfig.mode.toUpperCase(),
              interval: recurrenceConfig.interval,
            };

            if (recurrenceConfig.mode === 'weekly' && recurrenceConfig.weekDays.length > 0) {
              recurrenceRule.byWeekDays = recurrenceConfig.weekDays;
            }

            if (recurrenceConfig.mode === 'monthly' && recurrenceConfig.monthDays.length > 0) {
              recurrenceRule.byMonthDays = recurrenceConfig.monthDays;
            }
          }
          
          const updatePayload = {
            title: eventTitle,
            description: eventDescription,
            start_utc: baseStartLocal.toISOString(),
            end_utc: baseEndLocal.toISOString(),
            color: eventColor,
            is_recurring: recurrenceConfig.enabled,
            recurrence_rule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
            recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null,
          };
          

          
          const updateRes = await apiPutEvent(String(selectedEvent.id), updatePayload);
          if (updateRes.ok) {

            await refreshEvents(); // Refrescar para sincronizar

          } else {

          }
        } catch (error) {

        }
      } else {
        // Si es MonthEvent, actualizar en API
        if ('startDay' in selectedEvent) {
          try {
            const monthEvent = selectedEvent as MonthEvent;
            const backendData = monthEventFrontendToBackend(monthEvent);
            const updatePayload = {
              title: eventTitle,
              description: eventDescription,
              color: eventColor,
              ...backendData,
            };
            
            const updateRes = await apiPutMonthEvent(String(selectedEvent.id), updatePayload);
            if (updateRes.ok) {
              await refreshMonthEvents();
            }
          } catch (error) {
            // Error updating month event
          }
        } else {
          // Fallback: si no es MonthEvent pero está en monthEvents, actualizar localmente
          if (selectedEvent && 'startDay' in selectedEvent === false) {
            // No hacer nada, solo para eventos normales que no son month events
          }
        }
      }
    } else if (selectedCell) {
      // Lógica para crear un nuevo evento
      let dateKey = '';
      if (currentView === 'day') {
        dateKey = toDateKey(currentDate);
      } else if (currentView === 'week') {
        const weekStart = startOfWeek(currentDate);
        const dayDate = addDays(weekStart, selectedCell.dayIndex);
        dateKey = toDateKey(dayDate);
      } else {
        dateKey = toDateKey(currentDate);
      }

      // Usar fecha/hora personalizada si existe, de lo contrario usar selectedCell
      const finalDateKey = customDateKey || dateKey;
      const finalStartTime = customStartTime !== null ? customStartTime : selectedCell.startTime;

      // NO crear el evento localmente si es recurrente - esperar respuesta del servidor
      // para evitar mostrar el evento en la fecha incorrecta
      let localId = null;
      let newEvent: Event | null = null;
      
      if (!recurrenceConfig.enabled) {
        // Solo crear evento local para eventos NO recurrentes
        localId = Date.now().toString();
        newEvent = {
          id: localId,
          title: eventTitle,
          description: eventDescription,
          startTime: finalStartTime,
          duration: 30,
          color: eventColor,
          category: 'General',
          date: finalDateKey,
          is_recurring: false,
          recurrence_rule: null,
          recurrence_end_date: null
        };
        setEvents(prev => [...prev, newEvent!]);
      }

      // Persistencia API con reconciliación de ID
      try {
        // Calcular fechas base usando fecha/hora personalizada si existe
        // 🔧 FIX: Convertir finalStartTime (en minutos desde userStartHour) a minutos desde START_HOUR
        const finalStartTimeFromStartHour = finalStartTime + (userStartHour - START_HOUR) * 60;
        const finalEndTimeFromStartHour = (finalStartTime + 30) + (userStartHour - START_HOUR) * 60;
        
        const baseStartLocal = dateKeyToLocalDate(finalDateKey, finalStartTimeFromStartHour);
        const baseEndLocal = dateKeyToLocalDate(finalDateKey, finalEndTimeFromStartHour);
        
        // Ajustar start_utc si es un evento recurrente
        let finalStartLocal = baseStartLocal;
        let finalEndLocal = baseEndLocal;
        
        if (recurrenceConfig.enabled) {
          const recurrenceRule = {
            frequency: recurrenceConfig.mode.toUpperCase(),
            interval: recurrenceConfig.interval,
            byWeekDays: recurrenceConfig.weekDays,
            byMonthDays: recurrenceConfig.monthDays
          };
          
          const adjustedStart = adjustStartDateToRecurrenceRule(baseStartLocal, recurrenceRule);
          const duration = baseEndLocal.getTime() - baseStartLocal.getTime();
          finalStartLocal = adjustedStart;
          finalEndLocal = new Date(adjustedStart.getTime() + duration);
          
        }
        // Obtener calendar_id válido
        const calJson = await apiGetCalendars();
        const calendarId = calJson?.data?.[0]?.id;
        if (!calendarId) throw new Error('No hay calendars disponibles');

        // Crear regla de recurrencia si está habilitada
        let recurrenceRule: RecurrenceRule | null = null;
        if (recurrenceConfig.enabled) {
          recurrenceRule = {
            frequency: recurrenceConfig.mode.toUpperCase(), // 'DAILY', 'WEEKLY', 'MONTHLY'
            interval: recurrenceConfig.interval,
          };

          if (recurrenceConfig.mode === 'weekly' && recurrenceConfig.weekDays.length > 0) {
            recurrenceRule.byWeekDays = recurrenceConfig.weekDays;
          }

          if (recurrenceConfig.mode === 'monthly' && recurrenceConfig.monthDays.length > 0) {
            recurrenceRule.byMonthDays = recurrenceConfig.monthDays;
          }
          
        } else {

        }

        const payload = {
          calendar_id: calendarId,
          title: eventTitle,
          description: eventDescription,
          start_utc: finalStartLocal.toISOString(),
          end_utc: finalEndLocal.toISOString(),
          color: eventColor,
          is_recurring: recurrenceConfig.enabled,
          recurrence_rule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
          recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null,
        };
        
        const res = await apiPostEvent(payload);
        const createdEvent = await res.json();
        
        if (res.ok && createdEvent?.data?.id) {
          const newEventId = createdEvent.data.id.toString();
          
          // Guardar subtareas temporales para el evento recién creado
          if (subtasks.length > 0) {
            try {
              const tempSubtasks = subtasks.filter(subtask => subtask.id.startsWith('temp-'));
              for (let i = 0; i < tempSubtasks.length; i++) {
                const tempSubtask = tempSubtasks[i];
                // Crear subtarea con el estado completado preservado
                const response = await apiCreateSubtask(newEventId, tempSubtask.text, i, tempSubtask.completed);
                if (response.ok) {
                  const result = await response.json();
                  // Si la subtarea estaba completada, actualizarla después de crearla
                  if (tempSubtask.completed && !result.data.completed) {
                    await apiUpdateSubtask(result.data.id.toString(), { completed: true });
                  }
                  
                  // Reemplazar la subtarea temporal con la real
                  const updatedSubtasks = subtasks.map(subtask => 
                    subtask.id === tempSubtask.id 
                      ? {
                          id: result.data.id.toString(),
                          text: result.data.text,
                          completed: tempSubtask.completed // Preservar el estado completado original
                        }
                      : subtask
                  );
                  setSubtasks(updatedSubtasks);
                  
                  // Actualizar caché para el nuevo evento
                  setSubtasksCache(prev => ({
                    ...prev,
                    [newEventId]: updatedSubtasks
                  }));
                }
              }
            } catch (error) {
              console.error('Error al guardar subtareas del evento nuevo:', error);
            }
          }
          
          if (recurrenceConfig.enabled) {
            // Para eventos recurrentes, solo refrescar desde el servidor
            await refreshEvents();
          } else if (localId && newEvent) {
            // Para eventos no recurrentes, reemplazar el evento temporal
            const finalEvent: Event = {
              id: newEventId,
              title: createdEvent.data.title,
              description: createdEvent.data.description,
              color: createdEvent.data.color,
              date: dateKey,
              startTime: selectedCell.startTime,
              duration: 30,
              category: 'General',
              is_recurring: false,
              recurrence_rule: null,
              recurrence_end_date: null
            };

            setEvents(prev => [...prev.filter(e => e.id !== localId), finalEvent]);
          }
        } else {
          Alert.alert('Aviso', 'El evento se creó localmente pero no en el servidor.');
        }
      } catch (e) {
        console.error('Error creating event:', e);
        Alert.alert('Aviso', 'No se pudo crear el evento en el servidor.');
      }

    } else if (selectedMonthCell) {
      // Crear nuevo month event en API
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const tempMonthEvent: MonthEvent = {
          id: Date.now().toString(),
          title: eventTitle,
          description: eventDescription,
          startDay: selectedMonthCell.day,
          duration: 1,
          color: eventColor,
          category: 'General',
          year,
          month,
        };
        
        const backendData = monthEventFrontendToBackend(tempMonthEvent);
        const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
        if (!calendarId) throw new Error('No hay calendars disponibles');
        
        const payload = {
          calendar_id: calendarId,
          title: eventTitle,
          description: eventDescription,
          color: eventColor,
          ...backendData,
        };
        
        const res = await apiPostMonthEvent(payload);
        const createdEvent = await res.json();
        
        if (res.ok && createdEvent?.data?.id) {
          await refreshMonthEvents();
        } else {
          Alert.alert('Aviso', 'El evento se creó localmente pero no en el servidor.');
        }
      } catch (e) {
        Alert.alert('Error', 'No se pudo crear el evento en el servidor.');
      }
    }

    // Limpiar modal
    setModalVisible(false);
    setEventTitle('');
    setEventDescription('');
    setSelectedEvent(null);
    setSelectedCell(null);
    setSelectedMonthCell(null);
    // Limpiar subtareas
    setSubtasks([]);
    setNewSubtaskText('');
    setShowSubtaskInput(false);
    // NO resetear recurrenceConfig aquí - se mantiene para próximos eventos
  }, [eventTitle, eventDescription, eventColor, selectedEvent, selectedCell, selectedMonthCell, currentView, currentDate, recurrenceConfig, subtasks, migrateSubtasks, monthEventFrontendToBackend, refreshMonthEvents, getRandomColor, tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext, calendarTutorialSteps]);

  // Scroll automático al día actual cuando se entra a la vista semanal
  useEffect(() => {
    if (currentView === 'week' && contentHorizontalRef.current) {
      // Calcular el día de la semana actual
      const weekStart = startOfWeek(currentDate);
      const today = new Date();
      const todayDateKey = today.toDateString();
      
      // Encontrar el índice del día actual en la semana (0-6)
      let dayIndex = -1;
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        if (dayDate.toDateString() === todayDateKey) {
          dayIndex = i;
          break;
        }
      }
      
      // Si encontramos el día actual en esta semana, hacer scroll
      if (dayIndex >= 0) {
        // Pequeño delay para asegurar que el layout esté listo
        setTimeout(() => {
          const cellWidth = getCellWidth();
          // Calcular la posición de scroll para centrar el día actual (o al menos mostrarlo)
          // Intentamos centrarlo, pero si está al inicio o al final, ajustamos
          const screenWidth = width - 60; // Ancho disponible (menos columna de horas)
          const scrollPosition = Math.max(0, (dayIndex * cellWidth) - (screenWidth / 2) + (cellWidth / 2));
          
          contentHorizontalRef.current?.scrollTo({
            x: scrollPosition,
            animated: true
          });
          
          // También sincronizar el header
          headerHorizontalRef.current?.scrollTo({
            x: scrollPosition,
            animated: true
          });
        }, 100);
      }
    }
  }, [currentView, currentDate, startOfWeek, addDays, getCellWidth, width]);

  // ===== NAVEGACIÓN =====
  const navigateDate = useCallback(async (direction: 'prev' | 'next') => {
    console.log('🧭 navigateDate - START', { 
      direction, 
      currentView, 
      currentDate: currentDate.toISOString().slice(0, 10),
      eventsCount: events.length,
      timestamp: new Date().toISOString()
    });
    
    if (currentView === 'day') {
      const newDate = addDays(currentDate, direction === 'next' ? 1 : -1);
      console.log('🧭 navigateDate - Day navigation', { 
        oldDate: currentDate.toISOString().slice(0, 10),
        newDate: newDate.toISOString().slice(0, 10)
      });
      setCurrentDate(newDate);
      // Reset de scrolls
      verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });
      
      // Calcular la semana del nuevo día para cargar toda la semana
      const newWeekStart = startOfWeek(newDate);
      console.log('🧭 navigateDate - Day week calculation', { 
        newDate: newDate.toISOString().slice(0, 10),
        newWeekStart: newWeekStart.toISOString().slice(0, 10)
      });
      
      // Cargar eventos y subtareas para toda la semana del nuevo día
      setTimeout(async () => {
        console.log('🧭 navigateDate - Loading events and subtasks for new day week');
        
        // Calcular el rango de la semana del nuevo día
        const newWeekEnd = addDays(newWeekStart, 6);
        const rangeStart = new Date(newWeekStart);
        rangeStart.setDate(rangeStart.getDate() - 7); // 1 semana atrás para capturar eventos recurrentes
        const rangeEnd = new Date(newWeekEnd);
        rangeEnd.setDate(rangeEnd.getDate() + 30); // 1 mes adelante
        
        // Cargar eventos de la semana del nuevo día
        const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
        if (fetched) {
          setEvents(fetched);
          // Ahora cargar las subtareas con los nuevos eventos
          await loadAllEventsSubtasks(fetched, true, newWeekStart);
        }
      }, 200);
      return;
    }

    if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const newWeekStart = addDays(weekStart, direction === 'next' ? 7 : -7);
      console.log('🧭 navigateDate - Week navigation', { 
        oldWeekStart: weekStart.toISOString().slice(0, 10),
        newWeekStart: newWeekStart.toISOString().slice(0, 10)
      });
      setCurrentDate(newWeekStart);
      // Reset de scroll horizontal/vertical
      setTimeout(() => {
        contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });
        headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
        verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
        
        // Cargar eventos y subtareas para la nueva semana después del scroll
        setTimeout(async () => {
          console.log('🧭 navigateDate - Loading events and subtasks for new week');
          
          // Calcular el rango de la nueva semana
          const newWeekEnd = addDays(newWeekStart, 6);
          const rangeStart = new Date(newWeekStart);
          rangeStart.setDate(rangeStart.getDate() - 7); // 1 semana atrás para capturar eventos recurrentes
          const rangeEnd = new Date(newWeekEnd);
          rangeEnd.setDate(rangeEnd.getDate() + 30); // 1 mes adelante
          
          // Cargar eventos de la nueva semana
          const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
          if (fetched) {
            setEvents(fetched);
            // Ahora cargar las subtareas con los nuevos eventos
            await loadAllEventsSubtasks(fetched, true, newWeekStart);
          }
        }, 200);
      }, 20);
      return;
    }

    if (currentView === 'month') {
      const newDate = addMonths(currentDate, direction === 'next' ? 1 : -1);
      setCurrentDate(newDate);
      setTimeout(() => {
        verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
        contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });
        headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      }, 20);
      
      // Cargar month events para el nuevo mes
      setTimeout(async () => {
        const year = newDate.getFullYear();
        const month = newDate.getMonth();
        const fetched = await fetchMonthEvents(year, month);
        setMonthEvents(fetched);
      }, 100);
      return;
    }

    if (currentView === 'year') {
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
      setCurrentDate(newDate);
      
      // Cargar eventos del nuevo año
      setTimeout(async () => {
        const year = newDate.getFullYear();
        const fetched = await fetchYearEvents(year);
        setYearEvents(fetched);
      }, 100);
      return;
    }
  }, [currentView, currentDate, addDays, addMonths, startOfWeek, loadAllEventsSubtasks, events, fetchMonthEvents, fetchYearEvents]);

  // Función para recargar colores de subtareas (extraída del botón de recarga)
  const refreshSubtasksColors = useCallback(() => {
    loadAllEventsSubtasks(events, true).then(() => {
      // console.log('🔄 refreshSubtasksColors - COMPLETE');
    }).catch((error) => {
      console.log('🔄 refreshSubtasksColors - Error:', error instanceof Error ? error.message : String(error));
    });
  }, [loadAllEventsSubtasks, events]);

  // Función para recargar con delay (para evitar conflictos con la DB)
  const refreshSubtasksColorsWithDelay = useCallback(() => {
    setTimeout(() => {
      refreshSubtasksColors();
    }, 3000); // 3 segundos de delay
  }, [refreshSubtasksColors]);

  // Cambio de vista desde los botones superiores
  // - Si elige 'day' volvemos al día de hoy
  // - Reset de scrolls
  const onChangeView = useCallback((view: 'day'|'week'|'month'|'year') => {
    // Prevenir cambiar de vista durante el tutorial si estamos en un paso que requiere acción
    // EXCEPTO si el objetivo es cambiar de vista (switch-to-day-view, switch-to-month-view, switch-to-year-view)
    if (tutorialVisible && !tutorialCompleted) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      const allowedObjectives = ['switch-to-day-view', 'switch-to-month-view', 'switch-to-year-view'];
      if (currentStepData?.actionRequired && 
          currentStepData?.objective !== 'none' && 
          !allowedObjectives.includes(currentStepData?.objective)) {
        console.log('⚠️ Tutorial: No se puede cambiar de vista durante este paso del tutorial');
        return; // No permitir cambiar de vista
      }
    }
    
    setCurrentView(view);
    if (view === 'day') {
      setCurrentDate(new Date());
    }
    setTimeout(() => {
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
    }, 20);
  }, [tutorialVisible, tutorialCompleted, tutorialStep]);

  // Sincronizar header horizontal con contenido (semana)
  const handleHorizontalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset?.x || 0;
    horizontalOffsetRef.current = x;
    headerHorizontalRef.current?.scrollTo({ x, animated: false });
  }, []);

  // Al cambiar currentView/currentDate, resetear offsets post-render
  useEffect(() => {
    setTimeout(() => {
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 20);
  }, [currentView, currentDate]);

  // Callback de commit desde bloque redimensionable
  const onResizeCommit = useCallback(async (eventToUpdate: Event, newStartTime: number, newDuration: number) => {
    const eventId = eventToUpdate.id; // ID actual, ya sea temporal o real

    console.log('🔧 onResizeCommit: INICIO', {
      eventId,
      eventStartTime: eventToUpdate.startTime,
      eventDuration: eventToUpdate.duration,
      newStartTime,
      newDuration,
      userStartHour,
      START_HOUR,
      diferencia: userStartHour - START_HOUR,
      eventTitle: eventToUpdate.title,
      eventColor: eventToUpdate.color
    });

    // 🔥 CRÍTICO: Preservar campos de subtareas del evento original
    const originalSubtasksCount = eventToUpdate.subtasks_count;
    const originalSubtasksCompletedCount = eventToUpdate.subtasks_completed_count;

    // Detectar si el tutorial está esperando resize-event
    if (tutorialVisible && !tutorialCompleted && calendarTutorialSteps && calendarTutorialSteps.length > tutorialStep) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      if (currentStepData?.objective === 'resize-event' && tutorialObjectiveCompletedRef.current !== 'resize-event') {
        console.log('✅ Objetivo cumplido: resize-event');
        tutorialObjectiveCompletedRef.current = 'resize-event';
        if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
        tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
      }
    }

    if (resizeLockRef.current.has(eventId)) {
      console.log('⚠️ onResizeCommit: Evento ya está en proceso de resize, ignorando');
      return;
    }
    resizeLockRef.current.add(eventId);

    // 1. Actualización optimista de la UI (para que se vea instantáneo)
    // 🔥 CRÍTICO: Preservar TODOS los campos del evento original (título, color, etc.)
    setEvents(prev => {
      const oldEvent = prev.find(ev => ev.id === eventId);
      const updatedEvents = prev.map(ev => ev.id === eventId ? { 
        ...ev, 
        startTime: newStartTime, 
        duration: newDuration,
        // 🔧 FIX: Preservar título y color explícitamente
        title: eventToUpdate.title || ev.title,
        color: eventToUpdate.color || ev.color,
        description: eventToUpdate.description ?? ev.description,
        category: eventToUpdate.category || ev.category,
        // Preservar campos de subtareas
        subtasks_count: originalSubtasksCount !== undefined ? originalSubtasksCount : ev.subtasks_count,
        subtasks_completed_count: originalSubtasksCompletedCount !== undefined ? originalSubtasksCompletedCount : ev.subtasks_completed_count
      } : ev);
      
      if (oldEvent && oldEvent.duration !== newDuration) {
        console.log('🔧 onResizeCommit: Duración actualizada en estado', {
          eventId,
          oldDuration: oldEvent.duration,
          newDuration
        });
      }
      
      return updatedEvents;
    });

    // 🔧 FIX: Convertir newStartTime (en minutos desde userStartHour) a minutos desde START_HOUR para dateKeyToLocalDate
    // newStartTime está en minutos desde userStartHour, necesitamos convertir a minutos desde START_HOUR
    const startTimeFromStartHour = newStartTime + (userStartHour - START_HOUR) * 60;
    const endTimeFromStartHour = (newStartTime + newDuration) + (userStartHour - START_HOUR) * 60;
    
    console.log('🔧 onResizeCommit: Conversión de tiempo', {
      eventId: eventToUpdate.id,
      newStartTime,
      newDuration,
      userStartHour,
      START_HOUR,
      startTimeFromStartHour,
      endTimeFromStartHour,
      horaCalculada: `${Math.floor(startTimeFromStartHour / 60)}:${startTimeFromStartHour % 60}`,
      horaFinalCalculada: `${Math.floor(endTimeFromStartHour / 60)}:${endTimeFromStartHour % 60}`
    });
    
    const startLocal = dateKeyToLocalDate(eventToUpdate.date, startTimeFromStartHour);
    const endLocal = dateKeyToLocalDate(eventToUpdate.date, endTimeFromStartHour);
    
    console.log('🔧 onResizeCommit: Fechas UTC calculadas', {
      eventId: eventToUpdate.id,
      startLocal: startLocal.toISOString(),
      endLocal: endLocal.toISOString(),
      startHour: startLocal.getUTCHours(),
      startMinute: startLocal.getUTCMinutes(),
      endHour: endLocal.getUTCHours(),
      endMinute: endLocal.getUTCMinutes()
    });


    try {
        // 🔍 DETECTAR SI ES INSTANCIA GENERADA DE SERIE RECURRENTE
        const match = String(eventToUpdate.id).match(/^(\d+)_(\d{4}-\d{2}-\d{2})$/);
        const isGeneratedInstance = !!match;
        

        if (isGeneratedInstance) {
            // 📝 CREAR OVERRIDE PARA INSTANCIA GENERADA
            
            const seriesId = parseInt(match[1], 10);
            
            // Calcular original_start_utc usando zona horaria de la serie
            // 🔧 FIX: Convertir eventToUpdate.startTime (en minutos desde userStartHour) a minutos desde START_HOUR
            const originalStartTimeFromStartHour = eventToUpdate.startTime + (userStartHour - START_HOUR) * 60;
            const originalDate = eventToUpdate.date; // YYYY-MM-DD
            const originalStartLocal = dateKeyToLocalDate(originalDate, originalStartTimeFromStartHour);
            const originalStartUtc = originalStartLocal.toISOString();
            

            // Obtener calendar_id
            const calJson = await apiGetCalendars();
            const calendarId = calJson?.data?.[0]?.id;
            if (!calendarId) throw new Error('No calendars available');

            // Crear payload para override
            // 🔥 CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)
            const hasSubtasks = (originalSubtasksCount !== undefined && originalSubtasksCount > 0) || 
                               (eventToUpdate.subtasks_count !== undefined && eventToUpdate.subtasks_count > 0);
            
            const overridePayload: any = {
                calendar_id: calendarId,
                title: eventToUpdate.title,
                description: eventToUpdate.description,
                start_utc: startLocal.toISOString(),
                end_utc: endLocal.toISOString(),
                location: eventToUpdate.location || null,
                is_recurring: false, // Override no es recurrente
                series_id: seriesId,
                original_start_utc: originalStartUtc
            };
            
            // Solo incluir color si NO hay subtareas
            if (!hasSubtasks) {
                overridePayload.color = eventToUpdate.color;
            }

            const createRes = await apiPostEvent(overridePayload);
            const body = await createRes.json();

            if (createRes.ok && body?.data?.id) {
                const overrideId = String(body.data.id);

                // 🔥 CRÍTICO: Migrar subtareas del evento original al override
                // Para instancias generadas, pasar el eventId original (instancia generada) para obtener estados de instancia
                try {
                  const eventWithSeriesId = {
                    ...eventToUpdate,
                    series_id: seriesId,
                    is_recurring: false
                  };
                  // Construir el evento nuevo con series_id para que migrateSubtasks pueda cargar las subtareas correctamente
                  const newEventWithSeriesId: Event = {
                    ...eventToUpdate,
                    id: overrideId,
                    series_id: seriesId,
                    is_recurring: false,
                    startTime: newStartTime,
                    duration: newDuration
                  };
                  // Pasar el eventId original (instancia generada) para obtener subtareas con estados de instancia
                  await migrateSubtasks(eventId, overrideId, eventWithSeriesId, newEventWithSeriesId);
                } catch (migrationError) {
                  console.log('⚠️ Error migrando subtareas en resize:', migrationError);
                }

                // Reemplazar la instancia temporal con el override del servidor
                // 🔥 CRÍTICO: Preservar campos de subtareas y series_id al reemplazar
                setEvents(prev => prev.map(e => 
                    e.id === eventId 
                        ? { 
                            ...e, 
                            id: overrideId, 
                            is_recurring: false,
                            series_id: seriesId, // 🔧 FIX: Preservar series_id para que loadSubtasks detecte como instancia
                            // Preservar campos de subtareas (se recargarán después)
                            subtasks_count: originalSubtasksCount,
                            subtasks_completed_count: originalSubtasksCompletedCount
                          }
                        : e
                ));

                // 🔥 CRÍTICO: Recargar conteos de subtareas después de crear override
                setTimeout(async () => {
                  try {
                    // Obtener el evento actualizado para pasarlo a loadSubtasks
                    const currentEvent = eventsRef.current.find(e => e.id === overrideId);
                    console.log('🔧 onResizeCommit - Recargando subtareas', {
                      overrideId,
                      hasSeriesId: !!currentEvent?.series_id,
                      seriesId: currentEvent?.series_id
                    });
                    
                    // Recargar subtareas directamente para actualizar los conteos
                    // Pasar el evento actualizado para que loadSubtasks detecte correctamente como instancia
                    await loadSubtasks(overrideId, currentEvent || undefined, true);
                    // Esperar un momento para que el estado se actualice
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Actualizar el estado con los conteos actualizados desde el cache
                    // Usar una función de actualización que lea el cache actual
                    setEvents(prev => {
                      // Leer el cache actual en el momento de la actualización
                      const currentCache = subtasksCache[overrideId];
                      if (currentCache) {
                        const total = currentCache.length;
                        const completed = currentCache.filter((st: any) => st.completed).length;
                        console.log('🔧 onResizeCommit - Actualizando conteos de subtareas', {
                          overrideId,
                          total,
                          completed,
                          seriesId: prev.find(e => e.id === overrideId)?.series_id
                        });
                        return prev.map(e => {
                          if (e.id === overrideId) {
                            return {
                              ...e,
                              subtasks_count: total,
                              subtasks_completed_count: completed,
                              // 🔧 FIX: Asegurar que series_id se preserve
                              series_id: e.series_id || seriesId
                            };
                          }
                          return e;
                        });
                      }
                      return prev;
                    });
                  } catch (error) {
                    console.log('⚠️ Error recargando conteos de subtareas:', error);
                  }
                }, 500);
            } else {
                throw new Error(`Override creation failed: ${JSON.stringify(body)}`);
            }
        } else {
            // 🔄 FLUJO NORMAL: Evento existente en servidor
            const res = await apiPutEventTimes(eventId, startLocal.toISOString(), endLocal.toISOString());

            if (res.status === 404) {
                // FALLBACK: El evento no existía en el servidor, lo creamos
                const calJson = await apiGetCalendars();
                const calendarId = calJson?.data?.[0]?.id;
                if (!calendarId) throw new Error('No calendars available');

                // 🔥 CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)
                const hasSubtasks = (originalSubtasksCount !== undefined && originalSubtasksCount > 0) || 
                                   (eventToUpdate.subtasks_count !== undefined && eventToUpdate.subtasks_count > 0);
                
                const payload: any = {
                    calendar_id: calendarId,
                    title: eventToUpdate.title,
                    description: eventToUpdate.description,
                    start_utc: startLocal.toISOString(),
                    end_utc: endLocal.toISOString(),
                };
                
                // Solo incluir color si NO hay subtareas
                if (!hasSubtasks) {
                    payload.color = eventToUpdate.color;
                }
                const createRes = await apiPostEvent(payload);
                const body = await createRes.json();

                if (createRes.ok && body?.data?.id) {
                    const serverId = String(body.data.id);

                    // Reemplazamos el ID temporal por el ID del servidor EN el evento que ya habíamos actualizado
                    // 🔥 CRÍTICO: Preservar campos de subtareas
                    setEvents(prev => prev.map(e => (e.id === eventId ? { 
                      ...e, 
                      id: serverId,
                      subtasks_count: originalSubtasksCount,
                      subtasks_completed_count: originalSubtasksCompletedCount
                    } : e)));

                    // Reintentamos el guardado de la hora correcta con el nuevo ID
                    const retryRes = await apiPutEventTimes(serverId, startLocal.toISOString(), endLocal.toISOString());
                    if (!retryRes.ok) throw new Error('Failed to update after fallback create');

                    // 🔥 CRÍTICO: Recargar conteos de subtareas después de actualizar
                    setTimeout(async () => {
                      try {
                        await loadSubtasks(serverId, undefined, true);
                      } catch (error) {
                        console.log('⚠️ Error recargando conteos de subtareas:', error);
                      }
                    }, 500);
                } else {
                    throw new Error('Fallback POST failed');
                }
            } else if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            } else {
                // 🔥 CRÍTICO: Recargar conteos de subtareas después de actualizar evento existente
                setTimeout(async () => {
                  try {
                    await loadSubtasks(eventId, eventToUpdate, true);
                  } catch (error) {
                    console.log('⚠️ Error recargando conteos de subtareas:', error);
                  }
                }, 500);
            }
        }
    } catch (e) {
        Alert.alert('Error', 'No se pudo guardar el cambio. Reintentando...');
        // Revertimos al estado original del bloque antes del estiramiento
        setEvents(prev => prev.map(ev => ev.id === eventId ? eventToUpdate : ev));
    } finally {
        resizeLockRef.current.delete(eventId);
    }
  }, [migrateSubtasks, loadSubtasks, subtasksCache, tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext, userStartHour]);

  // Callback de commit desde bloque movible
  const onMoveCommit = useCallback(async (eventToUpdate: Event, newStartTime: number, newDate: string) => {
    const eventId = eventToUpdate.id;

    // 🔥 CRÍTICO: Preservar campos de subtareas del evento original
    const originalSubtasksCount = eventToUpdate.subtasks_count;
    const originalSubtasksCompletedCount = eventToUpdate.subtasks_completed_count;

    // Detectar si el tutorial está esperando drag-event
    if (tutorialVisible && !tutorialCompleted && calendarTutorialSteps && calendarTutorialSteps.length > tutorialStep) {
      const currentStepData = calendarTutorialSteps[tutorialStep] as any;
      if (currentStepData?.objective === 'drag-event' && tutorialObjectiveCompletedRef.current !== 'drag-event') {
        tutorialObjectiveCompletedRef.current = 'drag-event';
        if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
        tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
      }
    }

    if (resizeLockRef.current.has(eventId)) {
      return;
    }
    resizeLockRef.current.add(eventId);

    // 🔧 FIX: Leer la duración actualizada del estado en lugar de usar eventToUpdate.duration
    // Esto asegura que si hubo un resize antes del drag, se use la duración correcta
    const currentEvent = eventsRef.current.find(ev => ev.id === eventId);
    const currentDuration = currentEvent?.duration ?? eventToUpdate.duration;
    
    if (currentEvent && currentEvent.duration !== eventToUpdate.duration) {
      console.log('🔧 onMoveCommit: Duración actualizada detectada', {
        eventId,
        oldDuration: eventToUpdate.duration,
        newDuration: currentEvent.duration
      });
    }

    // 1. Actualización optimista de la UI
    // 🔥 CRÍTICO: Preservar campos de subtareas en la actualización optimista
    setEvents(prev => prev.map(ev => 
      ev.id === eventId 
        ? { 
            ...ev, 
            startTime: newStartTime, 
            date: newDate,
            // Preservar campos de subtareas
            subtasks_count: originalSubtasksCount !== undefined ? originalSubtasksCount : ev.subtasks_count,
            subtasks_completed_count: originalSubtasksCompletedCount !== undefined ? originalSubtasksCompletedCount : ev.subtasks_completed_count
          }
        : ev
    ));

    // Calcular nuevos timestamps UTC usando la duración actualizada
    // 🔧 FIX: Convertir newStartTime (en minutos desde userStartHour) a minutos desde START_HOUR para dateKeyToLocalDate
    const startTimeFromStartHour = newStartTime + (userStartHour - START_HOUR) * 60;
    const endTimeFromStartHour = (newStartTime + currentDuration) + (userStartHour - START_HOUR) * 60;
    
    const startLocal = dateKeyToLocalDate(newDate, startTimeFromStartHour);
    const endLocal = dateKeyToLocalDate(newDate, endTimeFromStartHour);
    
    console.log('🔧 onMoveCommit: Calculando endLocal', {
      eventId,
      newStartTime,
      currentDuration,
      endTime: newStartTime + currentDuration
    });

    try {
      // Detectar si es instancia generada
      const match = String(eventToUpdate.id).match(/^(\d+)_(\d{4}-\d{2}-\d{2})$/);
      const isGeneratedInstance = !!match;

      if (isGeneratedInstance) {
        // Crear override para instancia generada
        const seriesId = parseInt(match[1], 10);
        
        // Calcular original_start_utc usando zona horaria correcta
        // 🔧 FIX: Convertir eventToUpdate.startTime (en minutos desde userStartHour) a minutos desde START_HOUR
        const originalStartTimeFromStartHour = eventToUpdate.startTime + (userStartHour - START_HOUR) * 60;
        const originalDate = eventToUpdate.date; // YYYY-MM-DD
        const originalStartLocal = dateKeyToLocalDate(originalDate, originalStartTimeFromStartHour);
        const originalStartUtc = originalStartLocal.toISOString();
        
        
        const calJson = await apiGetCalendars();
        const calendarId = calJson?.data?.[0]?.id;
        if (!calendarId) throw new Error('No calendars available');

        // 🔥 CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)
        const hasSubtasks = (originalSubtasksCount !== undefined && originalSubtasksCount > 0) || 
                           (eventToUpdate.subtasks_count !== undefined && eventToUpdate.subtasks_count > 0);
        
        const overridePayload: any = {
          calendar_id: calendarId,
          title: eventToUpdate.title,
          description: eventToUpdate.description,
          start_utc: startLocal.toISOString(),
          end_utc: endLocal.toISOString(),
          location: eventToUpdate.location || null,
          is_recurring: false,
          series_id: seriesId,
          original_start_utc: originalStartUtc
        };
        
        // Solo incluir color si NO hay subtareas
        if (!hasSubtasks) {
          overridePayload.color = eventToUpdate.color;
        }

        const createRes = await apiPostEvent(overridePayload);
        const body = await createRes.json();

        if (createRes.ok && body?.data?.id) {
          const overrideId = String(body.data.id);

          // 🔥 CRÍTICO: Migrar subtareas del evento original al override
          // Para instancias generadas, pasar el eventId original (instancia generada) para obtener estados de instancia
          try {
            const eventWithSeriesId = {
              ...eventToUpdate,
              series_id: seriesId,
              is_recurring: false
            };
            // Construir el evento nuevo con series_id para que migrateSubtasks pueda cargar las subtareas correctamente
            const newEventWithSeriesId: Event = {
              ...eventToUpdate,
              id: overrideId,
              series_id: seriesId,
              is_recurring: false,
              startTime: newStartTime,
              date: newDate
            };
            // Pasar el eventId original (instancia generada) para obtener subtareas con estados de instancia
            await migrateSubtasks(eventId, overrideId, eventWithSeriesId, newEventWithSeriesId);
          } catch (migrationError) {
            console.log('⚠️ Error migrando subtareas en move:', migrationError);
          }

          // 🔥 CRÍTICO: Preservar campos de subtareas y series_id al reemplazar
          setEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { 
                  ...e, 
                  id: overrideId, 
                  is_recurring: false,
                  series_id: seriesId, // 🔧 FIX: Preservar series_id para que loadSubtasks detecte como instancia
                  // Preservar campos de subtareas (se recargarán después)
                  subtasks_count: originalSubtasksCount,
                  subtasks_completed_count: originalSubtasksCompletedCount
                }
              : e
          ));

          // 🔥 CRÍTICO: Recargar conteos de subtareas después de crear override
          setTimeout(async () => {
            try {
              // Obtener el evento actualizado para pasarlo a loadSubtasks
              const currentEvent = eventsRef.current.find(e => e.id === overrideId);
              console.log('🔧 onMoveCommit - Recargando subtareas', {
                overrideId,
                hasSeriesId: !!currentEvent?.series_id,
                seriesId: currentEvent?.series_id
              });
              
              // Recargar subtareas directamente para actualizar los conteos
              // Pasar el evento actualizado para que loadSubtasks detecte correctamente como instancia
              await loadSubtasks(overrideId, currentEvent || undefined, true);
              // Esperar un momento para que el estado se actualice
              await new Promise(resolve => setTimeout(resolve, 100));
              // Actualizar el estado con los conteos actualizados desde el cache
              // Usar una función de actualización que lea el cache actual
              setEvents(prev => {
                // Leer el cache actual en el momento de la actualización
                const currentCache = subtasksCache[overrideId];
                if (currentCache) {
                  const total = currentCache.length;
                  const completed = currentCache.filter((st: any) => st.completed).length;
                  console.log('🔧 onMoveCommit - Actualizando conteos de subtareas', {
                    overrideId,
                    total,
                    completed,
                    seriesId: prev.find(e => e.id === overrideId)?.series_id
                  });
                  return prev.map(e => {
                    if (e.id === overrideId) {
                      return {
                        ...e,
                        subtasks_count: total,
                        subtasks_completed_count: completed,
                        // 🔧 FIX: Asegurar que series_id se preserve
                        series_id: e.series_id || seriesId
                      };
                    }
                    return e;
                  });
                }
                return prev;
              });
            } catch (error) {
              console.log('⚠️ Error recargando conteos de subtareas:', error);
            }
          }, 500);
        } else {
          throw new Error(`Move override creation failed: ${JSON.stringify(body)}`);
        }
      } else {
        // Evento existente - actualizar directamente
        const res = await apiPutEventTimes(eventId, startLocal.toISOString(), endLocal.toISOString());
        
        if (res.status === 404) {
          // Fallback: crear nuevo evento
          const calJson = await apiGetCalendars();
          const calendarId = calJson?.data?.[0]?.id;
          if (!calendarId) throw new Error('No calendars available');

          // 🔥 CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)
          const hasSubtasks = (originalSubtasksCount !== undefined && originalSubtasksCount > 0) || 
                             (eventToUpdate.subtasks_count !== undefined && eventToUpdate.subtasks_count > 0);
          
          const payload: any = {
            calendar_id: calendarId,
            title: eventToUpdate.title,
            description: eventToUpdate.description,
            start_utc: startLocal.toISOString(),
            end_utc: endLocal.toISOString(),
          };
          
          // Solo incluir color si NO hay subtareas
          if (!hasSubtasks) {
            payload.color = eventToUpdate.color;
          }
          
          const createRes = await apiPostEvent(payload);
          const body = await createRes.json();

          if (createRes.ok && body?.data?.id) {
            const serverId = String(body.data.id);
            // 🔥 CRÍTICO: Preservar campos de subtareas
            setEvents(prev => prev.map(e => (e.id === eventId ? { 
              ...e, 
              id: serverId,
              subtasks_count: originalSubtasksCount,
              subtasks_completed_count: originalSubtasksCompletedCount
            } : e)));

            // 🔥 CRÍTICO: Recargar conteos de subtareas después de crear evento
            setTimeout(async () => {
              try {
                await loadSubtasks(serverId, undefined, true);
              } catch (error) {
                console.log('⚠️ Error recargando conteos de subtareas:', error);
              }
            }, 500);
          } else {
            throw new Error('Fallback POST failed');
          }
        } else if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        } else {
          // 🔥 CRÍTICO: Recargar conteos de subtareas después de actualizar evento existente
          setTimeout(async () => {
            try {
              await loadSubtasks(eventId, eventToUpdate, true);
            } catch (error) {
              console.log('⚠️ Error recargando conteos de subtareas:', error);
            }
          }, 500);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo mover el evento. Reintentando...');
      // Revertir cambios
      setEvents(prev => prev.map(ev => ev.id === eventId ? eventToUpdate : ev));
    } finally {
      resizeLockRef.current.delete(eventId);
    }
  }, [migrateSubtasks, loadSubtasks, subtasksCache, userStartHour]); // 🔥 CRÍTICO: Agregar dependencias necesarias

  // Función para identificar el tipo de evento
  const getEventType = (event: Event): string => {
    // Instancia generada (cuadradito de serie)
    if (typeof event.id === 'string' && event.id.includes('_')) {
      return 'INSTANCIA_GENERADA';
    }
    
    // Override (evento liberado)
    if (event.series_id && event.original_start_utc) {
      return 'OVERRIDE';
    }
    
    // Serie original
    if (event.is_recurring) {
      return 'SERIE_ORIGINAL';
    }
    
    // Evento único
    return 'EVENTO_UNICO';
  };

  // Callback para abrir modal al hacer click rápido en evento
  const onQuickPress = useCallback((event: Event) => {
    console.log('👆 onQuickPress - Event tapped', {
      eventId: event.id,
      title: event.title,
      is_recurring: event.is_recurring,
      series_id: event.series_id,
      original_start_utc: event.original_start_utc
    });
    
    // 🟣 TOUCH_EVENT - EventResizableBlock
    const timestamp = new Date().toISOString();

    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventColor(event.color);
    setRecurrenceConfig(extractRecurrenceFromEvent(event));
    setModalVisible(true);
    
    // Cargar subtareas del evento (siempre forzar reload para ver cambios recientes)
    console.log('📋 onQuickPress - About to load subtasks', {
      eventId: event.id,
      forceReload: true
    });
    loadSubtasks(event.id, event, true);
  }, [loadSubtasks]);

  // ===== LÓGICA DEL TUTORIAL =====
  // Función para verificar el estado del tutorial
  const checkTutorialStatus = useCallback(async () => {
    try {
      const isCompleted = await tutorialService.isTutorialCompleted();
      // console.log('📚 Tutorial: checkTutorialStatus - isCompleted:', isCompleted);
      
      if (!isCompleted) {
        const savedStep = await tutorialService.getCurrentStep();
        // console.log('📚 Tutorial: Restaurando paso:', savedStep);
        setTutorialStep(savedStep);
        setTutorialVisible(true);
        setTutorialCompleted(false);
      } else {
        // console.log('📚 Tutorial: Ya completado, no mostrar');
        setTutorialCompleted(true);
        setTutorialVisible(false);
      }
    } catch (error) {
      console.error('❌ Tutorial: Error en checkTutorialStatus:', error);
      // Si hay error, no mostrar tutorial
      setTutorialCompleted(true);
      setTutorialVisible(false);
    }
  }, []);

  // Verificar si el tutorial debe mostrarse al montar - SOLO UNA VEZ
  useEffect(() => {
    // Delay más largo para asegurar que la UI esté completamente cargada
    const timer = setTimeout(() => {
      // console.log('📚 Tutorial: Iniciando verificación después de delay');
      checkTutorialStatus();
    }, 1000); // 1 segundo de delay
    return () => clearTimeout(timer);
  }, []); // Sin dependencias - solo al montar

  // Verificar cuando la pantalla vuelve a estar en foco (cuando vuelves de configuraciones)
  useFocusEffect(
    useCallback(() => {
      // console.log('📚 Tutorial: Pantalla en foco, verificando estado');
      checkTutorialStatus();
    }, [checkTutorialStatus])
  );

  // Completar el tutorial
  const handleTutorialComplete = useCallback(async () => {
    await tutorialService.markTutorialCompleted();
    setTutorialVisible(false);
    setTutorialCompleted(true);
  }, []);

  // Avanzar al siguiente paso del tutorial
  const handleTutorialNext = useCallback(() => {
    // Resetear el ref cuando avanzamos al siguiente paso
    tutorialObjectiveCompletedRef.current = null;
    const nextStep = tutorialStep + 1;
    if (nextStep < calendarTutorialSteps.length) {
      setTutorialStep(nextStep);
      tutorialService.saveCurrentStep(nextStep);
    } else {
      handleTutorialComplete();
    }
  }, [tutorialStep, handleTutorialComplete]);

  // Saltar el tutorial
  const handleTutorialSkip = useCallback(async () => {
    console.log('🔘 Tutorial: handleTutorialSkip llamado');
    try {
      // Primero ocultar el tutorial inmediatamente
      setTutorialVisible(false);
      setTutorialCompleted(true);
      setTutorialStep(0); // Resetear el paso
      
      // Luego marcar como completado en storage
      await tutorialService.markTutorialCompleted();
      console.log('✅ Tutorial: Tutorial saltado exitosamente');
    } catch (error) {
      console.error('❌ Tutorial: Error al saltar tutorial:', error);
      // Incluso si hay error, asegurar que se oculte
      setTutorialVisible(false);
      setTutorialCompleted(true);
    }
  }, []);

  // Detectar acciones del usuario para avanzar pasos automáticamente
  // Usa el sistema de objetivos para solo avanzar cuando se cumple la acción correcta
  useEffect(() => {
    if (!tutorialVisible || tutorialCompleted) {
      tutorialObjectiveCompletedRef.current = null;
      return;
    }

    const currentStepData = calendarTutorialSteps[tutorialStep] as any;
    if (!currentStepData || !currentStepData.actionRequired || !currentStepData.objective) {
      tutorialObjectiveCompletedRef.current = null;
      return;
    }
    
    const objective = currentStepData.objective;
    
    // Si ya se completó este objetivo, no hacer nada
    // Usar clave única por paso y objetivo para evitar conflictos
    const objectiveKey = `${tutorialStep}-${objective}`;
    if (tutorialObjectiveCompletedRef.current === objectiveKey || tutorialObjectiveCompletedRef.current === objective) {
      return;
    }
    
    // console.log('📚 Tutorial DEBUG: Paso actual:', {
    //   step: tutorialStep,
    //   id: currentStepData.id,
    //   objective,
    //   requiresAction: currentStepData.actionRequired,
    // });
    
    // Solo avanzar cuando se cumple el objetivo correcto
    switch (objective) {
      case 'click-empty-cell':
        // Solo avanzar si se abrió el modal al hacer clic en una celda vacía (no al editar un evento existente)
        if (modalVisible && !selectedEvent) {
          console.log('✅ Objetivo cumplido: click-empty-cell');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'enter-event-name':
        // Avanzar cuando se ingresa cualquier nombre (no solo "ir al gimnasio")
        if (eventTitle.trim().length > 0) {
          console.log('✅ Objetivo cumplido: enter-event-name');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'press-create-button':
        // Este se detecta cuando se cierra el modal después de presionar crear
        // Se detecta en handleCloseModal o cuando modalVisible cambia a false después de guardar
        break;
        
      case 'click-event-item':
        // Avanzar cuando se abre el modal al hacer clic en un evento existente
        if (modalVisible && selectedEvent) {
          console.log('✅ Objetivo cumplido: click-event-item');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          // Dar más tiempo para que el modal se renderice completamente antes de avanzar
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 300);
        }
        break;
        
      case 'open-recurrence-modal':
        if (recurrenceModalVisible) {
          console.log('✅ Objetivo cumplido: open-recurrence-modal');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'enable-recurrence':
        // Verificar que la recurrencia esté habilitada en el modal
        if (recurrenceModalVisible && recurrenceConfig.enabled) {
          console.log('✅ Objetivo cumplido: enable-recurrence');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'select-weekly-mode':
        // Verificar que el modo sea semanal
        if (recurrenceModalVisible && recurrenceConfig.enabled && recurrenceConfig.mode === 'weekly') {
          console.log('✅ Objetivo cumplido: select-weekly-mode');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'select-recurrence-days':
        // Verificar que se hayan seleccionado los días específicos: Lunes (MO), Martes (TU), Jueves (TH), Viernes (FR)
        const requiredDays = ['MO', 'TU', 'TH', 'FR'];
        if (recurrenceConfig.enabled && 
            recurrenceConfig.mode === 'weekly' && 
            recurrenceConfig.weekDays.length >= 4 &&
            requiredDays.every(day => recurrenceConfig.weekDays.includes(day))) {
          console.log('✅ Objetivo cumplido: select-recurrence-days');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'save-recurrence':
        // Se detecta cuando se cierra el modal de recurrencia después de guardar
        // Se detecta cuando recurrenceModalVisible cambia a false y hay recurrencia configurada
        break;
        
      case 'add-subtasks':
        // Verificar que se hayan agregado al menos 2 subtareas
        // Ya no requiere textos específicos, solo que haya 2 o más subtareas
        // También verificar que el modal esté visible (estamos en el paso correcto)
        if (modalVisible && subtasks.length >= 2) {
          console.log('✅ Objetivo cumplido: add-subtasks (2 o más subtareas agregadas)');
          tutorialObjectiveCompletedRef.current = `${tutorialStep}-${objective}`;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'save-event-with-subtasks':
        // Se detecta cuando se guarda el evento después de agregar subtareas
        // Se detecta en handleSaveEvent
        break;
        
      case 'complete-subtasks':
        // Solo avanzar si todas las subtareas están completadas Y se está editando (no solo marcando)
        // El tutorial debe avanzar cuando se cierra el modal después de completar las subtareas
        // Esto se detecta cuando modalVisible cambia a false y todas las subtareas están completadas
        if (subtasks.length > 0 && subtasks.every(st => st.completed) && !modalVisible) {
          console.log('✅ Objetivo cumplido: complete-subtasks (todas completadas y modal cerrado)');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'drag-event':
        // Se detecta en onMoveCommit cuando se mueve un evento
        break;
        
      case 'resize-event':
        // Se detecta en onResizeCommit cuando se estira un evento
        break;
        
      case 'long-press-event':
        // Se detecta cuando se muestra el menú contextual (long press)
        break;
        
      case 'switch-to-day-view':
        // Se detecta cuando currentView cambia a 'day'
        if (currentView === 'day') {
          console.log('✅ Objetivo cumplido: switch-to-day-view');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'switch-to-month-view':
        // Se detecta cuando currentView cambia a 'month'
        if (currentView === 'month') {
          console.log('✅ Objetivo cumplido: switch-to-month-view');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      case 'switch-to-year-view':
        // Se detecta cuando currentView cambia a 'year'
        if (currentView === 'year') {
          console.log('✅ Objetivo cumplido: switch-to-year-view');
          tutorialObjectiveCompletedRef.current = objective;
          if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);
          tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);
        }
        break;
        
      default:
        // Sin objetivo, no avanzar automáticamente
        break;
    }
  }, [tutorialVisible, tutorialStep, modalVisible, selectedEvent, eventTitle, recurrenceModalVisible, subtasks, recurrenceConfig, handleTutorialNext, tutorialCompleted, currentView]);

  // ===== RENDERIZADO PRINCIPAL =====
  return (
    <React.Fragment>
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16) }]}> 
        <View style={styles.viewFilters}>
          {(['day','week','month','year'] as const).map((view) => (
            <TouchableOpacity
              key={view}
              style={[styles.filterButton, currentView === view && styles.activeFilterButton]}
              onPress={() => onChangeView(view)}
            >
              <Text style={[styles.filterText, currentView === view && styles.activeFilterText]}>
                {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : view === 'month' ? 'Mes' : 'Año'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={() => navigateDate('prev')}>
            <Text style={styles.navButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.currentDate}>{formatHeaderDate()}</Text>
          <TouchableOpacity onPress={() => navigateDate('next')}>
            <Text style={styles.navButton}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={refreshSubtasksColors} style={{
            display: 'none' // Ocultar visualmente el botón pero mantener la funcionalidad
          }}>
            <Text style={{
              fontSize: 18, 
              fontWeight: 'bold', 
              color: Colors.light.tint 
            }}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Header de días (si no es month ni year). En semana sincronizamos el scroll horizontal del header */}
      {currentView !== 'month' && currentView !== 'year' && (
        <View style={styles.weekHeader}>
          <View style={styles.timeColumn} />
          {currentView === 'day' ? (
            <View style={[styles.dayHeader, { width: getCellWidth() }]}>
              <Text style={styles.dayText}>Hoy</Text>
            </View>
          ) : (
            // Semana: header horizontal sincronizable (sin scroll directo en header)
            (() => {
              const weekStart = startOfWeek(currentDate);
              const dayHeaderWidth = getCellWidth();
              const totalWidth = dayHeaderWidth * 7;
              return (
                <ScrollView
                  horizontal
                  ref={headerHorizontalRef}
                  scrollEnabled={false}
                  contentContainerStyle={{ width: totalWidth, flexDirection: 'row' }}
                >
                  {Array.from({ length: 7 }, (_, i) => {
                    const dayDate = addDays(weekStart, i);
                    const dayNum = dayDate.getDate();
                    const dayName = weekDaysFull[i];
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    return (
                      <View key={i} style={[
                        styles.dayHeader, 
                        { width: dayHeaderWidth },
                        isToday && styles.todayHeader
                      ]}>
                        <Text style={[
                          styles.dayText,
                          isToday && styles.todayHeaderText
                        ]}>{`${dayName} ${String(dayNum).padStart(2, '0')}`}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              );
            })()
          )}
        </View>
      )}

      {/* Contenido: month / day / week */}
      {currentView === 'month' ? (
        <MonthView
          currentDate={currentDate}
          monthEvents={monthEvents}
          setMonthEvents={setMonthEvents}
          verticalScrollRef={verticalScrollRef}
          getCellWidth={getCellWidth}
          setSelectedEvent={setSelectedEvent as any}
          setEventTitle={setEventTitle}
          setEventDescription={setEventDescription}
          setEventColor={setEventColor}
          setModalVisible={setModalVisible}
          setSelectedMonthCell={setSelectedMonthCell}
          getRandomColor={getRandomColor}
          createDefaultRecurrenceConfig={createDefaultRecurrenceConfig}
          setSubtasks={setSubtasks}
          setNewSubtaskText={setNewSubtaskText}
          setShowSubtaskInput={setShowSubtaskInput}
          loadSubtasks={loadSubtasks as any}
          eventLongPressHandlers={eventLongPressHandlers}
          longPressActiveRef={longPressActiveRef}
          refreshMonthEvents={refreshMonthEvents}
          getSubtaskStatus={getSubtaskStatus}
          onDelete={handleDeleteEventFromLongPress}
        />
      ) : currentView === 'day' ? (
        <View style={styles.dayContainer}>
          <ScrollView
            ref={verticalScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <View style={{ flexDirection: 'row' }}>
              {/* Columna de horas (fija) */}
              <View style={styles.fixedTimeColumn}>
                {timeSlots.map((time, idx) => {
                  // Detectar si es la hora actual
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const currentTimeInMinutes = currentHour * 60 + currentMinute;
                  const slotStartTime = userStartHour * 60 + (idx * 30);
                  const slotEndTime = slotStartTime + 30;
                  const isCurrentHour = currentTimeInMinutes >= slotStartTime && currentTimeInMinutes < slotEndTime;
                  
                  return (
                    <View key={`h-${idx}`} style={[styles.timeRow, { width: 60 }]}> 
                      <View style={[
                        styles.timeColumn,
                        isCurrentHour && styles.currentHourColumn
                      ]}>
                        <Text style={[
                          styles.timeText,
                          isCurrentHour && styles.currentHourText
                        ]}>{time}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Contenido de la grilla - solo un día */}
              <View style={{ position: 'absolute', left: 60, top: 0, width: getCellWidth(), height: timeSlots.length * CELL_HEIGHT }}>
                {timeSlots.map((time, timeIndex) => {
                  const dateKey = toDateKey(currentDate);
                  const key = `${dateKey}-${timeIndex * 30}`;
                  const event = eventsByCell[key];
                  
                  // Detectar si es la hora actual
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const currentTimeInMinutes = currentHour * 60 + currentMinute;
                  const slotStartTime = START_HOUR * 60 + (timeIndex * 30);
                  const slotEndTime = slotStartTime + 30;
                  const isCurrentHour = currentTimeInMinutes >= slotStartTime && currentTimeInMinutes < slotEndTime;
                  
                  return (
                    <Pressable
                      key={`cell-${timeIndex}`}
                      android_ripple={event ? null : undefined} // Deshabilitar ripple cuando hay evento para evitar estado blanco
                      style={({ pressed }) => [
                        styles.gridCell,
                        { 
                          width: getCellWidth(),
                          height: CELL_HEIGHT,
                          top: timeIndex * CELL_HEIGHT
                        },
                        isCurrentHour && styles.currentHourCell,
                        event && pressed && { opacity: 1 } // Mantener opacidad constante cuando hay evento
                      ]}
                      onPress={(e) => {
                        console.log('👆 CALENDAR DEBUG: Click en celda (día):', {
                          timeIndex,
                          locationX: e.nativeEvent.locationX,
                          locationY: e.nativeEvent.locationY,
                          tutorialVisible,
                          tutorialCompleted,
                          hasEvent: !!event,
                        });
                        // Verificar si hay un evento en esta celda
                        const hasOccupyingEvent = !!event;
                        
                        if (!hasOccupyingEvent) {
                          // Crear nuevo evento - limpiar estado previo
                          setSelectedEvent(null);
                          setEventTitle('');
                          setEventDescription('');
                          setEventColor(getRandomColor());
                          setRecurrenceConfig(createDefaultRecurrenceConfig());
                          setSubtasks([]);
                          setNewSubtaskText('');
                          setShowSubtaskInput(false);
                          setSelectedCell({ dayIndex: 0, timeIndex, startTime: timeIndex * 30 });
                          setModalVisible(true);
                        } else {
                          // 🔧 FIX: Si hubo long press activo en este evento, no abrir modal al soltar
                          if (longPressActiveRef.current[event.id]) {
                            return;
                          }
                          // Editar evento existente
                          onQuickPress(event);
                        }
                      }}
                      onLongPress={() => {
                        // 🎯 LONG PRESS para eventos en vista de día
                        if (event) {
                          // Usar el handler del EventResizableBlock si existe
                          const handler = eventLongPressHandlers[event.id];
                          if (handler) {
                            handler();
                          }
                        }
                      }}
                      delayLongPress={1500}
                    >
                      {(() => {
                        // 🔧 FIX: Renderizar EventResizableBlock solo en la celda donde el evento empieza
                        if (event) {
                          return (
                            <EventResizableBlock 
                              key={event.id} 
                              ev={event} 
                              onResizeCommit={onResizeCommit}
                              onMoveCommit={onMoveCommit} 
                              onQuickPress={onQuickPress} 
                              cellWidth={getCellWidth()} 
                              currentView={currentView}
                              subtaskStatus={getSubtaskStatus(event.id)}
                              onLongPress={createLongPressHandler(event.id)}
                              onDuplicate={handleDuplicateEvent}
                              onDelete={handleDeleteEventFromLongPress}
                            />
                          );
                        }
                        
                        // 🔧 FIX: Buscar eventos que ocupan esta celda pero empiezan antes
                        let occupyingEvent = null;
                        let isFirstCell = false;
                        let isLastCell = false;
                        const startTime = timeIndex * 30;
                        
                        for (let i = 0; i < 48; i++) {
                          const checkTime = startTime - (i * 30);
                          if (checkTime < 0) break;
                          
                          const checkKey = `${dateKey}-${checkTime}`;
                          const checkEvent = eventsByCell[checkKey];
                          if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {
                            occupyingEvent = checkEvent;
                            // Verificar si esta es la primera celda del evento
                            isFirstCell = (checkEvent.startTime === startTime);
                            // Verificar si esta es la última celda del evento
                            const eventEndTime = checkEvent.startTime + checkEvent.duration;
                            isLastCell = (eventEndTime > startTime && eventEndTime <= startTime + 30);
                            break;
                          }
                        }
                        
                        // 🔧 FIX: Renderizar drag handler en celdas intermedias
                        if (occupyingEvent && !isFirstCell && !isLastCell) {
                          return (
                            <EventResizableBlock 
                              key={`${occupyingEvent.id}-middle-${startTime}`} 
                              ev={occupyingEvent} 
                              onResizeCommit={onResizeCommit}
                              onMoveCommit={onMoveCommit} 
                              onQuickPress={onQuickPress} 
                              cellWidth={getCellWidth()} 
                              currentView={currentView}
                              subtaskStatus={getSubtaskStatus(occupyingEvent.id)}
                              onLongPress={createLongPressHandler(occupyingEvent.id)}
                              onDuplicate={handleDuplicateEvent}
                              onDelete={handleDeleteEventFromLongPress}
                              renderMiddleCell={true}
                              currentCellStartTime={startTime}
                            />
                          );
                        }
                        
                        // 🔧 FIX: Renderizar bloque extendido SOLO en la última celda para el handler de abajo
                        if (occupyingEvent && !isFirstCell && isLastCell) {
                          return (
                            <EventResizableBlock 
                              key={`${occupyingEvent.id}-bottom-handler`} 
                              ev={occupyingEvent} 
                              onResizeCommit={onResizeCommit}
                              onMoveCommit={onMoveCommit} 
                              onQuickPress={onQuickPress} 
                              cellWidth={getCellWidth()} 
                              currentView={currentView}
                              subtaskStatus={getSubtaskStatus(occupyingEvent.id)}
                              onLongPress={createLongPressHandler(occupyingEvent.id)}
                              onDuplicate={handleDuplicateEvent}
                              onDelete={handleDeleteEventFromLongPress}
                              renderOnlyBottomHandler={true}
                              currentCellStartTime={startTime}
                            />
                          );
                        }
                        
                        return null;
                      })()}
                    </Pressable>
                  );
                })}
              </View>

              {/* Fondo del grid para día */}
              <View style={{ marginLeft: 60 }}>
                <GridBackground 
                  width={getCellWidth()} 
                  height={timeSlots.length * CELL_HEIGHT} 
                  cellHeight={CELL_HEIGHT} 
                />
              </View>
            </View>
          </ScrollView>
        </View>
      ) : currentView === 'year' ? (
        <YearView
          currentDate={currentDate}
          yearEvents={yearEvents}
          onMonthPress={(year: number, month: number) => {
            const newDate = new Date(year, month, 1);
            setCurrentDate(newDate);
            setCurrentView('month');
          }}
          refreshYearEvents={async () => {
            const year = currentDate.getFullYear();
            const fetched = await fetchYearEvents(year);
            setYearEvents(fetched);
          }}
        />
      ) : (
        // Vista semanal: ScrollView vertical con columna de horas fija y contenido horizontal scrollable
        <View style={styles.weekContainer}>
          <ScrollView
            ref={verticalScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <View style={{ flexDirection: 'row' }}>
              {/* Columna de horas (fija) */}
              <View style={styles.fixedTimeColumn}>
                {timeSlots.map((time, idx) => {
                  // Detectar si es la hora actual
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const currentTimeInMinutes = currentHour * 60 + currentMinute;
                  const slotStartTime = userStartHour * 60 + (idx * 30);
                  const slotEndTime = slotStartTime + 30;
                  const isCurrentHour = currentTimeInMinutes >= slotStartTime && currentTimeInMinutes < slotEndTime;
                  
                  return (
                    <View key={`h-${idx}`} style={[styles.timeRow, { width: 60 }]}> 
                      <View style={[
                        styles.timeColumn,
                        isCurrentHour && styles.currentHourColumn
                      ]}>
                        <Text style={[
                          styles.timeText,
                          isCurrentHour && styles.currentHourText
                        ]}>{time}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Fondo del grid */}
              <GridBackground 
                width={getCellWidth() * 7} 
                height={timeSlots.length * CELL_HEIGHT} 
                cellHeight={CELL_HEIGHT} 
              />
              
              {/* Contenido de días horizontal (scrollable) */}
              <ScrollView
                horizontal
                ref={contentHorizontalRef}
                onScroll={handleHorizontalScroll}
                scrollEventThrottle={16}
                nestedScrollEnabled
                showsHorizontalScrollIndicator
                contentContainerStyle={{ width: getCellWidth() * 7 }}
              >
                <View>
                  {timeSlots.map((_, timeIndex) => {
                    // Detectar si es la hora actual
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTimeInMinutes = currentHour * 60 + currentMinute;
                    const slotStartTime = START_HOUR * 60 + (timeIndex * 30);
                    const slotEndTime = slotStartTime + 30;
                    const isCurrentHour = currentTimeInMinutes >= slotStartTime && currentTimeInMinutes < slotEndTime;
                    
                    return (
                    <View key={`row-${timeIndex}`} style={[
                      styles.timeRow, 
                      { width: getCellWidth() * 7 },
                      isCurrentHour && styles.currentHourRow
                    ]}> 
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const weekStart = startOfWeek(currentDate);
                        const dayDate = addDays(weekStart, dayIndex);
                        const dateKey = toDateKey(dayDate);
                        const startTime = timeIndex * 30;
                        const lookupKey = `${dateKey}-${startTime}`;
                        const event = eventsByCell[lookupKey];
                        const isToday = dayDate.toDateString() === new Date().toDateString();

                        return (
                          <View
                            key={`cell-${dayIndex}-${timeIndex}`}
                            style={[
                              styles.cell, 
                              { width: getCellWidth() },
                              isToday && styles.todayCell,
                              isToday && styles.currentHourCell,
                              isCurrentHour && styles.currentHourCell
                            ]}
                          >
                            <Pressable
                              android_ripple={null} // Deshabilitar ripple para evitar estado blanco
                              style={({ pressed }) => [
                                styles.cellTouchable,
                                pressed && { opacity: 1 } // Mantener opacidad constante
                              ]}
                              onPress={() => {
                              // 🟣 TOUCH_EVENT - WeekViewCell
                              const timestamp = new Date().toISOString();
                              // 🔧 FIX: Verificar si hay un evento que ocupa esta celda
                              let hasOccupyingEvent = !!event;
                              let occupyingEvent = event;
                              
                              if (!event) {
                                // Buscar eventos que empiezan antes y ocupan esta celda
                                for (let i = 0; i < 48; i++) {
                                  const checkTime = startTime - (i * 30);
                                  if (checkTime < 0) break;
                                  
                                  const checkKey = `${dateKey}-${checkTime}`;
                                  const checkEvent = eventsByCell[checkKey];
                                  if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {
                                    hasOccupyingEvent = true;
                                    occupyingEvent = checkEvent;
                                    break;
                                  }
                                }
                              }
                              
                              
                              
                              // 🔧 FIX: Solo ejecutar handleCellPress si NO hay evento ocupando esta celda
                              if (!hasOccupyingEvent) {
                                handleCellPress(dayIndex, timeIndex);
                              } else {
                                // 🔧 FIX: Si hay un evento ocupando la celda, abrir su modal
                                if (occupyingEvent) {
                                  // 🔧 FIX: Si hubo long press activo en este evento, no abrir modal al soltar
                                  if (longPressActiveRef.current[occupyingEvent.id]) {
                                    return;
                                  }
                                  onQuickPress(occupyingEvent);
                                }
                              }
                            }}
                            onLongPress={() => {
                              // 🎯 LONG PRESS para eventos extendidos
                              let hasOccupyingEvent = !!event;
                              let occupyingEvent = event;
                              
                              if (!event) {
                                // Buscar eventos que empiezan antes y ocupan esta celda
                                for (let i = 0; i < 48; i++) {
                                  const checkTime = startTime - (i * 30);
                                  if (checkTime < 0) break;
                                  
                                  const checkKey = `${dateKey}-${checkTime}`;
                                  const checkEvent = eventsByCell[checkKey];
                                  if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {
                                    hasOccupyingEvent = true;
                                    occupyingEvent = checkEvent;
                                    break;
                                  }
                                }
                              }
                              
                              if (hasOccupyingEvent && occupyingEvent) {
                                console.log('🎯 LONG PRESS DETECTED - Extended Event:', occupyingEvent.title, 'ID:', occupyingEvent.id);
                                
                                // Usar el handler del EventResizableBlock si existe
                                const handler = eventLongPressHandlers[occupyingEvent.id];
                                if (handler) {
                                  handler();
                                }
                              }
                            }}
                            delayLongPress={1500}
                          >
                            {(() => {
                              // 🔧 FIX: Renderizar EventResizableBlock solo en la celda donde el evento empieza
                              if (event) {
                                return (
                                  <EventResizableBlock 
                                    key={event.id} 
                                    ev={event} 
                                    onResizeCommit={onResizeCommit}
                          onMoveCommit={onMoveCommit} 
                                    onQuickPress={onQuickPress} 
                                    cellWidth={getCellWidth()} 
                                    currentView={currentView}
                                    subtaskStatus={getSubtaskStatus(event.id)}
                                    onLongPress={createLongPressHandler(event.id)}
                                    onDuplicate={handleDuplicateEvent}
                                    onDelete={handleDeleteEventFromLongPress}
                                  />
                                );
                              }
                              
                              // 🔧 FIX: Buscar eventos que ocupan esta celda pero empiezan antes
                              let occupyingEvent = null;
                              let isFirstCell = false;
                              let isLastCell = false;
                              
                              for (let i = 0; i < 48; i++) {
                                const checkTime = startTime - (i * 30);
                                if (checkTime < 0) break;
                                
                                const checkKey = `${dateKey}-${checkTime}`;
                                const checkEvent = eventsByCell[checkKey];
                                if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {
                                  occupyingEvent = checkEvent;
                                  // Verificar si esta es la primera celda del evento
                                  isFirstCell = (checkEvent.startTime === startTime);
                                  // Verificar si esta es la última celda del evento
                                  // El evento termina en esta celda si el endTime está dentro de este slot
                                  const eventEndTime = checkEvent.startTime + checkEvent.duration;
                                  // Esta es la última celda si el evento termina en este slot o en el siguiente
                                  // Pero el evento visualmente ocupa hasta el final de este slot
                                  isLastCell = (eventEndTime > startTime && eventEndTime <= startTime + 30);
                                  break;
                                }
                              }
                              
                              // 🔧 FIX: Renderizar drag handler en celdas intermedias
                              if (occupyingEvent && !isFirstCell && !isLastCell) {
                                // Renderizar EventResizableBlock solo con drag handler en celdas intermedias
                                return (
                                  <EventResizableBlock 
                                    key={`${occupyingEvent.id}-middle-${startTime}`} 
                                    ev={occupyingEvent} 
                                    onResizeCommit={onResizeCommit}
                                    onMoveCommit={onMoveCommit} 
                                    onQuickPress={onQuickPress} 
                                    cellWidth={getCellWidth()} 
                                    currentView={currentView}
                                    subtaskStatus={getSubtaskStatus(occupyingEvent.id)}
                                    onLongPress={createLongPressHandler(occupyingEvent.id)}
                                    onDuplicate={handleDuplicateEvent}
                                    onDelete={handleDeleteEventFromLongPress}
                                    renderMiddleCell={true}
                                    currentCellStartTime={startTime}
                                  />
                                );
                              }
                              
                              // 🔧 FIX: Renderizar bloque extendido SOLO en la última celda para el handler de abajo
                              if (occupyingEvent && !isFirstCell && isLastCell) {
                                // Debug log comentado - Extended Block
                                // console.log('🔵 DEBUG - Extended Block (LAST CELL):', {
                                //   eventId: occupyingEvent.id,
                                //   eventTitle: occupyingEvent.title,
                                //   startTime,
                                //   dateKey,
                                //   isFirstCell,
                                //   isLastCell,
                                //   eventStartTime: occupyingEvent.startTime,
                                //   eventDuration: occupyingEvent.duration,
                                //   eventEndTime: occupyingEvent.startTime + occupyingEvent.duration
                                // });
                                
                                // Renderizar EventResizableBlock SOLO para el handler de abajo en la última celda
                                // Usamos el mismo evento pero solo renderizamos el handler de abajo
                                return (
                                  <EventResizableBlock 
                                    key={`${occupyingEvent.id}-bottom-handler`} 
                                    ev={occupyingEvent} 
                                    onResizeCommit={onResizeCommit}
                          onMoveCommit={onMoveCommit} 
                                    onQuickPress={onQuickPress} 
                                    cellWidth={getCellWidth()} 
                                    currentView={currentView}
                                    subtaskStatus={getSubtaskStatus(occupyingEvent.id)}
                                    onLongPress={createLongPressHandler(occupyingEvent.id)}
                                    onDuplicate={handleDuplicateEvent}
                                    onDelete={handleDeleteEventFromLongPress}
                                    renderOnlyBottomHandler={true}
                                    currentCellStartTime={startTime}
                                  />
                                );
                              }
                              
                              return null;
                            })()}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Modal para crear/editar */}
      <EventModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        eventTitle={eventTitle}
        setEventTitle={setEventTitle}
        eventColor={eventColor}
        setEventColor={setEventColor}
        recurrenceSummary={recurrenceSummary}
        onOpenRecurrenceModal={handleOpenRecurrenceModal}
        subtasks={subtasks}
        newSubtaskText={newSubtaskText}
        setNewSubtaskText={setNewSubtaskText}
        showSubtaskInput={showSubtaskInput}
        setShowSubtaskInput={setShowSubtaskInput}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
        onEditSubtask={handleEditSubtask}
        onDeleteSubtask={handleDeleteSubtask}
        selectedEvent={selectedEvent}
        onDeleteEvent={handleDeleteEvent}
        selectedCell={selectedCell}
        tutorialVisible={tutorialVisible && !tutorialCompleted}
        tutorialStep={tutorialStep}
        tutorialSteps={calendarTutorialSteps}
        onTutorialNext={handleTutorialNext}
        onTutorialSkip={handleTutorialSkip}
        onTutorialComplete={handleTutorialComplete}
        beaverImage={require('../../assets/images/beaver-tutorial-1.png')}
        eventDateKey={(() => {
          if (selectedEvent && 'date' in selectedEvent) {
            return selectedEvent.date;
          } else if (selectedCell && currentView === 'week') {
            const weekStart = startOfWeek(currentDate);
            const dayDate = addDays(weekStart, selectedCell.dayIndex);
            return toDateKey(dayDate);
          } else if (selectedCell && currentView === 'day') {
            return toDateKey(currentDate);
          }
          return selectedCell ? toDateKey(currentDate) : undefined;
        })()}
        onDateChange={(dateKey: string, startTime: number) => {
          setCustomDateKey(dateKey);
          setCustomStartTime(startTime);
        }}
        onAlarmChange={(enabled: boolean, option?: string) => {
          setAlarmEnabled(enabled);
          if (option) setAlarmOption(option);
        }}
        alarmEnabled={alarmEnabled}
        alarmOption={alarmOption}
      />

      {/* Modal de Repetición */}
      <Modal
        visible={recurrenceModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setRecurrenceModalVisible(false);
          setTempRecurrenceConfig(null);
        }}
      >
        <RecurrenceModal
          config={tempRecurrenceConfig || recurrenceConfig}
          onSave={handleSaveRecurrenceConfig}
          onCancel={() => {
            setRecurrenceModalVisible(false);
            setTempRecurrenceConfig(null);
          }}
          calendarMonth={recurrenceCalendarMonth}
          onCalendarMonthChange={setRecurrenceCalendarMonth}
          tutorialVisible={tutorialVisible && !tutorialCompleted}
          tutorialStep={tutorialStep}
          tutorialSteps={calendarTutorialSteps}
          onTutorialNext={handleTutorialNext}
          onTutorialSkip={handleTutorialSkip}
          onTutorialComplete={handleTutorialComplete}
          beaverImage={require('../../assets/images/beaver-tutorial-1.png')}
        />
      </Modal>

      {/* Modal de confirmación de borrado */}
      <DeleteModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDeleteSingle={() => handleDeleteConfirm('single')}
        onDeleteSeries={() => handleDeleteConfirm('series')}
      />

      <SubtaskChangesModal
        visible={subtaskChangesModalVisible}
        onClose={() => {
          setSubtaskChangesModalVisible(false);
          setPendingSubtaskChanges(null);
        }}
        onApplyThisDay={handleApplySubtaskChangesToThisDay}
        onApplyToSeries={handleApplySubtaskChangesToSeries}
        changesCount={{
          added: pendingSubtaskChanges?.added.length || 0,
          removed: pendingSubtaskChanges?.removed.length || 0,
          modified: pendingSubtaskChanges?.modified.length || 0,
        }}
      />

      {/* Tutorial Overlay - Renderizar siempre, pero el componente maneja su visibilidad */}
      <TutorialOverlay
        visible={tutorialVisible && !tutorialCompleted}
        currentStep={tutorialStep}
        steps={calendarTutorialSteps}
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
        onComplete={handleTutorialComplete}
        beaverImage={require('../../assets/images/beaver-tutorial-1.png')}
      />

    </View>
    
    {/* Modal de celebración de días consecutivos - Componente separado */}
    <ConsecutiveDaysCelebration
      visible={showConsecutiveDaysModal}
      consecutiveDaysCount={consecutiveDaysCount}
      onClose={() => setShowConsecutiveDaysModal(false)}
      scaleAnim={consecutiveDaysScale}
    />
    </React.Fragment>
  );
}

// Componente separado para el modal de celebración - Similar a TutorialOverlay
function ConsecutiveDaysCelebration({ 
  visible, 
  consecutiveDaysCount, 
  onClose,
  scaleAnim 
}: { 
  visible: boolean; 
  consecutiveDaysCount: number; 
  onClose: () => void;
  scaleAnim: Animated.Value;
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={celebrationStyles.overlay}>
        <Animated.View 
          style={[
            celebrationStyles.content,
            {
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <Text style={celebrationStyles.emoji}>🎉</Text>
          <Text style={celebrationStyles.title}>¡Racha de días consecutivos!</Text>
          <Text style={celebrationStyles.number}>
            {consecutiveDaysCount} {consecutiveDaysCount === 1 ? 'día' : 'días'}
          </Text>
          <Text style={celebrationStyles.subtitle}>Sigue así, ¡estás haciendo un gran trabajo!</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Estilos separados para el modal de celebración
const celebrationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  number: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
    textAlign: 'center',
  },
});

// ===== ESTILOS =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 12 },
  viewFilters: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5' },
  activeFilterButton: { backgroundColor: Colors.light.tint },
  filterText: { fontSize: 14, fontWeight: '500', color: Colors.light.text },
  activeFilterText: { color: 'white' },
  dateNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  navButton: { fontSize: 24, fontWeight: 'bold', color: Colors.light.tint, paddingHorizontal: 16 },
  currentDate: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  weekHeader: { flexDirection: 'row', backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 12 },
  timeColumn: { width: 60, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', height: CELL_HEIGHT },
  weekContainer: { flexDirection: 'row', flex: 1 },
  dayContainer: { flexDirection: 'row', flex: 1 },
  fixedTimeColumn: { width: 60, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#e0e0e0' },
  weekContent: { flex: 1 },
  dayHeader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridCell: { position: 'absolute', borderWidth: 0.5, borderColor: '#e0e0e0', backgroundColor: 'transparent' },
  currentHourCell: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentTimeLine: { position: 'absolute', height: 2, backgroundColor: '#ff4444', zIndex: 10 },
  dayText: { fontSize: 14, fontWeight: '600', color: Colors.light.tint },
  calendarContainer: { flex: 1 },
  timeRow: { flexDirection: 'row', height: CELL_HEIGHT },
  timeText: { fontSize: 12, color: Colors.light.text, textAlign: 'center' },
  cell: { flex: 1, borderRightWidth: 0.5, borderRightColor: '#f0f0f0', position: 'relative' },
  cellTouchable: { flex: 1, position: 'relative' },
  todayCell: { position: 'relative' },
  todayLine: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(107, 83, 226, 0.3)',
    zIndex: 1001
  },
  currentHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(107, 83, 226, 0.3)',
    zIndex: 1001
  },
  todayHeader: { backgroundColor: '#6b53e2', borderRadius: 8, marginHorizontal: 2, paddingVertical: 1 },
  todayHeaderText: { color: 'white', fontWeight: '700' },
  // Estilos para vista de año
  yearContainer: { flex: 1, backgroundColor: Colors.light.background },
  yearScrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 }, // Más padding abajo para evitar que se corte
  yearView: { flex: 1 },
  monthsBarContainer: {
    position: 'relative',
    width: '100%',
  },
  monthsBar: { 
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 60, // Espacio para las líneas de objetivos
    width: '100%',
    minWidth: 1800, // 12 meses * 150px mínimo cada uno (para nombres largos)
  },
  monthSegment: {
    flex: 1, // Cada mes ocupa el mismo espacio
    minWidth: 150, // Ancho mínimo para nombres largos como "Septiembre"
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
  objectivesContainer: {
    position: 'absolute',
    top: 75, // Debajo de la barra de meses
    left: 0,
    right: 0,
    height: 40,
    width: '100%',
  },
  objectiveLine: {
    position: 'absolute',
    height: 10,
    borderRadius: 5,
    top: '50%',
    marginTop: -5,
  },
  colorLegendDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
  },
  colorLegendScrollContainer: {
    maxHeight: 200, // Altura máxima para permitir scroll si hay muchas filas
    paddingHorizontal: 10,
  },
  colorLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  colorLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  // Estilos para botón Planear Año
  yearPlanButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  yearPlanButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearPlanButtonText: {
    fontSize: 18,
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
  },
  yearPlanSuggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
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
  yearPlanDatesContainer: {
    flex: 1,
    padding: 20,
  },
  yearPlanDatesInstructions: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 20,
    fontWeight: '600',
  },
  yearPlanMonthsBarContainer: {
    position: 'relative',
    width: '100%',
    minWidth: 1800,
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
    height: 40,
    width: '100%',
  },
  yearPlanLegendDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  eventContainer: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, zIndex: 1000 },
  eventBlock: { flex: 1, borderRadius: 4, padding: 4, justifyContent: 'center', minHeight: 20, marginBottom: 2, marginHorizontal: 1, zIndex: 1000 },
  gridBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  eventText: { fontSize: 16, color: 'white', fontWeight: '500' },
  eventTextDay: { fontSize: 22, fontWeight: '600', paddingLeft: 8, paddingRight: 4 }, // Texto más grande para vista de día con padding
  eventTextWeek: { fontSize: 14, fontWeight: '500', paddingLeft: 4, paddingRight: 2 }, // Texto ligeramente más grande para vista de semana con padding reducido
  
  // Estilos para resaltar la hora actual
  currentHourRow: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentHourColumn: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentHourText: { color: '#6b53e2', fontWeight: '700' },
  fullscreenModal: { flex: 1, backgroundColor: '#f0f8ff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#f0f8ff' },
  closeButton: { padding: 8 },
  createButton: { backgroundColor: Colors.light.tint, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  createButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  titleSection: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 60, marginBottom: 10 },
  taskTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },
  titleInput: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  charCounter: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 20 },
  colorSection: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 30 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  selectedColorCircle: { borderColor: Colors.light.text },
  configCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  configRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  configLabel: { flex: 1, fontSize: 16, color: Colors.light.text, marginLeft: 12 },
  configValue: { fontSize: 14, color: '#666', marginRight: 8 },
  subtasksSection: { marginBottom: 16 },
  subtasksCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subtasksLabel: { fontSize: 16, color: Colors.light.text, marginLeft: 12 },
  subtasksDescription: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 16, marginBottom: 12 },
  
  // Estilos para input de subtarea
  subtaskInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8 
  },
  subtaskInput: { 
    flex: 1, 
    fontSize: 16, 
    color: Colors.light.text, 
    paddingVertical: 8 
  },
  subtaskAddButton: { 
    backgroundColor: Colors.light.tint, 
    borderRadius: 20, 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  
  // Estilos para items de subtarea
  subtaskItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8 
  },
  subtaskCheckbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#ddd', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    backgroundColor: '#f8f8f8'
  },
  subtaskCheckboxCompleted: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint
  },
  subtaskText: { 
    flex: 1, 
    fontSize: 16, 
    color: Colors.light.text, 
    paddingVertical: 4 
  },
  subtaskTextCompleted: { 
    textDecorationLine: 'line-through', 
    color: '#999' 
  },
  subtaskDeleteButton: { 
    padding: 8, 
    marginLeft: 8 
  },
  
  // Estilos para botón de borrar
  deleteButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#fff5f5', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ff4444'
  },
  deleteButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#ff4444', 
    marginLeft: 8 
  },
  
  // Padding adicional para evitar que el botón de borrar quede oculto detrás de los botones del celular
  bottomPadding: {
    height: 100, // Espacio suficiente para los botones de navegación del celular
    backgroundColor: 'transparent'
  },
  
  // Estilos para modal de confirmación de borrado
  deleteModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  deleteModalContent: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 24, 
    margin: 20, 
    minWidth: 280 
  },
  deleteModalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: Colors.light.text, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  deleteModalMessage: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 24 
  },
  deleteModalButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16 
  },
  deleteModalButton: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8 
  },
  deleteModalButtonSecondary: { 
    backgroundColor: '#f5f5f5', 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  deleteModalButtonPrimary: { 
    backgroundColor: '#ff4444' 
  },
  deleteModalButtonTextSecondary: { 
    color: Colors.light.text, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  deleteModalButtonTextPrimary: { 
    color: 'white', 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  deleteModalCancel: { 
    paddingVertical: 8 
  },
  deleteModalCancelText: { 
    color: '#666', 
    textAlign: 'center', 
    fontSize: 16 
  },
});

// Estilos para el Modal de Repetición
const recurrenceStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: 20 },
  
  // Switch principal
  mainSwitchSection: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    marginVertical: 20,
    padding: 16 
  },
  mainSwitchRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    minHeight: 50
  },
  mainSwitchLabel: { 
    fontSize: 16, 
    fontWeight: '600',
    color: Colors.light.text, 
    marginLeft: 12,
    flex: 1
  },
  mainSwitchSubtitle: { 
    fontSize: 12, 
    color: '#666',
    marginTop: 4,
    marginLeft: 12,
    flex: 2
  },
  
  // Pestañas
  tabsSection: { marginBottom: 20 },
  tabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4
  },
  tab: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center',
    borderRadius: 20
  },
  tabActive: { backgroundColor: '#a8e6cf' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: Colors.light.text },
  
  // Contenido de pestañas
  tabContent: { marginBottom: 20 },
  
  // Secciones
  intervalSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.light.text, 
    marginBottom: 16 
  },
  
  // Controles de intervalo
  intervalRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  intervalLabel: { fontSize: 14, color: Colors.light.text },
  stepperContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4
  },
  stepperButton: { 
    width: 32, 
    height: 32, 
    backgroundColor: 'white',
    borderRadius: 6,
    justifyContent: 'center', 
    alignItems: 'center',
    marginHorizontal: 2
  },
  stepperText: { fontSize: 18, fontWeight: 'bold', color: Colors.light.tint },
  stepperDisabled: { color: '#ccc' },
  intervalValue: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.light.text,
    minWidth: 40,
    textAlign: 'center',
    marginHorizontal: 8
  },
  
  // Días de la semana
  weekDaysSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  weekDaysGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  weekDayChip: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  weekDayChipSelected: { backgroundColor: '#a8e6cf' },
  weekDayChipText: { fontSize: 14, fontWeight: '500', color: '#666' },
  weekDayChipTextSelected: { color: Colors.light.text },
  
  // Días del mes
  monthDaysSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  monthGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  monthDayChip: { 
    width: '13%', 
    aspectRatio: 1,
    borderRadius: 8, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8
  },
  monthDayChipSelected: { backgroundColor: '#a8e6cf' },
  monthDayChipText: { fontSize: 12, fontWeight: '500', color: '#666' },
  monthDayChipTextSelected: { color: Colors.light.text },
  
  // Fecha de término
  endDateSection: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  endDateRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 12
  },
  endDateLabel: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  endDateButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12
  },
  endDateButtonText: { fontSize: 14, color: Colors.light.text },
  
  // Botón de guardar
  saveSection: { paddingBottom: 40 },
  saveButton: { 
    backgroundColor: Colors.light.tint, 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center' 
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  
  // Botón de refresh
  refreshButton: { 
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0'
  },
  refreshButtonText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: Colors.light.tint 
  },
});

/* 
// ===== DEFINICIONES ORIGINALES COMENTADAS (FASE 3) =====
// Estas definiciones fueron movidas a archivos separados en app/(tabs)/components/calendar/

// RecurrenceModal - movido a ./components/calendar/RecurrenceModal.tsx
// EventModal - movido a ./components/calendar/EventModal.tsx  
// DeleteModal - movido a ./components/calendar/DeleteModal.tsx

// Las definiciones originales se mantienen comentadas aquí hasta que se confirmen los tests
*/
