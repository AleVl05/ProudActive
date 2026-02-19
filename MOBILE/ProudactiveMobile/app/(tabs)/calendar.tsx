// calendar.tsx - Main calendar component with day/week/month views

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {

  apiPutEventTimes,

  apiPutEvent,

  apiGetCalendars,

  apiPostEvent,

  apiDeleteEvent,

  apiFetchEvents,

  apiPostMonthEvent,

  apiPutMonthEvent,

} from '@/modules/calendar/services/calendarEventsService';
import {
  apiCreateSubtask,
  apiUpdateSubtask,
  apiDeleteSubtask,
  apiHideSubtaskForInstance,
  apiCreateCustomSubtask,
  apiDeleteCustomSubtask
} from '@/modules/calendar/services/calendarSubtasksService';

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

} from '@/utils/dateConstants';

import {

  dateKeyToLocalDate,

  dateKeyToDate,

  formatDateKey,

  formatDisplayMonthYear,

  getWeekDayCode,

  buildMonthMatrix

} from '@/utils/dateUtils';

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

} from '@/utils/recurrenceUtils';
import { normalizeApiEvent } from '@/modules/calendar/utils/calendarMappers';
import { useCalendarPreferences } from '@/modules/calendar/hooks/useCalendarPreferences';
import { useCalendarEvents } from '@/modules/calendar/hooks/useCalendarEvents';
import { useCalendarEventActions } from '@/modules/calendar/hooks/useCalendarEventActions';
import { useCalendarSubtasks } from '@/modules/calendar/hooks/useCalendarSubtasks';
import { useCalendarTutorial } from '@/modules/calendar/hooks/useCalendarTutorial';

import {

  toggleItemInArray,

  sortNumericArray

} from '@/utils/eventUtils';

import {

  Event,

  RecurrenceConfig,

  RecurrenceRule,

  SelectedCell,

  SelectedMonthCell

} from '@/types/calendarTypes';

import GridBackground from '@/components/calendar/GridBackground';

import RecurrenceModal from '@/components/calendar/RecurrenceModal';

import EventModal from '@/components/calendar/EventModal';

import DeleteModal from '@/components/calendar/DeleteModal';

import SubtaskChangesModal from '@/components/calendar/SubtaskChangesModal';

import { celebrationStyles, recurrenceStyles, styles } from './_calendar.styles';

import EventResizableBlock from '@/components/calendar/EventResizableBlock/EventResizableBlock';

import MonthView from '@/components/calendar/MonthView';

import YearView from '@/components/calendar/YearView';

import { MonthEvent, monthEventFrontendToBackend } from '@/components/calendar/monthEventHelpers';

import TutorialOverlay from '@/components/tutorial/TutorialOverlay';

import { calendarTutorialSteps } from '@/components/tutorial/tutorialSteps';
import { Colors } from '@/constants/theme';




const { width } = Dimensions.get('window');



















// Utilidades fecha/UTC mínimas para API



interface CalendarViewProps {}



// Componente del Modal de Repetición - MOVIDO A ./components/calendar/RecurrenceModal.tsx



export default function CalendarView({}: CalendarViewProps) {

  const insets = useSafeAreaInsets();



  // ===== ESTADO PRINCIPAL =====
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'year'>('week');

  const [currentDate, setCurrentDate] = useState(new Date());

  const currentDateRef = useRef<Date>(currentDate);

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

  const {
    userStartHour,
    userEndHour,
    showConsecutiveDaysModal,
    setShowConsecutiveDaysModal,
    consecutiveDaysCount,
    consecutiveDaysScale
  } = useCalendarPreferences();

  const addMonths = useCallback((date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }, []);

  const toDateKey = useCallback((d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const fetchEventsForRange = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    try {
      const response = await apiFetchEvents(rangeStart.toISOString(), rangeEnd.toISOString());
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

      for (const item of body.data) {
        if (item.series_id && item.original_start_utc) {
          overrides.push(item);
        } else if (item.is_recurring) {
          series.push(item);
        } else {
          const normalizedEvent = normalizeApiEvent(item, toDateKey, userStartHour, userEndHour);
          if (normalizedEvent) {
            allEvents.push(normalizedEvent);
          }
        }
      }

      const overridesMap = new Map<string, any>();
      overrides.forEach(override => {
        const originalStartUtc = new Date(override.original_start_utc).toISOString();
        overridesMap.set(originalStartUtc, override);
      });

      for (const seriesItem of series) {
        const recurrentInstances = generateRecurrentInstances(seriesItem, rangeStart, rangeEnd, overridesMap, userStartHour, userEndHour);
        allEvents.push(...recurrentInstances);
      }

      for (const override of overrides) {
        const hasActiveSeries = series.some(s => s.id === override.series_id);
        if (!hasActiveSeries) {
          const normalizedOverride = normalizeApiEvent(override, toDateKey, userStartHour, userEndHour);
          if (normalizedOverride) {
            allEvents.push(normalizedOverride);
          }
        }
      }

      const existingIds = new Set(allEvents.map(ev => String(ev.id)));
      for (const override of overrides) {
        if (existingIds.has(String(override.id))) continue;
        const startUtc = new Date(override.start_utc);
        if (Number.isNaN(startUtc.getTime())) continue;
        if (startUtc >= rangeStart && startUtc <= rangeEnd) {
          const normalizedOverride = normalizeApiEvent(override, toDateKey, userStartHour, userEndHour);
          if (normalizedOverride) {
            allEvents.push(normalizedOverride);
            existingIds.add(String(normalizedOverride.id));
          }
        }
      }

      return allEvents;
    } catch (error) {
      return null;
    }
  }, [toDateKey, userStartHour, userEndHour]);

  const ScreenOrientation = (globalThis as any)?.ScreenOrientation;
  const ScreenOrientationAvailable = !!ScreenOrientation;

  const {
    events,
    setEvents,
    eventsRef,
    monthEvents,
    setMonthEvents,
    yearEvents,
    setYearEvents,
    refreshEvents,
    refreshMonthEvents,
    fetchYearEvents
  } = useCalendarEvents({
    currentView,
    currentDate,
    startOfWeek,
    addDays,
    fetchEventsForRange,
    ScreenOrientationAvailable,
    ScreenOrientation
  });

  const [selectedEvent, setSelectedEvent] = useState<Event | MonthEvent | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  // Estados de YearView movidos a YearView.tsx

  const [eventTitle, setEventTitle] = useState('');

  const [eventDescription, setEventDescription] = useState('');

  const [eventColor, setEventColor] = useState('#6b53e2');

  

  // ===== ESTADO PARA PREVENIR DOBLE CLIC =====

  const [isLoading, setIsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [alarmEnabled, setAlarmEnabled] = useState(false);

  const [alarmOption, setAlarmOption] = useState<string>('at_start');

  const [eventLongPressHandlers, setEventLongPressHandlers] = useState<{[eventId: string]: () => void}>({});
  
  

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const [selectedMonthCell, setSelectedMonthCell] = useState<SelectedMonthCell | null>(null);

  

  // Estado para fecha/hora personalizada seleccionada desde el picker

  const [customDateKey, setCustomDateKey] = useState<string | null>(null);

  const [customStartTime, setCustomStartTime] = useState<number | null>(null);

  

  // Debug: Rastrear cambios de currentDate (comentado para limpiar consola)

  // useEffect(() => {

  //   console.log('[Calendar] currentDate CHANGED', { 

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



  const {
    subtasks,
    setSubtasks,
    originalSubtasks,
    setOriginalSubtasks,
    subtasksCache,
    setSubtasksCache,
    newSubtaskText,
    setNewSubtaskText,
    showSubtaskInput,
    setShowSubtaskInput,
    subtaskChangesModalVisible,
    setSubtaskChangesModalVisible,
    pendingSubtaskChanges,
    setPendingSubtaskChanges,
    getSubtaskStatus,
    computeSubtaskStatus,
    detectSubtaskStructuralChanges,
    loadSubtasks,
    migrateSubtasks,
    handleToggleSubtask,
    handleDeleteSubtask,
    handleAddSubtask,
    handleEditSubtask,
    loadAllEventsSubtasks
  } = useCalendarSubtasks({
    events,
    setEvents,
    eventsRef,
    selectedEvent,
    currentView,
    currentDate,
    startOfWeek,
    addDays
  });

  


  const {
    tutorialVisible,
    tutorialStep,
    tutorialCompleted,
    handleTutorialComplete,
    handleTutorialNext,
    handleTutorialSkip,
    tutorialObjectiveCompletedRef,
    tutorialNextTimeoutRef
  } = useCalendarTutorial({
    modalVisible,
    selectedEvent,
    eventTitle,
    recurrenceModalVisible,
    recurrenceConfig,
    subtasks,
    currentView
  });

  const {
    handleDuplicateEvent,
    handleDeleteEvent,
    handleDeleteEventFromLongPress,
    handleDeleteConfirm
  } = useCalendarEventActions({
    selectedEvent,
    setSelectedEvent,
    setSelectedCell,
    events,
    userStartHour,
    refreshEvents,
    refreshMonthEvents,
    migrateSubtasks,
    setModalVisible,
    setDeleteModalVisible,
    setEventTitle,
    setEventDescription
  });

  // ===== HELPER: Registrar handlers de long press =====

  const longPressActiveRef = useRef<{[eventId: string]: boolean}>({});

  const stableHandlersRef = useRef<Map<string, () => void>>(new Map());

  const pressStateRef = useRef<{[eventId: string]: { active: boolean; startedAt: number }}>({});

  useEffect(() => {

    currentDateRef.current = currentDate;

  }, [currentDate]);




  const markEventPressIn = useCallback((eventId: string) => {

    pressStateRef.current[eventId] = { active: true, startedAt: Date.now() };

  }, []);



  const markEventPressOut = useCallback((eventId: string) => {

    if (pressStateRef.current[eventId]) {

      pressStateRef.current[eventId].active = false;

    }

  }, []);



  const shouldAllowLongPress = useCallback((eventId: string, minMs: number) => {

    const state = pressStateRef.current[eventId];

    if (!state || !state.active) return false;

    return Date.now() - state.startedAt >= minMs;

  }, []);

  

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

                console.log('? Objetivo cumplido: long-press-event');

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



  






  const findExistingOverride = useCallback((seriesId: number, originalStartUtc: string): Event | undefined => {

    return eventsRef.current.find(ev =>

      !String(ev.id).includes('_') &&

      ev.series_id === seriesId &&

      ev.original_start_utc === originalStartUtc

    );

  }, []);



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

        console.log('? Objetivo cumplido: save-recurrence');

        setTimeout(() => handleTutorialNext(), 500);

      }

    }

  }, [tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext]);



  const handleCloseModal = useCallback(() => {

    // Detectar si debemos avanzar el tutorial cuando se cierra el modal después de completar subtareas

    if (tutorialVisible && !tutorialCompleted) {

      const currentStepData = calendarTutorialSteps[tutorialStep] as any;

      if (currentStepData?.objective === 'complete-subtasks') {

        // Verificar que todas las subtareas están completadas

        if (subtasks.length > 0 && subtasks.every(st => st.completed)) {

          console.log('? Objetivo cumplido: complete-subtasks (modal cerrado con subtareas completadas)');

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









  // Handler: Aplicar cambios de subtareas solo a este día (liberar evento)

  const handleApplySubtaskChangesToThisDay = useCallback(async () => {

    if (!selectedEvent || !pendingSubtaskChanges) return;

    

    try {

      console.log('[Calendar] handleApplySubtaskChangesToThisDay - START', {

        selectedEventId: selectedEvent.id,

        changes: pendingSubtaskChanges

      });

      

      setSubtaskChangesModalVisible(false);

      

      // 1. Crear custom_subtasks para las subtareas NUEVAS (added)

      for (const addedSubtask of pendingSubtaskChanges.added) {

        console.log('[Calendar] Creating custom subtask for this day only', {

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

            console.log('? Custom subtask created successfully');

          } else {

            const errorData = await response.json();

            console.error('? Failed to create custom subtask', { error: errorData });

          }

        } catch (error) {

          console.error('? Exception creating custom subtask', { error });

        }

      }

      

      // 2. Ocultar subtareas del master ELIMINADAS (removed) solo para esta instancia

      for (const removedSubtask of pendingSubtaskChanges.removed) {

        // Solo ocultar si es una subtarea master, no custom

        if (removedSubtask.type === 'master') {

          console.log('[Calendar] Hiding master subtask for this day only', {

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

              console.log('? Master subtask hidden successfully');

            } else {

              const errorData = await response.json();

              console.error('? Failed to hide master subtask', { error: errorData });

            }

          } catch (error) {

            console.error('? Exception hiding master subtask', { error });

          }

        } else if (removedSubtask.type === 'custom') {

          // Si es custom, eliminarla directamente

          console.log('[Calendar] Deleting custom subtask', {

            customSubtaskId: removedSubtask.id,

            text: removedSubtask.text

          });

          

          try {

            const response = await apiDeleteCustomSubtask(removedSubtask.id);

            

            if (response.ok) {

              console.log('? Custom subtask deleted successfully');

            } else {

              const errorData = await response.json();

              console.error('? Failed to delete custom subtask', { error: errorData });

            }

          } catch (error) {

            console.error('? Exception deleting custom subtask', { error });

          }

        }

      }

      

      console.log('? handleApplySubtaskChangesToThisDay - COMPLETE', {

        createdCustomSubtasks: pendingSubtaskChanges.added.length,

        hiddenMasterSubtasks: pendingSubtaskChanges.removed.filter(s => s.type === 'master').length,

        deletedCustomSubtasks: pendingSubtaskChanges.removed.filter(s => s.type === 'custom').length

      });

      

      // 3. Limpiar estado

      setPendingSubtaskChanges(null);

      await refreshEvents();

      setModalVisible(false);

      handleCloseModal();

      

      console.log('? SubtaskChangesModal - Se ejecutó correctamente "Solo este día"');

      // Colores vienen desde backend; no recargar en masa

      

    } catch (error) {

      console.error('? Error al liberar evento:', error);

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

      

      console.log('? SubtaskChangesModal - Se ejecutó correctamente "Toda la serie"');

      // Colores vienen desde backend; no recargar en masa

      

    } catch (error) {

      console.error('Error al aplicar cambios a la serie:', error);

      Alert.alert('Error', 'No se pudieron aplicar los cambios a toda la serie');

    }

  }, [selectedEvent, pendingSubtaskChanges]);






  // ===== REFS Y CONFIGURACIÓN =====

  const resizeLockRef = useRef<Set<string>>(new Set());

  const verticalScrollRef = useRef<ScrollView | null>(null);

  const contentHorizontalRef = useRef<ScrollView | null>(null);

  const headerHorizontalRef = useRef<ScrollView | null>(null);

  const horizontalOffsetRef = useRef(0);

  const availableColors = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#9c27b0'];






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



  const formatHeaderDate = useCallback(() => {

    const d = new Date(currentDate);

    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];



    if (currentView === 'day') {

      const localDay = d.getDate();

      const localMonth = d.getMonth();

      const localDayName = dayNames[d.getDay()];

      return `Hoy, ${localDayName}, ${localDay} de ${monthNames[localMonth]}`;

    } else if (currentView === 'week') {

      const weekStart = startOfWeek(currentDate);

      const weekMonth = weekStart.getMonth();

      const weekMonthName = monthNames[weekMonth];

      const dayOfMonth = weekStart.getDate();

      const weekNumber = Math.ceil(dayOfMonth / 7);

      const capitalizedMonth = weekMonthName.charAt(0).toUpperCase() + weekMonthName.slice(1);

      return `Semana ${weekNumber}, ${capitalizedMonth}`;

    } else if (currentView === 'month') {

      const formatted = d.toLocaleString('es-ES', { month: 'long' });

      return `${formatted.charAt(0).toUpperCase() + formatted.slice(1)} ${d.getFullYear()}`;

    } else if (currentView === 'year') {

      return `${d.getFullYear()}`;

    }

    return '';

  }, [currentView, currentDate, startOfWeek]);

  const timeSlots = useMemo(() => {

    const slots: string[] = [];

    for (let hour = userStartHour; hour < userEndHour; hour++) {

      slots.push(`${hour.toString().padStart(2, '0')}:00`);

      slots.push(`${hour.toString().padStart(2, '0')}:30`);

    }

    console.log(`? TimeSlots recalculados: ${slots.length} slots desde ${userStartHour}:00 hasta ${userEndHour === 24 ? '00:00' : userEndHour + ':00'}`);

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

      detail = days ? ` • ${days}` : '';

    } else if (recurrenceConfig.mode === 'monthly') {

      const days = recurrenceConfig.monthDays.join(', ');

      detail = days ? ` • Días ${days}` : '';

    }



    const endText = recurrenceConfig.hasEndDate && recurrenceConfig.endDate ? ` • hasta ${formatDateKey(recurrenceConfig.endDate)}` : '';



    return `${RECURRENCE_MODE_LABEL[recurrenceConfig.mode]} • ${intervalText}${detail}${endText}`;

  }, [recurrenceConfig]);



  // Obtener ancho de celda

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

          console.log('[Calendar] Tutorial: Debes hacer clic en una celda vacía, no en un evento existente');

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

    if (isSaving) {

      console.log('[Calendar]  handleSaveEvent - Ignored (isSaving=true)');

      return;

    }

    setIsSaving(true);

    try {

    // CRÍTICO: Detectar tutorial ANTES de cualquier validación

    // Debe detectarse cuando se presiona el botón, independientemente de si pasa las validaciones

    if (tutorialVisible && !tutorialCompleted) {

      const currentStepData = calendarTutorialSteps[tutorialStep] as any;

      console.log('[Calendar] handleSaveEvent - Tutorial check:', {

        step: tutorialStep,

        objective: currentStepData?.objective,

        id: currentStepData?.id,

      });

      

      if (currentStepData?.objective === 'press-create-button') {

        console.log('? Objetivo cumplido: press-create-button (botón presionado)');

        // Avanzar inmediatamente cuando se presiona el botón crear

        setTimeout(() => handleTutorialNext(), 500);

      } else if (currentStepData?.objective === 'save-event-with-subtasks') {

        // Verificar que hay subtareas antes de avanzar

        if (subtasks.length >= 2) {

          console.log('? Objetivo cumplido: save-event-with-subtasks');

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

      

      console.log('[Calendar] handleSaveEvent - Checking subtask changes', {

        isRecurringInstance,

        hasChanges,

        changesDetail: changes

      });

      

      if (hasChanges) {

        // Guardar cambios pendientes y mostrar modal

        console.log('[Calendar] handleSaveEvent - SHOWING MODAL for subtask changes');

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

    const hasTimeChange = selectedEvent && (

      (customDateKey !== null && customDateKey !== selectedEvent.date) ||

      (customStartTime !== null && customStartTime !== selectedEvent.startTime)

    );

    const hasRealChanges = selectedEvent && (

      eventTitle !== selectedEvent.title ||

      eventDescription !== (selectedEvent.description || '') ||

      eventColor !== selectedEvent.color ||

      hasTimeChange

      // Agregar más campos si es necesario

    );

    

    console.log('[Calendar] handleSaveEvent - Change detection', {

      hasSelectedEvent: !!selectedEvent,

      hasRealChanges,

      timeChanged: hasTimeChange,

      titleChanged: selectedEvent ? eventTitle !== selectedEvent.title : 'N/A',

      descChanged: selectedEvent ? eventDescription !== (selectedEvent.description || '') : 'N/A',

      colorChanged: selectedEvent ? eventColor !== selectedEvent.color : 'N/A'

    });



    // Si NO hay cambios reales y NO hay cambios estructurales en subtareas ? solo cerrar modal

    if (!isNewEvent && !hasRealChanges && isRecurringInstance) {

      const { hasChanges: hasSubtaskChanges } = detectSubtaskStructuralChanges();

      

      if (!hasSubtaskChanges) {

        console.log('? handleSaveEvent - No real changes detected, closing modal without recreating event');

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



    // NUEVA LÓGICA: Detectar si estamos editando recurrencia en un evento que viene de una serie

    // NOTA: Un evento liberado (sin series_id local) que se le aplica recurrencia debe crear nueva serie independiente

    const isEditingRecurrenceOnSeriesEvent = !isNewEvent && 

      selectedEvent && 

      'startTime' in selectedEvent && 

      (selectedEvent.series_id || selectedEvent.original_start_utc) && 

      recurrenceConfig.enabled;



    // CASO CRÍTICO: Mover/cambiar hora de una instancia de serie

    // - Si es instancia virtual (id tipo "serieId_YYYY-MM-DD"): crear override nuevo

    // - Si ya es override real (id numérico con series_id): actualizar el override existente

    const isVirtualInstance = selectedEvent && typeof selectedEvent.id === 'string' && selectedEvent.id.includes('_');

    if (selectedEvent && !isNewEvent && 'startTime' in selectedEvent && (selectedEvent.series_id || selectedEvent.original_start_utc) && hasTimeChange) {

      try {

        const seriesId = selectedEvent.series_id ? Number(selectedEvent.series_id) : null;

        if (!seriesId) throw new Error('No series_id for recurring instance');



        // Fecha/hora destino

        const eventDate = customDateKey || selectedEvent.date;

        const eventStartTime = customStartTime !== null ? customStartTime : selectedEvent.startTime;

        const eventDuration = selectedEvent.duration || 30;



        const eventStartTimeFromStartHour = eventStartTime + (userStartHour - START_HOUR) * 60;

        const eventEndTimeFromStartHour = (eventStartTime + eventDuration) + (userStartHour - START_HOUR) * 60;



        const baseStartLocal = dateKeyToLocalDate(eventDate, eventStartTimeFromStartHour);

        const baseEndLocal = dateKeyToLocalDate(eventDate, eventEndTimeFromStartHour);



        // Calcular original_start_utc del día original de la instancia

        let originalStartUtc = selectedEvent.original_start_utc || null;

        if (!originalStartUtc) {

          const originalStartTimeFromStartHour = selectedEvent.startTime + (userStartHour - START_HOUR) * 60;

          const originalStartLocal = dateKeyToLocalDate(selectedEvent.date, originalStartTimeFromStartHour);

          originalStartUtc = originalStartLocal.toISOString();

        }



        const calendarId = (await apiGetCalendars())?.data?.[0]?.id;

        if (!calendarId) throw new Error('No hay calendars disponibles');



        if (isVirtualInstance) {

          const overridePayload: any = {

            calendar_id: calendarId,

            title: eventTitle,

            description: eventDescription,

            start_utc: baseStartLocal.toISOString(),

            end_utc: baseEndLocal.toISOString(),

            color: eventColor,

            is_recurring: false,

            series_id: seriesId,

            original_start_utc: originalStartUtc

          };



          const postRes = await apiPostEvent(overridePayload);

          const created = await postRes.json();



          if (postRes.ok && created?.data?.id) {

            const newOverrideId = String(created.data.id);

            // Migrar subtareas/estado de instancia al override nuevo

            await migrateSubtasks(String(selectedEvent.id), newOverrideId, selectedEvent, {

              ...selectedEvent,

              id: newOverrideId,

              series_id: seriesId,

              is_recurring: false,

              startTime: eventStartTime,

              duration: eventDuration,

              date: eventDate,

              original_start_utc: originalStartUtc

            } as any);



            await refreshEvents();

            setModalVisible(false);

            setEventTitle('');

            setEventDescription('');

            setSelectedEvent(null);

            setSelectedCell(null);

            setSelectedMonthCell(null);

            setRecurrenceConfig(createDefaultRecurrenceConfig());

            setCustomDateKey(null);

            setCustomStartTime(null);

            return;

          }

        } else {

          // Override real: solo actualizar horas/fecha del override existente

          const updatePayload = {

            title: eventTitle,

            description: eventDescription,

            start_utc: baseStartLocal.toISOString(),

            end_utc: baseEndLocal.toISOString(),

            color: eventColor,

            is_recurring: false,

            series_id: seriesId,

            original_start_utc: originalStartUtc

          };

          const updateRes = await apiPutEvent(String(selectedEvent.id), updatePayload);

          if (updateRes.ok) {

            await refreshEvents();

            setModalVisible(false);

            setEventTitle('');

            setEventDescription('');

            setSelectedEvent(null);

            setSelectedCell(null);

            setSelectedMonthCell(null);

            setRecurrenceConfig(createDefaultRecurrenceConfig());

            setCustomDateKey(null);

            setCustomStartTime(null);

            return;

          }

        }

      } catch (error) {

        Alert.alert('Error', 'No se pudo mover la instancia de la serie.');

        return;

      }

    }





    if (isEditingRecurrenceOnSeriesEvent) {

      

      

      try {

        // 1. Crear nuevo evento recurrente independiente

        // Usar fecha/hora personalizada si existe, de lo contrario usar la del evento

        const eventDate = customDateKey || (selectedEvent && 'date' in selectedEvent ? selectedEvent.date : '');

        const eventStartTime = customStartTime !== null ? customStartTime : (selectedEvent && 'startTime' in selectedEvent ? selectedEvent.startTime : 0);

        const eventDuration = selectedEvent && 'duration' in selectedEvent ? selectedEvent.duration : 30;

        

        // FIX: Convertir eventStartTime (en minutos desde userStartHour) a minutos desde START_HOUR

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

          console.log('[Calendar] handleSaveEvent - Migrating subtasks after creating new recurring event');

          

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

      // NUEVA LÓGICA: Si el usuario activa recurrencia en un evento único,

      // crear una nueva serie independiente en lugar de solo actualizar.

      if ('startTime' in selectedEvent && 

          !selectedEvent.series_id && 

          !selectedEvent.original_start_utc &&

          recurrenceConfig.enabled) {

        



        

        try {

          // 1. Crear nuevo evento (con o sin recurrencia)

          // Usar fecha/hora personalizada si existe, de lo contrario usar la del evento

          const eventDate = customDateKey || (selectedEvent && 'date' in selectedEvent ? selectedEvent.date : '');

          const eventStartTime = customStartTime !== null ? customStartTime : (selectedEvent && 'startTime' in selectedEvent ? selectedEvent.startTime : 0);

          const eventDuration = selectedEvent && 'duration' in selectedEvent ? selectedEvent.duration : 30;

          

          // FIX: Convertir eventStartTime (en minutos desde userStartHour) a minutos desde START_HOUR

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

            console.log('[Calendar] handleSaveEvent - Migrating subtasks after converting to recurring');



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

        

        // NUEVO: Enviar actualización al servidor

        try {

          // Usar fecha/hora personalizada si existe, de lo contrario usar la del evento

          const eventDate = customDateKey || (selectedEvent && 'date' in selectedEvent ? selectedEvent.date : '');

          const eventStartTime = customStartTime !== null ? customStartTime : (selectedEvent && 'startTime' in selectedEvent ? selectedEvent.startTime : 0);

          const eventDuration = selectedEvent && 'duration' in selectedEvent ? selectedEvent.duration : 30;

          

          // FIX: Convertir eventStartTime (en minutos desde userStartHour) a minutos desde START_HOUR

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

              setMonthEvents(prev => prev.map(ev => ev.id === String(selectedEvent.id) ? {

                ...ev,

                title: eventTitle,

                description: eventDescription,

                color: eventColor

              } : ev));

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

        // FIX: Convertir finalStartTime (en minutos desde userStartHour) a minutos desde START_HOUR

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

    } finally {

      setIsSaving(false);

    }

  }, [eventTitle, eventDescription, eventColor, selectedEvent, selectedCell, selectedMonthCell, currentView, currentDate, recurrenceConfig, subtasks, migrateSubtasks, monthEventFrontendToBackend, refreshMonthEvents, getRandomColor, tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext, calendarTutorialSteps, isSaving, customDateKey, customStartTime, userStartHour]);



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

        // Pequeño delay para asegurar que el layout está listo

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

  const navigationRequestRef = useRef(0);

  const refreshSubtasksColors = useCallback(() => {

    loadAllEventsSubtasks(events, true).then(() => {

      // console.log('[Calendar] refreshSubtasksColors - COMPLETE');

    }).catch((error) => {

      console.log('[Calendar] refreshSubtasksColors - Error:', error instanceof Error ? error.message : String(error));

    });

  }, [loadAllEventsSubtasks, events]);



  // Función para recargar con delay (para evitar conflictos con la DB)

  const refreshSubtasksColorsWithDelay = useCallback(() => {

    setTimeout(() => {

      refreshSubtasksColors();

    }, 3000); // 3 segundos de delay

  }, [refreshSubtasksColors]);



  const navigateDate = useCallback(async (direction: 'prev' | 'next') => {

    const baseDate = currentDateRef.current;

    console.log('[Calendar] navigateDate - START', {

      currentDate: baseDate.toISOString().slice(0, 10),

      currentView,

      direction,

      eventsCount: events.length,

      timestamp: new Date().toISOString()

    });



    if (currentView === 'day') {

      const newDate = addDays(baseDate, direction === 'next' ? 1 : -1);

      console.log('[Calendar] navigateDate - Day navigation', {

        oldDate: baseDate.toISOString().slice(0, 10),

        newDate: newDate.toISOString().slice(0, 10)

      });

      setCurrentDate(newDate);

      currentDateRef.current = newDate;

      verticalScrollRef.current?.scrollTo({ y: 0, animated: true });

      contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });

      return;

    }



    if (currentView === 'week') {

      const weekStart = startOfWeek(baseDate);

      const newWeekStart = addDays(weekStart, direction === 'next' ? 7 : -7);

      console.log('[Calendar] navigateDate - Week navigation', {

        oldWeekStart: weekStart.toISOString().slice(0, 10),

        newWeekStart: newWeekStart.toISOString().slice(0, 10)

      });

      setCurrentDate(newWeekStart);

      currentDateRef.current = newWeekStart;

      setTimeout(() => {

        contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });

        headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });

        verticalScrollRef.current?.scrollTo({ y: 0, animated: true });

      }, 20);

      return;

    }



    if (currentView === 'month') {

      const newDate = addMonths(baseDate, direction === 'next' ? 1 : -1);

      setCurrentDate(newDate);

      currentDateRef.current = newDate;

      setTimeout(() => {

        verticalScrollRef.current?.scrollTo({ y: 0, animated: true });

        contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });

        headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });

      }, 20);

      return;

    }



    if (currentView === 'year') {

      const newDate = new Date(baseDate);

      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));

      setCurrentDate(newDate);

      currentDateRef.current = newDate;

      return;

    }

  }, [currentView, addDays, addMonths, startOfWeek, events]);



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

        console.log('[Calendar] Tutorial: No se puede cambiar de vista durante este paso del tutorial');

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



    console.log('[Calendar] onResizeCommit: INICIO', {

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



    // CRÍTICO: Preservar campos de subtareas del evento original

    const originalSubtasksTotal = eventToUpdate.subtasks_total ?? eventToUpdate.subtasks_count;

    const originalSubtasksCompleted = eventToUpdate.subtasks_completed ?? eventToUpdate.subtasks_completed_count;

    const originalSubtaskStatus = eventToUpdate.subtask_status ?? computeSubtaskStatus(originalSubtasksTotal, originalSubtasksCompleted);



    // Detectar si el tutorial está esperando resize-event

    if (tutorialVisible && !tutorialCompleted && calendarTutorialSteps && calendarTutorialSteps.length > tutorialStep) {

      const currentStepData = calendarTutorialSteps[tutorialStep] as any;

      if (currentStepData?.objective === 'resize-event' && tutorialObjectiveCompletedRef.current !== 'resize-event') {

        console.log('? Objetivo cumplido: resize-event');

        tutorialObjectiveCompletedRef.current = 'resize-event';

        if (tutorialNextTimeoutRef.current) clearTimeout(tutorialNextTimeoutRef.current);

        tutorialNextTimeoutRef.current = setTimeout(() => handleTutorialNext(), 100);

      }

    }



    if (resizeLockRef.current.has(eventId)) {

      console.log('[Calendar] onResizeCommit: Evento ya está en proceso de resize, ignorando');

      return;

    }

    resizeLockRef.current.add(eventId);



    // 1. Actualización optimista de la UI (para que se vea instantáneo)

    // CRÍTICO: Preservar TODOS los campos del evento original (título, color, etc.)

    setEvents(prev => {

      const oldEvent = prev.find(ev => ev.id === eventId);

      const updatedEvents = prev.map(ev => ev.id === eventId ? { 

        ...ev, 

        startTime: newStartTime, 

        duration: newDuration,

        // FIX: Preservar título y color explícitamente

        title: eventToUpdate.title || ev.title,

        color: eventToUpdate.color || ev.color,

        description: eventToUpdate.description ?? ev.description,

        category: eventToUpdate.category || ev.category,

        // Preservar campos de subtareas

        subtasks_total: originalSubtasksTotal !== undefined ? originalSubtasksTotal : ev.subtasks_total,

        subtasks_completed: originalSubtasksCompleted !== undefined ? originalSubtasksCompleted : ev.subtasks_completed,

        subtask_status: originalSubtaskStatus || ev.subtask_status,

        subtasks_count: originalSubtasksTotal !== undefined ? originalSubtasksTotal : ev.subtasks_count,

        subtasks_completed_count: originalSubtasksCompleted !== undefined ? originalSubtasksCompleted : ev.subtasks_completed_count

      } : ev);

      

      if (oldEvent && oldEvent.duration !== newDuration) {

        console.log('[Calendar] onResizeCommit: Duración actualizada en estado', {

          eventId,

          oldDuration: oldEvent.duration,

          newDuration

        });

      }

      

      return updatedEvents;

    });



    // FIX: Convertir newStartTime (en minutos desde userStartHour) a minutos desde START_HOUR para dateKeyToLocalDate

    // newStartTime está en minutos desde userStartHour, necesitamos convertir a minutos desde START_HOUR

    const startTimeFromStartHour = newStartTime + (userStartHour - START_HOUR) * 60;

    const endTimeFromStartHour = (newStartTime + newDuration) + (userStartHour - START_HOUR) * 60;

    

    console.log('[Calendar] onResizeCommit: Conversión de tiempo', {

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

    

    console.log('[Calendar] onResizeCommit: Fechas UTC calculadas', {

      eventId: eventToUpdate.id,

      startLocal: startLocal.toISOString(),

      endLocal: endLocal.toISOString(),

      startHour: startLocal.getUTCHours(),

      startMinute: startLocal.getUTCMinutes(),

      endHour: endLocal.getUTCHours(),

      endMinute: endLocal.getUTCMinutes()

    });





    try {

        // DETECTAR SI ES INSTANCIA GENERADA DE SERIE RECURRENTE

        const match = String(eventToUpdate.id).match(/^(\d+)_(\d{4}-\d{2}-\d{2})$/);

        const isGeneratedInstance = !!match;

        



        if (isGeneratedInstance) {

            // CREAR OVERRIDE PARA INSTANCIA GENERADA

            

            const seriesId = parseInt(match[1], 10);

            

            // Calcular original_start_utc usando zona horaria de la serie

            // FIX: Convertir eventToUpdate.startTime (en minutos desde userStartHour) a minutos desde START_HOUR

            const originalStartTimeFromStartHour = eventToUpdate.startTime + (userStartHour - START_HOUR) * 60;

            const originalDate = eventToUpdate.date; // YYYY-MM-DD

            const originalStartLocal = dateKeyToLocalDate(originalDate, originalStartTimeFromStartHour);

            const originalStartUtc = originalStartLocal.toISOString();

            



            // Obtener calendar_id

            const calJson = await apiGetCalendars();

            const calendarId = calJson?.data?.[0]?.id;

            if (!calendarId) throw new Error('No calendars available');



            // Crear payload para override

            // CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)

            const hasSubtasks = (originalSubtasksTotal !== undefined && originalSubtasksTotal > 0) || 

                               (eventToUpdate.subtasks_total !== undefined && eventToUpdate.subtasks_total > 0) ||

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



            const existingOverride = findExistingOverride(seriesId, originalStartUtc);



            if (existingOverride) {

                const overrideId = String(existingOverride.id);

                // Actualizar override existente en lugar de crear otro

                const updateRes = await apiPutEventTimes(overrideId, startLocal.toISOString(), endLocal.toISOString());

                if (!updateRes.ok) {

                  throw new Error(`Override update failed: ${updateRes.status}`);

                }



                // Reemplazar instancia generada por el override existente (evita duplicados)

                setEvents(prev => {

                  const withoutGenerated = prev.filter(e => e.id !== eventId);

                  const updatedOverride: Event = {

                    ...(existingOverride as Event),

                    startTime: newStartTime,

                    duration: newDuration,

                    date: eventToUpdate.date,

                    is_recurring: false,

                    series_id: seriesId,

                    original_start_utc: originalStartUtc,

                    subtasks_total: originalSubtasksTotal ?? existingOverride.subtasks_total,

                    subtasks_completed: originalSubtasksCompleted ?? existingOverride.subtasks_completed,

                    subtask_status: originalSubtaskStatus ?? existingOverride.subtask_status,

                    subtasks_count: originalSubtasksTotal ?? existingOverride.subtasks_count,

                    subtasks_completed_count: originalSubtasksCompleted ?? existingOverride.subtasks_completed_count

                  };

                  const hasOverride = withoutGenerated.some(e => e.id === overrideId);

                  return hasOverride

                    ? withoutGenerated.map(e => (e.id === overrideId ? updatedOverride : e))

                    : [...withoutGenerated, updatedOverride];

                });

            } else {

                const createRes = await apiPostEvent(overridePayload);

                const body = await createRes.json();



                if (createRes.ok && body?.data?.id) {

                    const overrideId = String(body.data.id);



                // CRÍTICO: Migrar subtareas del evento original al override

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

                  console.log('[Calendar] Error migrando subtareas en resize:', migrationError);

                }



                // Reemplazar la instancia temporal con el override del servidor

                // CRÍTICO: Preservar campos de subtareas y series_id al reemplazar

                setEvents(prev => prev.map(e => 

                    e.id === eventId 

                        ? { 

                            ...e, 

                            id: overrideId, 

                            is_recurring: false,

                            series_id: seriesId, // FIX: Preservar series_id para que loadSubtasks detecte como instancia

                            // Preservar campos de subtareas (se recargarán después)

                            subtasks_total: originalSubtasksTotal,

                            subtasks_completed: originalSubtasksCompleted,

                            subtask_status: originalSubtaskStatus,

                            subtasks_count: originalSubtasksTotal,

                            subtasks_completed_count: originalSubtasksCompleted

                          }

                        : e

                ));



                // CRÍTICO: Recargar conteos de subtareas después de crear override

                setTimeout(async () => {

                  try {

                    // Obtener el evento actualizado para pasarlo a loadSubtasks

                    const currentEvent = eventsRef.current.find(e => e.id === overrideId);

                    console.log('[Calendar] onResizeCommit - Recargando subtareas', {

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

                        console.log('[Calendar] onResizeCommit - Actualizando conteos de subtareas', {

                          overrideId,

                          total,

                          completed,

                          seriesId: prev.find(e => e.id === overrideId)?.series_id

                        });

                        const status = computeSubtaskStatus(total, completed);

                        return prev.map(e => {

                          if (e.id === overrideId) {

                            return {

                              ...e,

                              subtasks_total: total,

                              subtasks_completed: completed,

                              subtask_status: status,

                              subtasks_count: total,

                              subtasks_completed_count: completed,

                              // FIX: Asegurar que series_id se preserve

                              series_id: e.series_id || seriesId

                            };

                          }

                          return e;

                        });

                      }

                      return prev;

                    });

                  } catch (error) {

                    console.log('[Calendar] Error recargando conteos de subtareas:', error);

                  }

                }, 500);

                } else {

                    throw new Error(`Override creation failed: ${JSON.stringify(body)}`);

                }

            }

        } else {

            // FLUJO NORMAL: Evento existente en servidor

            const res = await apiPutEventTimes(eventId, startLocal.toISOString(), endLocal.toISOString());



            if (res.status === 404) {

                // FALLBACK: El evento no existía en el servidor, lo creamos

                const calJson = await apiGetCalendars();

                const calendarId = calJson?.data?.[0]?.id;

                if (!calendarId) throw new Error('No calendars available');



                // CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)

                const hasSubtasks = (originalSubtasksTotal !== undefined && originalSubtasksTotal > 0) || 

                                   (eventToUpdate.subtasks_total !== undefined && eventToUpdate.subtasks_total > 0) ||

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

                    // CRÍTICO: Preservar campos de subtareas

                    setEvents(prev => prev.map(e => (e.id === eventId ? { 

                      ...e, 

                      id: serverId,

                      subtasks_total: originalSubtasksTotal,

                      subtasks_completed: originalSubtasksCompleted,

                      subtask_status: originalSubtaskStatus,

                      subtasks_count: originalSubtasksTotal,

                      subtasks_completed_count: originalSubtasksCompleted

                    } : e)));



                    // Reintentamos el guardado de la hora correcta con el nuevo ID

                    const retryRes = await apiPutEventTimes(serverId, startLocal.toISOString(), endLocal.toISOString());

                    if (!retryRes.ok) throw new Error('Failed to update after fallback create');



                    // CRÍTICO: Recargar conteos de subtareas después de actualizar

                    setTimeout(async () => {

                      try {

                        await loadSubtasks(serverId, undefined, true);

                      } catch (error) {

                        console.log('[Calendar] Error recargando conteos de subtareas:', error);

                      }

                    }, 500);

                } else {

                    throw new Error('Fallback POST failed');

                }

            } else if (!res.ok) {

                throw new Error(`API error: ${res.status}`);

            } else {

                // CRÍTICO: Recargar conteos de subtareas después de actualizar evento existente

                setTimeout(async () => {

                  try {

                    await loadSubtasks(eventId, eventToUpdate, true);

                  } catch (error) {

                    console.log('[Calendar] Error recargando conteos de subtareas:', error);

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

  }, [migrateSubtasks, loadSubtasks, subtasksCache, tutorialVisible, tutorialCompleted, tutorialStep, handleTutorialNext, userStartHour, computeSubtaskStatus, findExistingOverride]);



  // Callback de commit desde bloque movible

  const onMoveCommit = useCallback(async (eventToUpdate: Event, newStartTime: number, newDate: string) => {

    const eventId = eventToUpdate.id;



    // CRÍTICO: Preservar campos de subtareas del evento original

    const originalSubtasksTotal = eventToUpdate.subtasks_total ?? eventToUpdate.subtasks_count;

    const originalSubtasksCompleted = eventToUpdate.subtasks_completed ?? eventToUpdate.subtasks_completed_count;

    const originalSubtaskStatus = eventToUpdate.subtask_status ?? computeSubtaskStatus(originalSubtasksTotal, originalSubtasksCompleted);



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



    // FIX: Leer la duración actualizada del estado en lugar de usar eventToUpdate.duration

    // Esto asegura que si hubo un resize antes del drag, se use la duración correcta

    const currentEvent = eventsRef.current.find(ev => ev.id === eventId);

    const currentDuration = currentEvent?.duration ?? eventToUpdate.duration;

    

    if (currentEvent && currentEvent.duration !== eventToUpdate.duration) {

      console.log('[Calendar] onMoveCommit: Duración actualizada detectada', {

        eventId,

        oldDuration: eventToUpdate.duration,

        newDuration: currentEvent.duration

      });

    }



    // 1. Actualización optimista de la UI

    // CRÍTICO: Preservar campos de subtareas en la actualización optimista

    setEvents(prev => prev.map(ev => 

      ev.id === eventId 

        ? { 

            ...ev, 

            startTime: newStartTime, 

            date: newDate,

            // Preservar campos de subtareas

            subtasks_total: originalSubtasksTotal !== undefined ? originalSubtasksTotal : ev.subtasks_total,

            subtasks_completed: originalSubtasksCompleted !== undefined ? originalSubtasksCompleted : ev.subtasks_completed,

            subtask_status: originalSubtaskStatus || ev.subtask_status,

            subtasks_count: originalSubtasksTotal !== undefined ? originalSubtasksTotal : ev.subtasks_count,

            subtasks_completed_count: originalSubtasksCompleted !== undefined ? originalSubtasksCompleted : ev.subtasks_completed_count

          }

        : ev

    ));



    // Calcular nuevos timestamps UTC usando la duración actualizada

    // FIX: Convertir newStartTime (en minutos desde userStartHour) a minutos desde START_HOUR para dateKeyToLocalDate

    const startTimeFromStartHour = newStartTime + (userStartHour - START_HOUR) * 60;

    const endTimeFromStartHour = (newStartTime + currentDuration) + (userStartHour - START_HOUR) * 60;

    

    const startLocal = dateKeyToLocalDate(newDate, startTimeFromStartHour);

    const endLocal = dateKeyToLocalDate(newDate, endTimeFromStartHour);

    

    console.log('[Calendar] onMoveCommit: Calculando endLocal', {

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

        // FIX: Convertir eventToUpdate.startTime (en minutos desde userStartHour) a minutos desde START_HOUR

        const originalStartTimeFromStartHour = eventToUpdate.startTime + (userStartHour - START_HOUR) * 60;

        const originalDate = eventToUpdate.date; // YYYY-MM-DD

        const originalStartLocal = dateKeyToLocalDate(originalDate, originalStartTimeFromStartHour);

        const originalStartUtc = originalStartLocal.toISOString();

        

        

        const calJson = await apiGetCalendars();

        const calendarId = calJson?.data?.[0]?.id;

        if (!calendarId) throw new Error('No calendars available');



        // CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)

        const hasSubtasks = (originalSubtasksTotal !== undefined && originalSubtasksTotal > 0) || 

                           (eventToUpdate.subtasks_total !== undefined && eventToUpdate.subtasks_total > 0) ||

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



        const existingOverride = findExistingOverride(seriesId, originalStartUtc);



        if (existingOverride) {

          const overrideId = String(existingOverride.id);

          const updateRes = await apiPutEventTimes(overrideId, startLocal.toISOString(), endLocal.toISOString());

          if (!updateRes.ok) {

            throw new Error(`Override update failed: ${updateRes.status}`);

          }



          setEvents(prev => {

            const withoutGenerated = prev.filter(e => e.id !== eventId);

            const updatedOverride: Event = {

              ...(existingOverride as Event),

              startTime: newStartTime,

              date: newDate,

              duration: currentDuration,

              is_recurring: false,

              series_id: seriesId,

              original_start_utc: originalStartUtc,

              subtasks_total: originalSubtasksTotal ?? existingOverride.subtasks_total,

              subtasks_completed: originalSubtasksCompleted ?? existingOverride.subtasks_completed,

              subtask_status: originalSubtaskStatus ?? existingOverride.subtask_status,

              subtasks_count: originalSubtasksTotal ?? existingOverride.subtasks_count,

              subtasks_completed_count: originalSubtasksCompleted ?? existingOverride.subtasks_completed_count

            };

            const hasOverride = withoutGenerated.some(e => e.id === overrideId);

            return hasOverride

              ? withoutGenerated.map(e => (e.id === overrideId ? updatedOverride : e))

              : [...withoutGenerated, updatedOverride];

          });

        } else {

          const createRes = await apiPostEvent(overridePayload);

          const body = await createRes.json();



          if (createRes.ok && body?.data?.id) {

            const overrideId = String(body.data.id);



          // CRÍTICO: Migrar subtareas del evento original al override

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

            console.log('[Calendar] Error migrando subtareas en move:', migrationError);

          }



          // CRÍTICO: Preservar campos de subtareas y series_id al reemplazar

          setEvents(prev => prev.map(e => 

            e.id === eventId 

              ? { 

                  ...e, 

                  id: overrideId, 

                  is_recurring: false,

                  series_id: seriesId, // FIX: Preservar series_id para que loadSubtasks detecte como instancia

                  // Preservar campos de subtareas (se recargarán después)

                  subtasks_total: originalSubtasksTotal,

                  subtasks_completed: originalSubtasksCompleted,

                  subtask_status: originalSubtaskStatus,

                  subtasks_count: originalSubtasksTotal,

                  subtasks_completed_count: originalSubtasksCompleted

                }

              : e

          ));



          // CRÍTICO: Recargar conteos de subtareas después de crear override

          setTimeout(async () => {

            try {

              // Obtener el evento actualizado para pasarlo a loadSubtasks

              const currentEvent = eventsRef.current.find(e => e.id === overrideId);

              console.log('[Calendar] onMoveCommit - Recargando subtareas', {

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

                  console.log('[Calendar] onMoveCommit - Actualizando conteos de subtareas', {

                    overrideId,

                    total,

                    completed,

                    seriesId: prev.find(e => e.id === overrideId)?.series_id

                  });

                  const status = computeSubtaskStatus(total, completed);

                  return prev.map(e => {

                    if (e.id === overrideId) {

                      return {

                        ...e,

                        subtasks_total: total,

                        subtasks_completed: completed,

                        subtask_status: status,

                        subtasks_count: total,

                        subtasks_completed_count: completed,

                        // FIX: Asegurar que series_id se preserve

                        series_id: e.series_id || seriesId

                      };

                    }

                    return e;

                  });

                }

                return prev;

              });

            } catch (error) {

              console.log('[Calendar] Error recargando conteos de subtareas:', error);

            }

          }, 500);

          } else {

            throw new Error(`Move override creation failed: ${JSON.stringify(body)}`);

          }

        }

      } else {

        // Evento existente - actualizar directamente

        const res = await apiPutEventTimes(eventId, startLocal.toISOString(), endLocal.toISOString());

        

        if (res.status === 404) {

          // Fallback: crear nuevo evento

          const calJson = await apiGetCalendars();

          const calendarId = calJson?.data?.[0]?.id;

          if (!calendarId) throw new Error('No calendars available');



          // CRÍTICO: No enviar color si el evento tiene subtareas (se maneja automáticamente)

          const hasSubtasks = (originalSubtasksTotal !== undefined && originalSubtasksTotal > 0) || 

                             (eventToUpdate.subtasks_total !== undefined && eventToUpdate.subtasks_total > 0) ||

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

            // CRÍTICO: Preservar campos de subtareas

            setEvents(prev => prev.map(e => (e.id === eventId ? { 

              ...e, 

              id: serverId,

              subtasks_total: originalSubtasksTotal,

              subtasks_completed: originalSubtasksCompleted,

              subtask_status: originalSubtaskStatus,

              subtasks_count: originalSubtasksTotal,

              subtasks_completed_count: originalSubtasksCompleted

            } : e)));



            // CRÍTICO: Recargar conteos de subtareas después de crear evento

            setTimeout(async () => {

              try {

                await loadSubtasks(serverId, undefined, true);

              } catch (error) {

                console.log('[Calendar] Error recargando conteos de subtareas:', error);

              }

            }, 500);

          } else {

            throw new Error('Fallback POST failed');

          }

        } else if (!res.ok) {

          throw new Error(`API error: ${res.status}`);

        } else {

          // CRÍTICO: Recargar conteos de subtareas después de actualizar evento existente

          setTimeout(async () => {

            try {

              await loadSubtasks(eventId, eventToUpdate, true);

            } catch (error) {

              console.log('[Calendar] Error recargando conteos de subtareas:', error);

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

  }, [migrateSubtasks, loadSubtasks, subtasksCache, userStartHour, computeSubtaskStatus, findExistingOverride]); // CRÍTICO: Agregar dependencias necesarias



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

    console.log('[Calendar] onQuickPress - Event tapped', {

      eventId: event.id,

      title: event.title,

      is_recurring: event.is_recurring,

      series_id: event.series_id,

      original_start_utc: event.original_start_utc

    });

    

    // TOUCH_EVENT - EventResizableBlock

    const timestamp = new Date().toISOString();



    setSelectedEvent(event);

    setEventTitle(event.title);

    setEventDescription(event.description || '');

    setEventColor(event.color);

    setRecurrenceConfig(extractRecurrenceFromEvent(event));

    setModalVisible(true);

    

    // Cargar subtareas del evento (siempre forzar reload para ver cambios recientes)

    console.log('[Calendar] onQuickPress - About to load subtasks', {

      eventId: event.id,

      forceReload: true

    });

    loadSubtasks(event.id, event, true);

  }, [loadSubtasks]);






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

                  const slotStartTime = userStartHour * 60 + (timeIndex * 30);

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

                        console.log('[Calendar] CALENDAR DEBUG: Click en celda (día):', {

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

                          // FIX: Si hubo long press activo en este evento, no abrir modal al soltar

                          if (longPressActiveRef.current[event.id]) {

                            return;

                          }

                          // Editar evento existente

                          onQuickPress(event);

                        }

                      }}

                      onPressIn={() => {

                        if (event) {

                          markEventPressIn(event.id);

                        }

                      }}

                      onPressOut={() => {

                        if (event) {

                          markEventPressOut(event.id);

                        }

                      }}

                      onLongPress={() => {

                        // LONG PRESS para eventos en vista de día

                        if (event) {

                          if (!shouldAllowLongPress(event.id, 1900)) {

                            return;

                          }

                          // Usar el handler del EventResizableBlock si existe

                          const handler = eventLongPressHandlers[event.id];

                          if (handler) {

                            handler();

                          }

                        }

                      }}

                      delayLongPress={2000}

                    >

                      {(() => {

                        // FIX: Renderizar EventResizableBlock solo en la celda donde el evento empieza

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

                        

                        // FIX: Buscar eventos que ocupan esta celda pero empiezan antes

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

                        

                        // FIX: Renderizar drag handler en celdas intermedias

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

                        

                        // FIX: Renderizar bloque extendido SOLO en la última celda para el handler de abajo

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

                    const slotStartTime = userStartHour * 60 + (timeIndex * 30);

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

                              onPressIn={() => {

                                // Registrar press para long press correcto

                                let pressEvent = event;

                                if (!pressEvent) {

                                  for (let i = 0; i < 48; i++) {

                                    const checkTime = startTime - (i * 30);

                                    if (checkTime < 0) break;

                                    const checkKey = `${dateKey}-${checkTime}`;

                                    const checkEvent = eventsByCell[checkKey];

                                    if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {

                                      pressEvent = checkEvent;

                                      break;

                                    }

                                  }

                                }

                                if (pressEvent) {

                                  markEventPressIn(pressEvent.id);

                                }

                              }}

                              onPressOut={() => {

                                let pressEvent = event;

                                if (!pressEvent) {

                                  for (let i = 0; i < 48; i++) {

                                    const checkTime = startTime - (i * 30);

                                    if (checkTime < 0) break;

                                    const checkKey = `${dateKey}-${checkTime}`;

                                    const checkEvent = eventsByCell[checkKey];

                                    if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {

                                      pressEvent = checkEvent;

                                      break;

                                    }

                                  }

                                }

                                if (pressEvent) {

                                  markEventPressOut(pressEvent.id);

                                }

                              }}

                              onPress={() => {

                              // TOUCH_EVENT - WeekViewCell

                              const timestamp = new Date().toISOString();

                              // FIX: Verificar si hay un evento que ocupa esta celda

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

                              

                              

                              

                              // FIX: Solo ejecutar handleCellPress si NO hay evento ocupando esta celda

                              if (!hasOccupyingEvent) {

                                handleCellPress(dayIndex, timeIndex);

                              } else {

                                // FIX: Si hay un evento ocupando la celda, abrir su modal

                                if (occupyingEvent) {

                                  // FIX: Si hubo long press activo en este evento, no abrir modal al soltar

                                  if (longPressActiveRef.current[occupyingEvent.id]) {

                                    return;

                                  }

                                  onQuickPress(occupyingEvent);

                                }

                              }

                            }}

                            onLongPress={() => {

                              // LONG PRESS para eventos extendidos

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

                                if (!shouldAllowLongPress(occupyingEvent.id, 1900)) {

                                  return;

                                }

                                console.log('[Calendar] LONG PRESS DETECTED - Extended Event:', occupyingEvent.title, 'ID:', occupyingEvent.id);

                                

                                // Usar el handler del EventResizableBlock si existe

                                const handler = eventLongPressHandlers[occupyingEvent.id];

                                if (handler) {

                                  handler();

                                }

                              }

                            }}

                            delayLongPress={2000}

                          >

                            {(() => {

                              // FIX: Renderizar EventResizableBlock solo en la celda donde el evento empieza

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

                              

                              // FIX: Buscar eventos que ocupan esta celda pero empiezan antes

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

                              

                              // FIX: Renderizar drag handler en celdas intermedias

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

                              

                              // FIX: Renderizar bloque extendido SOLO en la última celda para el handler de abajo

                              if (occupyingEvent && !isFirstCell && isLastCell) {

                                // Debug log comentado - Extended Block

                                // console.log('[Calendar] DEBUG - Extended Block (LAST CELL):', {

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

        selectedMonthCell={selectedMonthCell}

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

          added: pendingSubtaskChanges?.added.length ?? 0,

          removed: pendingSubtaskChanges?.removed.length ?? 0,

          modified: pendingSubtaskChanges?.modified.length ?? 0,

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

          <Text style={celebrationStyles.emoji}>*</Text>

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







