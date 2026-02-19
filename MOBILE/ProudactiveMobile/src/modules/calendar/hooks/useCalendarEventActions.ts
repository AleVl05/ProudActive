import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import type { Event, SelectedCell } from '@/types/calendarTypes';
import type { MonthEvent } from '@/components/calendar/monthEventHelpers';
import { START_HOUR } from '@/utils/dateConstants';
import { dateKeyToLocalDate } from '@/utils/dateUtils';
import {
  apiGetCalendars,
  apiPostEvent,
  apiDeleteEvent,
  apiDeleteMonthEvent
} from '@/modules/calendar/services/calendarEventsService';

interface UseCalendarEventActionsParams {
  selectedEvent: Event | MonthEvent | null;
  setSelectedEvent: Dispatch<SetStateAction<Event | MonthEvent | null>>;
  setSelectedCell: Dispatch<SetStateAction<SelectedCell | null>>;
  events: Event[];
  userStartHour: number;
  refreshEvents: () => Promise<void>;
  refreshMonthEvents: () => Promise<void>;
  migrateSubtasks: (fromEventId: string, toEventId: string, event: Event) => Promise<void>;
  setModalVisible: Dispatch<SetStateAction<boolean>>;
  setDeleteModalVisible: Dispatch<SetStateAction<boolean>>;
  setEventTitle: Dispatch<SetStateAction<string>>;
  setEventDescription: Dispatch<SetStateAction<string>>;
}

export function useCalendarEventActions({
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
}: UseCalendarEventActionsParams) {
  // ===== DUPLICAR EVENTO =====
  const handleDuplicateEvent = useCallback(async (event: Event) => {
    try {
      const slot = 30; // +30m debajo
      const dayMinutes = 24 * 60;
      const newStartTimeRaw = event.startTime + event.duration + slot;
      const safeStart = Math.min(newStartTimeRaw, dayMinutes - event.duration);

      // FIX: Convertir safeStart (en minutos desde userStartHour) a minutos desde START_HOUR
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
  }, [refreshEvents, migrateSubtasks, userStartHour]);

  // Función para eliminar un evento único
  const handleDeleteSingleEvent = useCallback(async (eventId: string, targetEvent?: Event | MonthEvent | null) => {
    try {
      // Detectar si es MonthEvent o Event normal
      const event = targetEvent ?? selectedEvent;
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
  }, [refreshEvents, refreshMonthEvents, selectedEvent, setDeleteModalVisible, setEventDescription, setEventTitle, setModalVisible, setSelectedCell, setSelectedEvent]);

  const handleDeleteEvent = useCallback(() => {
    if (!selectedEvent) return;
    
    // Verificar si es un evento con campos de recurrencia
    const hasRecurrenceFields = 'is_recurring' in selectedEvent;
    
    // Verificar si el evento tiene recurrencia O si pertenece a una serie (series_id)
    const hasRecurrence = hasRecurrenceFields && selectedEvent.is_recurring;
    const belongsToSeries = hasRecurrenceFields && selectedEvent.series_id;
    
    // NUEVO: Detectar si es una instancia generada de una serie (formato "ID_fecha")
    const isGeneratedInstance = typeof selectedEvent.id === 'string' && selectedEvent.id.includes('_');
    
    // NUEVO: Detectar si es un evento que viene de una serie (tiene is_recurring pero no es el original)
    const isFromSeries = hasRecurrenceFields && selectedEvent.is_recurring && !isGeneratedInstance;
    
    if (hasRecurrence || belongsToSeries || isGeneratedInstance || isFromSeries) {
      // Evento con recurrencia O que pertenece a una serie - mostrar modal de confirmación
      setDeleteModalVisible(true);
    } else {
      // Evento único independiente - eliminar directamente
      handleDeleteSingleEvent(selectedEvent.id, selectedEvent);
    }
  }, [handleDeleteSingleEvent, selectedEvent, setDeleteModalVisible]);

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
      handleDeleteSingleEvent(event.id, event);
    }
  }, [handleDeleteSingleEvent, setDeleteModalVisible, setSelectedEvent]);

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
        // NUEVA LÓGICA: Si es una instancia de serie, convertirla en override primero
        const isInstance = typeof selectedEvent.id === 'string' && selectedEvent.id.includes('_');
        
        if (isInstance) {
          // Crear override con los mismos datos de la instancia
          // CORREGIR: Usar la fecha correcta de la instancia, no la original
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
            original_start_utc: new Date(`${instanceDate}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).toISOString(), // CORREGIR: Usar la fecha de la instancia
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
  }, [analyzeEventsToDelete, events, refreshEvents, selectedEvent, setDeleteModalVisible, setEventDescription, setEventTitle, setModalVisible, setSelectedCell, setSelectedEvent]);

  return {
    handleDuplicateEvent,
    handleDeleteSingleEvent,
    handleDeleteEvent,
    handleDeleteEventFromLongPress,
    handleDeleteConfirm
  };
}
