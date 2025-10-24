// calendar.tsx
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
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../../src/config/api';
import authService from '../../services/auth';
import {
  apiPutEventTimes,
  apiPutEvent,
  apiGetCalendars,
  apiPostEvent,
  apiDeleteEvent,
  apiFetchEvents,
  apiGetSubtasks,
  apiCreateSubtask,
  apiUpdateSubtask,
  apiDeleteSubtask,
  apiUpdateMultipleSubtasks
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
import EventResizableBlock from '../../src/components/calendar/EventResizableBlock/EventResizableBlock';
// import { DateTime } from 'luxon'; // No está instalado, usar funciones nativas


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
  onMoveCommit: (event: Event, newStartTime: number, newDate: string) => void;
  cellWidth: number;
  onQuickPress?: (ev: Event) => void; // <-- NEW
  currentView?: 'day' | 'week' | 'month' | 'year'; // <-- NEW: Para estilos condicionales
}

// EventResizableBlock - MOVIDO A ../../src/components/calendar/EventResizableBlock/EventResizableBlock.tsx

interface MonthEvent {
  id: string;
  title: string;
  description?: string;
  startDay: number; // día del mes (1-31)
  duration: number; // duración en días
  color: string;
  category: string;
  year: number;
  month: number; // 0-11
}

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

  // Estado principal
  const [events, setEvents] = useState<Event[]>([]);
  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | MonthEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventColor, setEventColor] = useState('#6b53e2');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedMonthCell, setSelectedMonthCell] = useState<SelectedMonthCell | null>(null);
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>(() => createDefaultRecurrenceConfig());
  const [recurrenceModalVisible, setRecurrenceModalVisible] = useState(false);
  const [tempRecurrenceConfig, setTempRecurrenceConfig] = useState<RecurrenceConfig | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recurrenceCalendarMonth, setRecurrenceCalendarMonth] = useState<Date>(new Date());
  
  // Estado para subtareas
  const [subtasks, setSubtasks] = useState<Array<{id: string, text: string, completed: boolean}>>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  

  const handleOpenRecurrenceModal = useCallback(() => {
  setTempRecurrenceConfig(cloneRecurrenceConfig(recurrenceConfig));
  setRecurrenceCalendarMonth(new Date(currentDate));
    setRecurrenceModalVisible(true);
  }, [recurrenceConfig, currentDate]);

  const handleSaveRecurrenceConfig = useCallback((newConfig: RecurrenceConfig) => {
    setRecurrenceConfig(newConfig);
    setRecurrenceModalVisible(false);
    setTempRecurrenceConfig(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedEvent(null);
    setSelectedCell(null);
    setSelectedMonthCell(null);
    setRecurrenceConfig(createDefaultRecurrenceConfig());
    // Limpiar subtareas al cerrar modal
    setSubtasks([]);
    setNewSubtaskText('');
    setShowSubtaskInput(false);
  }, []);

  // Función para cargar subtareas de un evento
  const loadSubtasks = useCallback(async (eventId: string) => {
    console.log('🔧 Loading subtasks for event:', eventId);
    try {
      const response = await apiGetSubtasks(eventId);
      console.log('🔧 API response:', response.status, response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔧 API result:', result);
        
        const loadedSubtasks = result.data.map((subtask: any) => ({
          id: subtask.id.toString(),
          text: subtask.text,
          completed: subtask.completed
        }));
        
        console.log('🔧 Loaded subtasks:', loadedSubtasks);
        setSubtasks(loadedSubtasks);
      } else {
        console.error('🔧 Error loading subtasks:', response.status);
      }
    } catch (error) {
      console.error('Error al cargar subtareas:', error);
    }
  }, []);

  // Función para migrar subtareas de un evento a otro
  const migrateSubtasks = useCallback(async (oldEventId: string, newEventId: string) => {
    console.log('🔧 Migrating subtasks from', oldEventId, 'to', newEventId);
    try {
      // 1. Obtener subtareas del evento anterior
      const response = await apiGetSubtasks(oldEventId);
      if (response.ok) {
        const result = await response.json();
        const oldSubtasks = result.data;
        
        console.log('🔧 Found subtasks to migrate:', oldSubtasks);
        
        // 2. Crear las subtareas en el nuevo evento
        for (let i = 0; i < oldSubtasks.length; i++) {
          const oldSubtask = oldSubtasks[i];
          const createResponse = await apiCreateSubtask(
            newEventId, 
            oldSubtask.text, 
            i
          );
          
          if (createResponse.ok) {
            console.log('🔧 Migrated subtask:', oldSubtask.text);
          } else {
            console.error('🔧 Failed to migrate subtask:', oldSubtask.text);
          }
        }
        
        // 3. Recargar subtareas del nuevo evento
        await loadSubtasks(newEventId);
      }
    } catch (error) {
      console.error('Error al migrar subtareas:', error);
    }
  }, [loadSubtasks]);

  // Funciones para manejar subtareas
  const handleAddSubtask = useCallback(async () => {
    if (newSubtaskText.trim() && selectedEvent) {
      console.log('🔧 Creating subtask for event ID:', selectedEvent.id);
      const tempId = `temp-${Date.now()}`;
      const newSubtask = {
        id: tempId,
        text: newSubtaskText.trim(),
        completed: false
      };
      
      // Optimistic update - mostrar inmediatamente
      setSubtasks(prev => [...prev, newSubtask]);
      setNewSubtaskText('');
      setShowSubtaskInput(false);
      
      try {
        const response = await apiCreateSubtask(
          selectedEvent.id, 
          newSubtaskText.trim(), 
          subtasks.length
        );
        
        if (response.ok) {
          const result = await response.json();
          // Reemplazar la subtarea temporal con la real
          setSubtasks(prev => prev.map(subtask => 
            subtask.id === tempId 
              ? {
                  id: result.data.id.toString(),
                  text: result.data.text,
                  completed: result.data.completed
                }
              : subtask
          ));
        } else {
          // Si falla, remover la subtarea temporal
          setSubtasks(prev => prev.filter(subtask => subtask.id !== tempId));
        }
      } catch (error) {
        // Si falla, remover la subtarea temporal
        setSubtasks(prev => prev.filter(subtask => subtask.id !== tempId));
        console.error('Error al crear subtarea:', error);
      }
    }
  }, [newSubtaskText, selectedEvent, subtasks.length]);

  const handleToggleSubtask = useCallback(async (id: string) => {
    try {
      const subtask = subtasks.find(s => s.id === id);
      if (subtask) {
        // Optimistic update - actualizar UI inmediatamente
        setSubtasks(prev => 
          prev.map(subtask => 
            subtask.id === id 
              ? { ...subtask, completed: !subtask.completed }
              : subtask
          )
        );
        
        // Luego actualizar en el servidor
        const response = await apiUpdateSubtask(id, {
          completed: !subtask.completed
        });
        
        if (!response.ok) {
          // Si falla, revertir el cambio
          setSubtasks(prev => 
            prev.map(subtask => 
              subtask.id === id 
                ? { ...subtask, completed: subtask.completed }
                : subtask
            )
          );
        }
      }
    } catch (error) {
      console.error('Error al actualizar subtarea:', error);
    }
  }, [subtasks]);

  const handleDeleteSubtask = useCallback(async (id: string) => {
    // Optimistic update - remover inmediatamente
    const originalSubtasks = subtasks;
    setSubtasks(prev => prev.filter(subtask => subtask.id !== id));
    
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
  }, [subtasks]);

  const handleEditSubtask = useCallback(async (id: string, newText: string) => {
    // Optimistic update - actualizar inmediatamente
    setSubtasks(prev => 
      prev.map(subtask => 
        subtask.id === id 
          ? { ...subtask, text: newText }
          : subtask
      )
    );
    
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
  }, []);

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

  // Función para eliminar un evento único
  const handleDeleteSingleEvent = useCallback(async (eventId: string) => {
    try {
      const deleteRes = await apiDeleteEvent(String(eventId));
      
      if (deleteRes.ok) {
        
        // Cerrar todos los modales inmediatamente
        setModalVisible(false);
        setDeleteModalVisible(false);
        setEventTitle('');
        setEventDescription('');
        setSelectedEvent(null);
        setSelectedCell(null);
        
        // Refrescar eventos para actualizar la interfaz
        await refreshEvents();
      } else {
      }
    } catch (error) {
    }
  }, [refreshEvents]);

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
  }, [selectedEvent]);

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

  // Lock para evitar commits duplicados por el mismo evento en paralelo
  const resizeLockRef = useRef<Set<string>>(new Set());

  // Refs para scroll y sincronización
  const verticalScrollRef = useRef<ScrollView | null>(null);
  const contentHorizontalRef = useRef<ScrollView | null>(null); // contenido de días (semana)
  const headerHorizontalRef = useRef<ScrollView | null>(null); // header de días (sin gestos)
  const horizontalOffsetRef = useRef(0);

  // Colores disponibles
  const availableColors = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#9c27b0'];

  // Utilidades de fecha
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
    return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  }, []);

  // Ranuras de tiempo (cada 30 minutos)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const weekDaysFull = useMemo(() => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], []);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [currentDate]);

  // Indexar eventos por fecha+hora para búsqueda rápida
  const eventsByCell = useMemo(() => {
    const index: { [key: string]: Event } = {};
    events.forEach(ev => {
      const key = `${ev.date}-${ev.startTime}`;
      index[key] = ev;
    });
    return index;
  }, [events]);

  // Indexar eventos mensuales por año-mes-día
  const monthEventsByDay = useMemo(() => {
    const index: { [key: string]: MonthEvent } = {};
    monthEvents.forEach(ev => {
      const key = `${ev.year}-${ev.month}-${ev.startDay}`;
      index[key] = ev;
    });
    return index;
  }, [monthEvents]);

  const formatTime = useCallback((timeIndex: number) => {
    const totalMinutes = START_HOUR * 60 + (timeIndex * 30);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

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

    const totalStartMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
    const minutesFromCalendarStart = totalStartMinutes - START_HOUR * 60;
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
  }, [toDateKey]);

  const fetchEventsForRange = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    try {
      // Expandir el rango para capturar eventos recurrentes que puedan generar instancias en el rango visible
      const expandedStart = new Date(rangeStart);
      expandedStart.setMonth(expandedStart.getMonth() - 6); // 6 meses atrás para capturar eventos recurrentes
      
      const response = await apiFetchEvents(expandedStart.toISOString(), rangeEnd.toISOString());
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
        
        const recurrentInstances = generateRecurrentInstances(seriesItem, rangeStart, rangeEnd, overridesMap);
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

  useEffect(() => {
    if (currentView !== 'week' && currentView !== 'day') return;

    const rangeStart = new Date(currentView === 'week' ? startOfWeek(currentDate) : currentDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEndBase = currentView === 'week' ? addDays(rangeStart, 6) : new Date(rangeStart);
    const rangeEnd = new Date(rangeEndBase);
    rangeEnd.setHours(23, 59, 59, 999);

    let ignore = false;

    (async () => {
      const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
      if (!ignore && fetched) {
        setEvents(prev => [...prev, ...fetched]);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [currentView, currentDate, startOfWeek, addDays, fetchEventsForRange]);

  // Obtener ancho de celda
  const getCellWidth = useCallback(() => {
    if (currentView === 'day') {
      return width - 60;
    } else if (currentView === 'week') {
      return ((width - 60) / 7) * 2; // doble ancho por día
    }
    return (width - 60) / 7;
  }, [currentView]);

  // Formatea el header superior usando currentDate
  const formatHeaderDate = useCallback(() => {
    const d = new Date(currentDate);
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    if (currentView === 'day') {
      return `Hoy, ${dayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`;
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);
      return `Semana ${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
    } else if (currentView === 'month') {
      const formatted = d.toLocaleString('es-ES', { month: 'long' });
      return `${formatted.charAt(0).toUpperCase() + formatted.slice(1)} ${d.getFullYear()}`;
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

  const handleCellPress = useCallback((dayIndex: number, timeIndex: number) => {
    // 🟣 TOUCH_EVENT - GridCell
    const timestamp = new Date().toISOString();
    const startTime = timeIndex * 30;
    const lookupKey = `${toDateKey(currentDate)}-${startTime}`;
    const existingEvent = eventsByCell[lookupKey];
    
    console.log('🟣 TOUCH_EVENT - GridCell', {
      timestamp,
      coordinates: { dayIndex, timeIndex },
      startTime,
      lookupKey,
      hasExistingEvent: !!existingEvent,
      eventId: existingEvent?.id,
      component: 'GridCell'
    });

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
      setModalVisible(true);
    } else {
      setSelectedEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventColor(getRandomColor());
      setRecurrenceConfig(createDefaultRecurrenceConfig());
      setModalVisible(true);
      setSelectedCell({ dayIndex, timeIndex, startTime });
    }
  }, [currentView, currentDate, startOfWeek, addDays, eventsByCell, getRandomColor, toDateKey]);

  const handleMonthCellPress = useCallback((day: number) => {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
    const existingEvent = monthEventsByDay[key];

    if (existingEvent) {
      setSelectedEvent(existingEvent);
      setEventTitle(existingEvent.title);
      setEventDescription(existingEvent.description || '');
      setEventColor(existingEvent.color);
      setRecurrenceConfig(extractRecurrenceFromEvent(existingEvent));
      setModalVisible(true);
    } else {
      setSelectedEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventColor(getRandomColor());
      setRecurrenceConfig(createDefaultRecurrenceConfig());
      setModalVisible(true);
      setSelectedMonthCell({ dayIndex: day - 1, day });
    }
  }, [currentDate, monthEventsByDay, getRandomColor]);

  const handleSaveEvent = useCallback(async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    // Almacena el ID temporal del evento que se está creando/editando
    const tempId = selectedEvent?.id; 
    const isNewEvent = !selectedEvent;


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
        const baseStartLocal = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime);
        const baseEndLocal = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime + selectedEvent.duration);
        
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
          
          // 2. Migrar subtareas del evento anterior al nuevo
          await migrateSubtasks(String(selectedEvent.id), String(created.data.id));
          
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
          const baseStartLocal = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime);
          const baseEndLocal = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime + selectedEvent.duration);
          
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

            // 2. Migrar subtareas del evento anterior al nuevo
            await migrateSubtasks(String(selectedEvent.id), String(created.data.id));
            
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
          const baseStartLocal = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime);
          const baseEndLocal = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime + selectedEvent.duration);
          
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
        setMonthEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, title: eventTitle, description: eventDescription, color: eventColor } : ev));
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
          startTime: selectedCell.startTime,
          duration: 30,
          color: eventColor,
          category: 'General',
          date: dateKey,
          is_recurring: false,
          recurrence_rule: null,
          recurrence_end_date: null
        };
        setEvents(prev => [...prev, newEvent!]);
      }

      // Persistencia API con reconciliación de ID
      try {
        // Calcular fechas base
        const baseStartLocal = dateKeyToLocalDate(dateKey, selectedCell.startTime);
        const baseEndLocal = dateKeyToLocalDate(dateKey, selectedCell.startTime + 30);
        
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
          
          if (recurrenceConfig.enabled) {
            // Para eventos recurrentes, solo refrescar desde el servidor
            await refreshEvents();
          } else if (localId && newEvent) {
            // Para eventos no recurrentes, reemplazar el evento temporal
            const finalEvent: Event = {
              id: createdEvent.data.id.toString(),
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
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const newMonthEvent: MonthEvent = {
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
      setMonthEvents(prev => [...prev, newMonthEvent]);
    }

    // Guardar subtareas pendientes si hay un evento seleccionado
    if (selectedEvent && subtasks.length > 0) {
      console.log('🔧 Saving pending subtasks for event:', selectedEvent.id);
      try {
        // Guardar todas las subtareas que no tienen ID real (son temporales)
        const tempSubtasks = subtasks.filter(subtask => subtask.id.startsWith('temp-'));
        for (let i = 0; i < tempSubtasks.length; i++) {
          const tempSubtask = tempSubtasks[i];
          const response = await apiCreateSubtask(selectedEvent.id, tempSubtask.text, i);
          if (response.ok) {
            const result = await response.json();
            // Reemplazar la subtarea temporal con la real
            setSubtasks(prev => prev.map(subtask => 
              subtask.id === tempSubtask.id 
                ? {
                    id: result.data.id.toString(),
                    text: result.data.text,
                    completed: result.data.completed
                  }
                : subtask
            ));
          }
        }
      } catch (error) {
        console.error('Error al guardar subtareas pendientes:', error);
      }
    }

    // Limpiar modal
    setModalVisible(false);
    setEventTitle('');
    setEventDescription('');
    setSelectedEvent(null);
    setSelectedCell(null);
    setSelectedMonthCell(null);
    // NO resetear recurrenceConfig aquí - se mantiene para próximos eventos
  }, [eventTitle, eventDescription, eventColor, selectedEvent, selectedCell, selectedMonthCell, currentView, currentDate, recurrenceConfig, subtasks, migrateSubtasks]);

  // Navegación de fecha (flechas)
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (currentView === 'day') {
      const newDate = addDays(currentDate, direction === 'next' ? 1 : -1);
      setCurrentDate(newDate);
      // Reset de scrolls
      verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });
      return;
    }

    if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const newWeekStart = addDays(weekStart, direction === 'next' ? 7 : -7);
      setCurrentDate(newWeekStart);
      // Reset de scroll horizontal/vertical
      setTimeout(() => {
        contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });
        headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
        verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
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
      return;
    }
  }, [currentView, currentDate, addDays, addMonths, startOfWeek]);

  // Cambio de vista desde los botones superiores
  // - Si elige 'day' volvemos al día de hoy
  // - Reset de scrolls
  const onChangeView = useCallback((view: 'day'|'week'|'month'|'year') => {
    setCurrentView(view);
    if (view === 'day') {
      setCurrentDate(new Date());
    }
    setTimeout(() => {
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
    }, 20);
  }, []);

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


    if (resizeLockRef.current.has(eventId)) {
      return;
    }
    resizeLockRef.current.add(eventId);

    // 1. Actualización optimista de la UI (para que se vea instantáneo)
    setEvents(prev => {
      const updatedEvents = prev.map(ev => ev.id === eventId ? { ...ev, startTime: newStartTime, duration: newDuration } : ev);
      
      // 🔧 DEBUG: Verificar que el evento se actualizó correctamente
      const updatedEvent = updatedEvents.find(ev => ev.id === eventId);
      if (updatedEvent) {
      }
      
      return updatedEvents;
    });

    const startLocal = dateKeyToLocalDate(eventToUpdate.date, newStartTime);
    const endLocal = dateKeyToLocalDate(eventToUpdate.date, newStartTime + newDuration);


    try {
        // 🔍 DETECTAR SI ES INSTANCIA GENERADA DE SERIE RECURRENTE
        const match = String(eventToUpdate.id).match(/^(\d+)_(\d{4}-\d{2}-\d{2})$/);
        const isGeneratedInstance = !!match;
        

        if (isGeneratedInstance) {
            // 📝 CREAR OVERRIDE PARA INSTANCIA GENERADA
            
            const seriesId = parseInt(match[1], 10);
            
            // Calcular original_start_utc usando zona horaria de la serie
            // Por ahora usar zona horaria por defecto hasta obtener la serie
            const seriesTimezone = DEFAULT_TIMEZONE;
            const originalDate = eventToUpdate.date; // YYYY-MM-DD
            const originalHour = Math.floor(eventToUpdate.startTime / 60);
            const originalMinute = eventToUpdate.startTime % 60;
            
            // Crear fecha en zona horaria local y convertir a UTC
            const originalLocalDate = new Date(`${originalDate}T${originalHour.toString().padStart(2, '0')}:${originalMinute.toString().padStart(2, '0')}:00`);
            // Ajustar por zona horaria (America/Sao_Paulo es UTC-3)
            const timezoneOffset = -3 * 60; // UTC-3 en minutos
            const originalStartUtc = new Date(originalLocalDate.getTime() - (timezoneOffset * 60 * 1000)).toISOString();
            

            // Obtener calendar_id
            const calJson = await apiGetCalendars();
            const calendarId = calJson?.data?.[0]?.id;
            if (!calendarId) throw new Error('No calendars available');

            // Crear payload para override
            const overridePayload = {
                calendar_id: calendarId,
                title: eventToUpdate.title,
                description: eventToUpdate.description,
                start_utc: startLocal.toISOString(),
                end_utc: endLocal.toISOString(),
                color: eventToUpdate.color,
                location: eventToUpdate.location || null,
                is_recurring: false, // Override no es recurrente
                series_id: seriesId,
                original_start_utc: originalStartUtc
            };

            const createRes = await apiPostEvent(overridePayload);
            const body = await createRes.json();

            if (createRes.ok && body?.data?.id) {
                const overrideId = String(body.data.id);

                // Reemplazar la instancia temporal con el override del servidor
                setEvents(prev => prev.map(e => 
                    e.id === eventId 
                        ? { ...e, id: overrideId, is_recurring: false } // Marcar como no recurrente
                        : e
                ));
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

                const payload = {
                    calendar_id: calendarId,
                    title: eventToUpdate.title,
                    description: eventToUpdate.description,
                    start_utc: startLocal.toISOString(),
                    end_utc: endLocal.toISOString(),
                    color: eventToUpdate.color,
                };
                const createRes = await apiPostEvent(payload);
                const body = await createRes.json();

                if (createRes.ok && body?.data?.id) {
                    const serverId = String(body.data.id);

                    // Reemplazamos el ID temporal por el ID del servidor EN el evento que ya habíamos actualizado
                    setEvents(prev => prev.map(e => (e.id === eventId ? { ...e, id: serverId } : e)));

                    // Reintentamos el guardado de la hora correcta con el nuevo ID
                    const retryRes = await apiPutEventTimes(serverId, startLocal.toISOString(), endLocal.toISOString());
                    if (!retryRes.ok) throw new Error('Failed to update after fallback create');
                } else {
                    throw new Error('Fallback POST failed');
                }
            } else if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
        }
    } catch (e) {
        Alert.alert('Error', 'No se pudo guardar el cambio. Reintentando...');
        // Revertimos al estado original del bloque antes del estiramiento
        setEvents(prev => prev.map(ev => ev.id === eventId ? eventToUpdate : ev));
    } finally {
        resizeLockRef.current.delete(eventId);
    }
  }, []); // <-- La dependencia vacía [] es clave, ahora no sufre de "estado obsoleto"

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
    // 🟣 TOUCH_EVENT - EventResizableBlock
    const timestamp = new Date().toISOString();

    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventColor(event.color);
    setRecurrenceConfig(extractRecurrenceFromEvent(event));
    setModalVisible(true);
    
    // Cargar subtareas del evento
    loadSubtasks(event.id);
  }, [loadSubtasks]);

  // Callback de commit desde bloque movible
  const onMoveCommit = useCallback(async (eventToUpdate: Event, newStartTime: number, newDate: string) => {
    const eventId = eventToUpdate.id;


    // Actualización optimista de la UI
    setEvents(prev => prev.map(ev => 
      ev.id === eventId 
        ? { ...ev, startTime: newStartTime, date: newDate }
        : ev
    ));

    // Calcular nuevos timestamps UTC
    const startLocal = dateKeyToLocalDate(newDate, newStartTime);
    const endLocal = dateKeyToLocalDate(newDate, newStartTime + eventToUpdate.duration);

    try {
      // Detectar si es instancia generada
      const match = String(eventToUpdate.id).match(/^(\d+)_(\d{4}-\d{2}-\d{2})$/);
      const isGeneratedInstance = !!match;

      if (isGeneratedInstance) {
        // Crear override para instancia generada
        
        const seriesId = parseInt(match[1], 10);
        
        // Calcular original_start_utc usando zona horaria correcta
        const originalDate = eventToUpdate.date; // YYYY-MM-DD
        const originalHour = Math.floor(eventToUpdate.startTime / 60);
        const originalMinute = eventToUpdate.startTime % 60;
        
        // Crear fecha en zona horaria local y convertir a UTC
        const originalLocalDate = new Date(`${originalDate}T${originalHour.toString().padStart(2, '0')}:${originalMinute.toString().padStart(2, '0')}:00`);
        // Ajustar por zona horaria (America/Sao_Paulo es UTC-3)
        const timezoneOffset = -3 * 60; // UTC-3 en minutos
        const originalStartUtc = new Date(originalLocalDate.getTime() - (timezoneOffset * 60 * 1000)).toISOString();
        
        
        const calJson = await apiGetCalendars();
        const calendarId = calJson?.data?.[0]?.id;
        if (!calendarId) throw new Error('No calendars available');

        const overridePayload = {
          calendar_id: calendarId,
          title: eventToUpdate.title,
          description: eventToUpdate.description,
          start_utc: startLocal.toISOString(),
          end_utc: endLocal.toISOString(),
          color: eventToUpdate.color,
          location: eventToUpdate.location || null,
          is_recurring: false,
          series_id: seriesId,
          original_start_utc: originalStartUtc
        };

        const createRes = await apiPostEvent(overridePayload);
        const body = await createRes.json();

        if (createRes.ok && body?.data?.id) {
          const overrideId = String(body.data.id);
          setEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { ...e, id: overrideId, is_recurring: false }
              : e
          ));
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

          const payload = {
            calendar_id: calendarId,
            title: eventToUpdate.title,
            description: eventToUpdate.description,
            start_utc: startLocal.toISOString(),
            end_utc: endLocal.toISOString(),
            color: eventToUpdate.color,
          };
          
          const createRes = await apiPostEvent(payload);
          const body = await createRes.json();

          if (createRes.ok && body?.data?.id) {
            const serverId = String(body.data.id);
            setEvents(prev => prev.map(e => (e.id === eventId ? { ...e, id: serverId } : e)));
          } else {
            throw new Error('Fallback POST failed');
          }
        } else if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo mover el evento. Reintentando...');
      // Revertir cambios
      setEvents(prev => prev.map(ev => ev.id === eventId ? eventToUpdate : ev));
    }
  }, []);

  // Renderizado principal
  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}> 
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
        </View>
      </View>

      {/* Header de días (si no es month). En semana sincronizamos el scroll horizontal del header */}
      {currentView !== 'month' && (
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

      {/* Header de mes */}
      {currentView === 'month' && (
        <View style={styles.monthHeader}>
          <View style={styles.timeColumn} />
          <View style={styles.monthTitleContainer}>
            <Text style={styles.monthTitle}>Días del mes</Text>
          </View>
        </View>
      )}

      {/* Contenido: month / day / week */}
      {currentView === 'month' ? (
        <FlatList
          style={styles.calendarContainer}
          data={monthDays}
          keyExtractor={(item, index) => `day-${index}`}
          renderItem={({ item: day }) => {
            const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
            const event = monthEventsByDay[key];
            return (
              <View style={styles.monthRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{day}</Text>
                </View>
                <TouchableOpacity style={[styles.cell, { width: getCellWidth() }]} onPress={() => handleMonthCellPress(day)}>
                  {event && (
                    <View style={[styles.eventBlock, { backgroundColor: event.color, height: (event.duration) * CELL_HEIGHT - 2 }]}> 
                      <Text style={styles.eventText} numberOfLines={2}>{event.title}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          getItemLayout={(_, index) => ({ length: CELL_HEIGHT, offset: CELL_HEIGHT * index, index })}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />
      ) : currentView === 'day' ? (
        <FlatList
          style={styles.calendarContainer}
          data={timeSlots}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item: time, index: timeIndex }) => {
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
              <View style={[
                styles.timeRow,
                isCurrentHour && styles.currentHourRow
              ]}>
                <View style={[
                  styles.timeColumn,
                  isCurrentHour && styles.currentHourColumn
                ]}>
                  <Text style={[
                    styles.timeText,
                    isCurrentHour && styles.currentHourText
                  ]}>{time}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.cell, { width: getCellWidth() }]} 
                  onPress={() => {
                    
                    
                  }}
                >
                {event && (
                    <EventResizableBlock key={event.id} ev={event} onResizeCommit={onResizeCommit} onMoveCommit={onMoveCommit} onQuickPress={onQuickPress} cellWidth={getCellWidth()} currentView={currentView} />
                )}
                </TouchableOpacity>
              </View>
            );
          }}
          getItemLayout={(_, index) => ({ length: CELL_HEIGHT, offset: CELL_HEIGHT * index, index })}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
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
                {timeSlots.map((time, idx) => (
                  <View key={`h-${idx}`} style={[styles.timeRow, { width: 60 }]}> 
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Fondo del grid */}
              <GridBackground 
                width={getCellWidth() * 7} 
                height={timeSlots.length * CELL_HEIGHT} 
                cellHeight={CELL_HEIGHT} 
              />
              
              {/* Línea horizontal de la hora actual */}
              {(() => {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTimeInMinutes = currentHour * 60 + currentMinute;
                const slotStartTime = START_HOUR * 60;
                const currentSlotIndex = Math.floor((currentTimeInMinutes - slotStartTime) / 30);
                
                if (currentSlotIndex >= 0 && currentSlotIndex < timeSlots.length) {
                  const lineTop = currentSlotIndex * CELL_HEIGHT + ((currentTimeInMinutes - slotStartTime) % 30) * (CELL_HEIGHT / 30);
                  return (
                    <View style={[
                      styles.currentHourLine,
                      {
                        top: lineTop,
                        width: getCellWidth() * 7
                      }
                    ]} />
                  );
                }
                return null;
              })()}
              
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
                              isToday && styles.todayCell
                            ]}
                          >
                            {/* Línea vertical del día actual */}
                            {isToday && (
                              <View style={styles.todayLine} />
                            )}
                            <TouchableOpacity
                              style={styles.cellTouchable}
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
                                  onQuickPress(occupyingEvent);
                                }
                              }
                            }}
                          >
                            {event && (
                                <EventResizableBlock key={event.id} ev={event} onResizeCommit={onResizeCommit} onMoveCommit={onMoveCommit} onQuickPress={onQuickPress} cellWidth={getCellWidth()} currentView={currentView} />
                            )}
                            </TouchableOpacity>
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
        />
      </Modal>

      {/* Modal de confirmación de borrado */}
      <DeleteModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDeleteSingle={() => handleDeleteConfirm('single')}
        onDeleteSeries={() => handleDeleteConfirm('series')}
      />
    </View>
  );
}

// estilos (igual que tu versión previa)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { backgroundColor: Colors.light.background, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingVertical: 12, paddingHorizontal: 16 },
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
  monthHeader: { flexDirection: 'row', height: 40, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  monthTitleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  monthRow: { flexDirection: 'row', height: CELL_HEIGHT },
  weekContainer: { flexDirection: 'row', flex: 1 },
  fixedTimeColumn: { width: 60, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#e0e0e0' },
  weekContent: { flex: 1 },
  dayHeader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  eventContainer: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, zIndex: 1000 },
  eventBlock: { flex: 1, borderRadius: 4, padding: 4, justifyContent: 'center', minHeight: 20, marginBottom: 2, marginHorizontal: 1, zIndex: 1000 },
  gridBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  eventText: { fontSize: 16, color: 'white', fontWeight: '500' },
  eventTextDay: { fontSize: 22, fontWeight: '600', paddingLeft: 8, paddingRight: 4 }, // Texto más grande para vista de día con padding
  eventTextWeek: { fontSize: 14, fontWeight: '500', paddingLeft: 4, paddingRight: 2 }, // Texto ligeramente más grande para vista de semana con padding reducido
  
  // Estilos para resaltar la hora actual
  currentHourRow: { backgroundColor: '#f0e8ff' },
  currentHourColumn: { backgroundColor: '#f0e8ff' },
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
});

/* 
// ===== DEFINICIONES ORIGINALES COMENTADAS (FASE 3) =====
// Estas definiciones fueron movidas a archivos separados en app/(tabs)/components/calendar/

// RecurrenceModal - movido a ./components/calendar/RecurrenceModal.tsx
// EventModal - movido a ./components/calendar/EventModal.tsx  
// DeleteModal - movido a ./components/calendar/DeleteModal.tsx

// Las definiciones originales se mantienen comentadas aquí hasta que se confirmen los tests
*/
