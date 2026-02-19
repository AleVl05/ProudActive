import { useState, useRef, useEffect, useCallback } from 'react';
import type { Event } from '@/types/calendarTypes';
import { apiGetCalendars, apiFetchMonthEvents } from '@/services/calendarApi';
import { MonthEvent, fetchMonthEvents as fetchMonthEventsHelper, fetchYearEvents as fetchYearEventsHelper } from '@/components/calendar/monthEventHelpers';

interface UseCalendarEventsParams {
  currentView: 'day' | 'week' | 'month' | 'year';
  currentDate: Date;
  startOfWeek: (date: Date) => Date;
  addDays: (date: Date, days: number) => Date;
  fetchEventsForRange: (rangeStart: Date, rangeEnd: Date) => Promise<Event[] | null>;
  ScreenOrientationAvailable: boolean;
  ScreenOrientation: any;
}

export function useCalendarEvents({
  currentView,
  currentDate,
  startOfWeek,
  addDays,
  fetchEventsForRange,
  ScreenOrientationAvailable,
  ScreenOrientation,
}: UseCalendarEventsParams) {
  const [events, setEvents] = useState<Event[]>([]);
  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);
  const [yearEvents, setYearEvents] = useState<MonthEvent[]>([]);

  // FIX: Ref para leer eventos actuales de forma síncrona (para onMoveCommit)
  const eventsRef = useRef<Event[]>([]);

  // Actualizar ref cuando cambien los eventos
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Función para refrescar eventos después de crear/editar
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

  const refreshEvents = useCallback(async () => {
    const dateToUse = currentDate;
    if (currentView === 'week') {
      const weekStart = startOfWeek(dateToUse);
      const weekEnd = addDays(weekStart, 6);
      weekEnd.setHours(23, 59, 59, 999);
      const fetched = await fetchEventsForRange(weekStart, weekEnd);
      if (fetched) {
        setEvents(fetched);
      }
      return;
    }
    if (currentView === 'day') {
      const weekStart = startOfWeek(dateToUse);
      const weekEnd = addDays(weekStart, 6);
      weekEnd.setHours(23, 59, 59, 999);
      const fetched = await fetchEventsForRange(weekStart, weekEnd);
      if (fetched) {
        setEvents(fetched);
      }
    }
  }, [currentView, currentDate, startOfWeek, addDays, fetchEventsForRange]);

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
        const monthEventsData: MonthEvent[] = body.data
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

        setMonthEvents(monthEventsData);
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

  const eventsLoadRequestRef = useRef(0);
  const eventsLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const requestId = ++eventsLoadRequestRef.current;

    if (eventsLoadTimeoutRef.current) {
      clearTimeout(eventsLoadTimeoutRef.current);
    }

    eventsLoadTimeoutRef.current = setTimeout(() => {
      (async () => {
        const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
        if (eventsLoadRequestRef.current !== requestId) {
          return;
        }
        if (fetched) {
          setEvents(fetched);
        }
      })();
    }, 150);

    return () => {
      if (eventsLoadTimeoutRef.current) {
        clearTimeout(eventsLoadTimeoutRef.current);
      }
    };
  }, [currentView, currentDate, startOfWeek, addDays, fetchEventsForRange]);

  return {
    events,
    setEvents,
    eventsRef,
    monthEvents,
    setMonthEvents,
    yearEvents,
    setYearEvents,
    refreshEvents,
    refreshMonthEvents,
    fetchMonthEvents,
    fetchYearEvents,
  };
}
