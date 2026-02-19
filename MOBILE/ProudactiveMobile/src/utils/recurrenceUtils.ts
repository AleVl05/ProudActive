import { START_HOUR, WEEK_DAY_LABEL_BY_CODE } from './dateConstants';

// Tipos para recurrencia
export type RecurrenceMode = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceConfig {
  enabled: boolean;
  mode: RecurrenceMode;
  interval: number;
  weekDays: string[];
  monthDays: number[];
  hasEndDate: boolean;
  endDate: string | null;
}

export interface RecurrenceRule {
  frequency: string;
  interval: number;
  byWeekDays?: string[];
  byMonthDays?: number[];
}

// Constantes para recurrencia
export const RECURRENCE_MODE_LABEL: Record<RecurrenceMode, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

export const INTERVAL_UNIT_LABEL: Record<RecurrenceMode, { singular: string; plural: string }> = {
  daily: { singular: 'día', plural: 'días' },
  weekly: { singular: 'semana', plural: 'semanas' },
  monthly: { singular: 'mes', plural: 'meses' },
};

export const createDefaultRecurrenceConfig = (): RecurrenceConfig => ({
  enabled: false,
  mode: 'daily',
  interval: 1,
  weekDays: [],
  monthDays: [],
  hasEndDate: false,
  endDate: null,
});

export const cloneRecurrenceConfig = (config: RecurrenceConfig): RecurrenceConfig => ({
  ...config,
  weekDays: [...config.weekDays],
  monthDays: [...config.monthDays],
});

export const clampRecurrenceInterval = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(30, Math.round(value)));
};

export const getRecurrenceTitle = (config: RecurrenceConfig): string => {
  if (!config.enabled) return 'Repetir';
  
  const mode = RECURRENCE_MODE_LABEL[config.mode];
  
  if (config.mode === 'daily') {
    return `Se repite cada día`;
  } else if (config.mode === 'weekly') {
    const firstDay = config.weekDays.length > 0 ? WEEK_DAY_LABEL_BY_CODE[config.weekDays[0]] || 'Dom' : 'Dom';
    return `Se repite cada semana en ${firstDay}`;
  } else if (config.mode === 'monthly') {
    const firstDay = config.monthDays.length > 0 ? config.monthDays[0] : 28;
    return `Se repite cada mes el día ${firstDay}`;
  }
  
  return `Se repite ${mode}`;
};

export const extractRecurrenceFromEvent = (event: any): RecurrenceConfig => {
  if (!event || !event.is_recurring) {
    return createDefaultRecurrenceConfig();
  }

  try {
    const rule = typeof event.recurrence_rule === 'string' 
      ? JSON.parse(event.recurrence_rule) 
      : event.recurrence_rule;

    if (!rule || !rule.frequency) {
      return createDefaultRecurrenceConfig();
    }

    const mode = rule.frequency.toLowerCase() as RecurrenceMode;
    const config: RecurrenceConfig = {
      enabled: true,
      mode,
      interval: rule.interval || 1,
      weekDays: rule.byWeekDays || [],
      monthDays: rule.byMonthDays || [],
      hasEndDate: !!event.recurrence_end_date,
      endDate: event.recurrence_end_date || null,
    };

    return config;
  } catch (error) {
    return createDefaultRecurrenceConfig();
  }
};

// Función para ajustar start_utc según la regla de recurrencia
export const adjustStartDateToRecurrenceRule = (originalStart: Date, rule: any): Date => {
  if (!rule || !rule.frequency) return originalStart;

  const frequency = rule.frequency.toUpperCase();
  const interval = rule.interval || 1;
  let adjustedDate = new Date(originalStart);

  switch (frequency) {
    case 'WEEKLY':
      if (rule.byWeekDays && rule.byWeekDays.length > 0) {
        // Preservar la hora original
        const originalHour = originalStart.getUTCHours();
        const originalMinute = originalStart.getUTCMinutes();
        const originalSecond = originalStart.getUTCSeconds();
        const originalMillisecond = originalStart.getUTCMilliseconds();
        
        // Encontrar el próximo día de la semana especificado (o mantener el actual si ya es válido)
        const weekDayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        const targetDays = rule.byWeekDays.map((day: string) => weekDayCodes.indexOf(day)).filter((d: number) => d !== -1);
        
        // Verificar si el día actual ya es uno de los días objetivo
        const currentDay = adjustedDate.getDay();
        if (!targetDays.includes(currentDay)) {
          // Si el día actual no es válido, buscar el próximo día válido
          for (let i = 0; i < 7; i++) {
            adjustedDate.setDate(adjustedDate.getDate() + 1);
            if (targetDays.includes(adjustedDate.getDay())) {
              break;
            }
          }
        }
        // Si el día actual ya es válido, mantener la fecha original
        
        // Restaurar la hora original
        adjustedDate.setUTCHours(originalHour, originalMinute, originalSecond, originalMillisecond);
      }
      break;
      
    case 'MONTHLY':
      if (rule.byMonthDays && rule.byMonthDays.length > 0) {
        // Preservar la hora original
        const originalHour = originalStart.getUTCHours();
        const originalMinute = originalStart.getUTCMinutes();
        const originalSecond = originalStart.getUTCSeconds();
        const originalMillisecond = originalStart.getUTCMilliseconds();
        
        const targetDays = rule.byMonthDays.sort((a: number, b: number) => a - b);
        const currentDay = adjustedDate.getDate();
        
        // Verificar si el día actual ya es uno de los días objetivo
        if (!targetDays.includes(currentDay)) {
          // Si el día actual no es válido, buscar el próximo día válido en este mes
          let nextDay = targetDays.find((day: number) => day > currentDay);
          if (nextDay) {
            adjustedDate.setDate(nextDay);
          } else {
            // Ir al próximo mes con el primer día especificado
            adjustedDate.setMonth(adjustedDate.getMonth() + 1);
            adjustedDate.setDate(targetDays[0]);
          }
        }
        // Si el día actual ya es válido, mantener la fecha original
        
        // Restaurar la hora original
        adjustedDate.setUTCHours(originalHour, originalMinute, originalSecond, originalMillisecond);
      }
      break;
  }

  return adjustedDate;
};

// Función para generar instancias recurrentes bajo demanda
export const generateRecurrentInstances = (
  masterEvent: any, 
  startDate: Date, 
  endDate: Date,
  overridesMap?: Map<string, any>,
  startHour: number = START_HOUR,
  endHour: number = 24
): any[] => {
  if (!masterEvent || !masterEvent.is_recurring) {
    return [];
  }

  try {
    const rule = typeof masterEvent.recurrence_rule === 'string'
      ? JSON.parse(masterEvent.recurrence_rule)
      : masterEvent.recurrence_rule;

    if (!rule || !rule.frequency) {
      return [];
    }

    const instances: any[] = [];
    const originalStart = new Date(masterEvent.start_utc);
    const eventEnd = new Date(masterEvent.end_utc);
    const duration = eventEnd.getTime() - originalStart.getTime();

    const statusMap = new Map<string, any>();
    if (Array.isArray(masterEvent.instance_statuses)) {
      masterEvent.instance_statuses.forEach((item: any) => {
        if (item?.instance_date) {
          statusMap.set(item.instance_date, item);
        }
      });
    }
    
    // AJUSTAR LA FECHA INICIAL SEGÚN LA REGLA DE RECURRENCIA
    const adjustedStart = adjustStartDateToRecurrenceRule(originalStart, rule);
    
    // Crear recurrenceEndDate
    let recurrenceEndDate = null;
    if (masterEvent.recurrence_end_date) {
      try {
        let dateString = masterEvent.recurrence_end_date;
        if (dateString.includes('T')) {
          dateString = dateString.split('T')[0];
        }
        const [year, month, day] = dateString.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          recurrenceEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        }
      } catch (error) {
        // Ignore error
      }
    }

    const frequency = rule.frequency.toUpperCase();
    const interval = rule.interval || 1;
    let currentDate = new Date(adjustedStart);
    let instanceCount = 0;
    const maxInstances = 1000;

    while (
      currentDate <= endDate && 
      instanceCount < maxInstances &&
      (!recurrenceEndDate || currentDate <= recurrenceEndDate)
    ) {
      // Solo generar si la instancia está en el rango visible
      if (currentDate >= startDate) {
        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(currentDate.getTime() + duration);
        
        // Calcular la clave UTC para verificar overrides
        const instanceUtcKey = instanceStart.toISOString();
        
        // Verificar si esta instancia está excluida por excepciones de recurrencia
        const instanceDateString = instanceStart.toISOString().split('T')[0];
        const isExcluded = masterEvent.recurrence_exceptions && 
          masterEvent.recurrence_exceptions.some((exception: any) => {
            const exceptionDate = new Date(exception.exception_date).toISOString().split('T')[0];
            return exceptionDate === instanceDateString && exception.is_deleted;
          });
        
        if (isExcluded) {
          // Esta instancia está excluida, no generar
        } else if (overridesMap && overridesMap.has(instanceUtcKey)) {
          const override = overridesMap.get(instanceUtcKey);
          
          // Verificar si el override está dentro del rango configurado
          const overrideStartHour = instanceStart.getUTCHours();
          const overrideStartMinute = instanceStart.getUTCMinutes();
          const overrideEndHour = instanceEnd.getUTCHours();
          const overrideEndMinute = instanceEnd.getUTCMinutes();
          const effectiveEndHour = endHour === 24 ? 24 : endHour;
          
          const overrideStartTotalMinutes = overrideStartHour * 60 + overrideStartMinute;
          const overrideEndTotalMinutes = overrideEndHour * 60 + overrideEndMinute;
          const rangeStartTotalMinutes = startHour * 60;
          const rangeEndTotalMinutes = effectiveEndHour === 24 ? 24 * 60 : effectiveEndHour * 60;
          
          const isCompletelyBeforeRange = overrideEndTotalMinutes < rangeStartTotalMinutes;
          const isCompletelyAfterRange = overrideStartTotalMinutes >= rangeEndTotalMinutes;
          
          if (!isCompletelyBeforeRange && !isCompletelyAfterRange) {
            const resolvedColor = override.color || masterEvent.color || '#6b53e2';
            // Convertir override a formato Event solo si está en el rango
            const overrideEvent: any = {
              id: String(override.id),
              title: override.title,
              description: override.description,
              startTime: (new Date(override.start_utc).getUTCHours() * 60 + new Date(override.start_utc).getUTCMinutes()) - (startHour * 60),
              duration: Math.round((new Date(override.end_utc).getTime() - new Date(override.start_utc).getTime()) / (1000 * 60)),
              color: resolvedColor,
              category: override.category || 'General',
              date: new Date(override.start_utc).toISOString().slice(0, 10),
              is_recurring: false,
              series_id: override.series_id ?? masterEvent.id,
              original_start_utc: override.original_start_utc ?? instanceUtcKey,
              subtasks_total: override.subtasks_total ?? override.subtasks_count ?? 0,
              subtasks_completed: override.subtasks_completed ?? override.subtasks_completed_count ?? 0,
              subtask_status: override.subtask_status || 'none',
            };
            instances.push(overrideEvent);
          }
        } else {
          // Generar instancia normal
          const startTime = (instanceStart.getUTCHours() * 60 + instanceStart.getUTCMinutes()) - (startHour * 60);
          
          // Verificar si la instancia está dentro del rango configurado
          const instanceStartHour = instanceStart.getUTCHours();
          const instanceEndHour = instanceEnd.getUTCHours();
          const effectiveEndHour = endHour === 24 ? 24 : endHour;
          
          // Calcular minutos totales para comparación
          const instanceStartTotalMinutes = instanceStartHour * 60 + instanceStart.getUTCMinutes();
          const instanceEndTotalMinutes = instanceEndHour * 60 + instanceEnd.getUTCMinutes();
          const rangeStartTotalMinutes = startHour * 60;
          const rangeEndTotalMinutes = effectiveEndHour === 24 ? 24 * 60 : effectiveEndHour * 60;
          
          // Si está completamente fuera del rango, no incluirla
          const isCompletelyBeforeRange = instanceEndTotalMinutes < rangeStartTotalMinutes;
          const isCompletelyAfterRange = instanceStartTotalMinutes >= rangeEndTotalMinutes;
          
          if (isCompletelyBeforeRange || isCompletelyAfterRange) {
            // Saltar esta instancia - está fuera del rango visible
            // Continuar al siguiente cálculo de fecha (se hace al final del while)
          } else {
            const instanceDateKey = instanceStart.toISOString().slice(0, 10);
            const instanceStatus = statusMap.get(instanceDateKey);
            const masterTotal = masterEvent.master_subtasks_total ?? masterEvent.subtasks_total ?? masterEvent.subtasks_count ?? 0;
            const fallbackStatus = masterTotal > 0 ? 'partial' : 'none';
            const instance: any = {
              id: `${masterEvent.id}_${currentDate.toISOString().split('T')[0]}`,
              title: masterEvent.title,
              description: masterEvent.description,
              startTime: startTime,
              duration: Math.round(duration / (1000 * 60)),
              color: masterEvent.color || '#6b53e2',
              category: masterEvent.category || 'General',
              date: instanceStart.toISOString().slice(0, 10),
              is_recurring: masterEvent.is_recurring,
              recurrence_rule: masterEvent.recurrence_rule,
              recurrence_end_date: masterEvent.recurrence_end_date,
              series_id: masterEvent.id,
              // Usar la fecha/hora REAL de la instancia para poder hacer override correcto
              original_start_utc: instanceStart.toISOString(),
              subtasks_total: instanceStatus?.subtasks_total ?? masterTotal,
              subtasks_completed: instanceStatus?.subtasks_completed ?? 0,
              subtask_status: instanceStatus?.status ?? fallbackStatus,
            };

            instances.push(instance);
          }
        }
      }

      // Calcular la próxima fecha según la frecuencia
      switch (frequency) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        
        case 'WEEKLY':
          if (rule.byWeekDays && rule.byWeekDays.length > 0) {
            const weekDayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
            const targetDays = rule.byWeekDays.map((day: string) => weekDayCodes.indexOf(day)).filter((d: number) => d !== -1);
            
            let nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            for (let i = 0; i < 7 * interval; i++) {
              if (targetDays.includes(nextDate.getDay())) {
                currentDate = nextDate;
                break;
              }
              nextDate.setDate(nextDate.getDate() + 1);
            }
          } else {
            currentDate.setDate(currentDate.getDate() + (7 * interval));
          }
          break;
        
        case 'MONTHLY':
          if (rule.byMonthDays && rule.byMonthDays.length > 0) {
            const currentDay = currentDate.getDate();
            const targetDays = rule.byMonthDays.sort((a: number, b: number) => a - b);
            
            let nextDay = targetDays.find((day: number) => day > currentDay);
            if (nextDay) {
              currentDate.setDate(nextDay);
            } else {
              currentDate.setMonth(currentDate.getMonth() + interval);
              currentDate.setDate(targetDays[0]);
            }
          } else {
            currentDate.setMonth(currentDate.getMonth() + interval);
          }
          break;
        
        default:
          return instances;
      }

      instanceCount++;
    }
    
    return instances;
  } catch (error) {
    return [];
  }
};

export const sanitizeRecurrenceDraft = (draft: RecurrenceConfig | null, fallbackDate: Date): RecurrenceConfig => {
  if (!draft) {
    return createDefaultRecurrenceConfig();
  }

  return {
    enabled: Boolean(draft.enabled),
    mode: draft.mode || 'daily',
    interval: clampRecurrenceInterval(draft.interval || 1),
    weekDays: Array.isArray(draft.weekDays) ? draft.weekDays : [],
    monthDays: Array.isArray(draft.monthDays) ? draft.monthDays : [],
    hasEndDate: Boolean(draft.hasEndDate),
    endDate: draft.endDate || null,
  };
};
