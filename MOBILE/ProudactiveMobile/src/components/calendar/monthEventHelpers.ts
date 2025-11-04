// monthEventHelpers.ts - Helper functions for MonthEvent transformations
import {
  apiFetchMonthEvents,
  apiGetCalendars,
} from '../../../services/calendarApi';

export interface MonthEvent {
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

// Convertir MonthEvent backend → frontend (start_date, end_date → startDay, duration)
export const monthEventBackendToFrontend = (backendEvent: any, year: number, month: number): MonthEvent => {
  // Parsear fechas sin problemas de timezone usando YYYY-MM-DD directamente
  const startParts = backendEvent.start_date.split('-');
  const endParts = backendEvent.end_date.split('-');
  const startDay = parseInt(startParts[2], 10);
  const endDay = parseInt(endParts[2], 10);
  
  // Calcular duración en días (diferencia de días + 1 para ser inclusivo)
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
    month, // month ya viene en formato 0-11 del backend
  };
};

// Convertir MonthEvent frontend → backend (startDay, duration → start_date, end_date)
export const monthEventFrontendToBackend = (frontendEvent: MonthEvent): any => {
  // Calcular fechas directamente sin usar Date objects para evitar problemas de timezone
  const startDay = frontendEvent.startDay;
  const endDay = frontendEvent.startDay + frontendEvent.duration - 1;
  const year = frontendEvent.year;
  const month = frontendEvent.month + 1; // Convertir de 0-11 a 1-12
  
  // Formatear como YYYY-MM-DD usando valores locales (sin timezone)
  const formatDate = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };
  
  return {
    start_date: formatDate(startDay),
    end_date: formatDate(endDay),
  };
};

// Cargar month events desde API
export const fetchMonthEvents = async (year: number, month: number): Promise<MonthEvent[]> => {
  try {
    const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
    const response = await apiFetchMonthEvents(year, month, calendarId);
    
    if (!response.ok) {
      return [];
    }

    const body = await response.json();
    if (!body?.success || !Array.isArray(body.data)) {
      return [];
    }

    // Transformar todos los eventos del backend al formato frontend
    // IMPORTANTE: El backend puede devolver eventos de meses adyacentes que se solapan
    // Solo procesar eventos que pertenecen al mes actual
    const monthEvents: MonthEvent[] = body.data
      .filter((backendEvent: any) => {
        // Filtrar por año y mes correctos
        const eventStartParts = backendEvent.start_date.split('-');
        const eventYear = parseInt(eventStartParts[0], 10);
        const eventMonth = parseInt(eventStartParts[1], 10) - 1; // Backend usa 1-12, frontend usa 0-11
        return eventYear === year && eventMonth === month;
      })
      .map((backendEvent: any) => 
        monthEventBackendToFrontend(backendEvent, year, month)
      );

    return monthEvents;
  } catch (error) {
    return [];
  }
};

// Cargar todos los eventos mensuales de un año completo
export const fetchYearEvents = async (year: number): Promise<MonthEvent[]> => {
  try {
    const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
    const allEvents: MonthEvent[] = [];

    // Cargar eventos de cada mes del año
    for (let month = 0; month < 12; month++) {
      const response = await apiFetchMonthEvents(year, month, calendarId);
      
      if (!response.ok) {
        continue;
      }

      const body = await response.json();
      if (!body?.success || !Array.isArray(body.data)) {
        continue;
      }

      // Filtrar y transformar eventos del mes
      const monthEvents: MonthEvent[] = body.data
        .filter((backendEvent: any) => {
          const eventStartParts = backendEvent.start_date.split('-');
          const eventYear = parseInt(eventStartParts[0], 10);
          const eventMonth = parseInt(eventStartParts[1], 10) - 1;
          return eventYear === year && eventMonth === month;
        })
        .map((backendEvent: any) => 
          monthEventBackendToFrontend(backendEvent, year, month)
        );

      allEvents.push(...monthEvents);
    }

    return allEvents;
  } catch (error) {
    return [];
  }
};

