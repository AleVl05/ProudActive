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
// import { DateTime } from 'luxon'; // No está instalado, usar funciones nativas


const { width } = Dimensions.get('window');
const CELL_HEIGHT = 50; // 30 minutos = 50px
const START_HOUR = 6;
const END_HOUR = 22;
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const WEEK_DAY_ITEMS = [
  { code: 'SU', short: 'D', label: 'Dom' },
  { code: 'MO', short: 'S', label: 'Seg' },
  { code: 'TU', short: 'T', label: 'Ter' },
  { code: 'WE', short: 'Q', label: 'Qua' },
  { code: 'TH', short: 'Q', label: 'Qui' },
  { code: 'FR', short: 'S', label: 'Sex' },
  { code: 'SA', short: 'S', label: 'Sáb' },
];

const WEEK_DAY_CODES = WEEK_DAY_ITEMS.map(item => item.code);

const WEEK_DAY_LABEL_BY_CODE = WEEK_DAY_ITEMS.reduce<Record<string, string>>((acc, item) => {
  acc[item.code] = item.label;
  return acc;
}, {});

const WEEK_DAY_SHORT_BY_CODE = WEEK_DAY_ITEMS.reduce<Record<string, string>>((acc, item) => {
  acc[item.code] = item.short;
  return acc;
}, {});

const MONTH_DAY_ITEMS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTH_WEEKDAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const RECURRENCE_MODE_LABEL: Record<RecurrenceMode, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

const INTERVAL_UNIT_LABEL: Record<RecurrenceMode, { singular: string; plural: string }> = {
  daily: { singular: 'dia', plural: 'dias' },
  weekly: { singular: 'semana', plural: 'semanas' },
  monthly: { singular: 'mês', plural: 'meses' },
};

const createDefaultRecurrenceConfig = (): RecurrenceConfig => ({
  enabled: false,
  mode: 'daily',
  interval: 1,
  weekDays: [],
  monthDays: [],
  hasEndDate: false,
  endDate: null,
});

const cloneRecurrenceConfig = (config: RecurrenceConfig): RecurrenceConfig => ({
  ...config,
  weekDays: [...config.weekDays],
  monthDays: [...config.monthDays],
});

const clampRecurrenceInterval = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(30, Math.round(value)));
};

const getWeekDayCode = (date: Date) => WEEK_DAY_ITEMS[date.getDay()]?.code ?? 'MO';

const getRecurrenceTitle = (config: RecurrenceConfig): string => {
  if (!config.enabled) return 'Repetir';
  
  const mode = RECURRENCE_MODE_LABEL[config.mode];
  
  if (config.mode === 'daily') {
    return `Repete A cada dia`;
  } else if (config.mode === 'weekly') {
    const firstDay = config.weekDays.length > 0 ? WEEK_DAY_LABEL_BY_CODE[config.weekDays[0]] || 'Dom' : 'Dom';
    return `Repete A cada semana em ${firstDay}`;
  } else if (config.mode === 'monthly') {
    const firstDay = config.monthDays.length > 0 ? config.monthDays[0] : 28;
    return `Repete A cada mês em ${firstDay}°`;
  }
  
  return `Repete ${mode}`;
};

const extractRecurrenceFromEvent = (event: any): RecurrenceConfig => {
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
const adjustStartDateToRecurrenceRule = (originalStart: Date, rule: any): Date => {
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
        
        // Encontrar el próximo día de la semana especificado
        const weekDayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        const targetDays = rule.byWeekDays.map((day: string) => weekDayCodes.indexOf(day)).filter((d: number) => d !== -1);
        
        // Buscar el próximo día válido
        for (let i = 0; i < 7; i++) {
          if (targetDays.includes(adjustedDate.getDay())) {
            break;
          }
          adjustedDate.setDate(adjustedDate.getDate() + 1);
        }
        
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
        
        let nextDay = targetDays.find((day: number) => day >= currentDay);
        if (nextDay) {
          adjustedDate.setDate(nextDay);
        } else {
          // Ir al próximo mes con el primer día especificado
          adjustedDate.setMonth(adjustedDate.getMonth() + 1);
          adjustedDate.setDate(targetDays[0]);
        }
        
        // Restaurar la hora original
        adjustedDate.setUTCHours(originalHour, originalMinute, originalSecond, originalMillisecond);
      }
      break;
  }

  // Solo mostrar debug si hubo cambio
  if (adjustedDate.getTime() !== originalStart.getTime()) {
  }

  return adjustedDate;
};

// Función para generar instancias recurrentes bajo demanda
const generateRecurrentInstances = (
  masterEvent: any, 
  startDate: Date, 
  endDate: Date,
  overridesMap?: Map<string, any>
): Event[] => {
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

    const instances: Event[] = [];
    const originalStart = new Date(masterEvent.start_utc);
    const eventEnd = new Date(masterEvent.end_utc);
    const duration = eventEnd.getTime() - originalStart.getTime();
    
    
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
        
        
        // 🎯 NUEVO: Verificar si esta instancia está excluida por excepciones de recurrencia
        const instanceDateString = instanceStart.toISOString().split('T')[0];
        const isExcluded = masterEvent.recurrence_exceptions && 
          masterEvent.recurrence_exceptions.some((exception: any) => {
            // Comparar solo la fecha, ignorando la hora
            const exceptionDate = new Date(exception.exception_date).toISOString().split('T')[0];
            return exceptionDate === instanceDateString && exception.is_deleted;
          });
        
        if (isExcluded) {
          // Esta instancia está excluida, no generar
        } else if (overridesMap && overridesMap.has(instanceUtcKey)) {
          const override = overridesMap.get(instanceUtcKey);
          
          // Convertir override a formato Event (normalizeApiEvent se define más abajo)
          // Por ahora, crear un Event básico del override
          const overrideEvent: Event = {
            id: String(override.id),
            title: override.title,
            description: override.description,
            startTime: (new Date(override.start_utc).getUTCHours() * 60 + new Date(override.start_utc).getUTCMinutes()) - (START_HOUR * 60),
            duration: Math.round((new Date(override.end_utc).getTime() - new Date(override.start_utc).getTime()) / (1000 * 60)),
            color: override.color,
            category: override.category || 'General',
            date: new Date(override.start_utc).toISOString().slice(0, 10),
            is_recurring: false, // Override no es recurrente
          };
          instances.push(overrideEvent);
        } else {
          // Generar instancia normal
          const startTime = (instanceStart.getUTCHours() * 60 + instanceStart.getUTCMinutes()) - (START_HOUR * 60);
          
          
          const instance: Event = {
            id: `${masterEvent.id}_${currentDate.toISOString().split('T')[0]}`,
            title: masterEvent.title,
            description: masterEvent.description,
            startTime: startTime,
            duration: Math.round(duration / (1000 * 60)),
            color: masterEvent.color,
            category: masterEvent.category || 'General',
            date: instanceStart.toISOString().slice(0, 10),
            is_recurring: masterEvent.is_recurring,
            recurrence_rule: masterEvent.recurrence_rule,
            recurrence_end_date: masterEvent.recurrence_end_date,
            // 🔥 NUEVO: Agregar series_id para que las instancias sepan de qué serie vienen
            series_id: masterEvent.id,
            original_start_utc: masterEvent.start_utc,
          };

          instances.push(instance);
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

// Componente para dibujar las líneas del grid como fondo
const GridBackground = ({ width, height, cellHeight }: { width: number, height: number, cellHeight: number }) => {
  const lines = [];
  const numRows = Math.ceil(height / cellHeight);
  
  for (let i = 1; i < numRows; i++) {
    const y = i * cellHeight;
    lines.push(
      <View
        key={`line-${i}`}
        style={{
          position: 'absolute',
          top: y,
          left: 0,
          right: 0,
          height: 0.5,
          backgroundColor: '#f0f0f0',
          zIndex: 0
        }}
      />
    );
  }
  
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>{lines}</View>;
};

const buildMonthMatrix = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rows: (number | null)[][] = [];
  let currentDay = 1;
  for (let week = 0; week < 6; week++) {
    const row: (number | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (week === 0 && dow < startOffset) {
        row.push(null);
      } else if (currentDay > daysInMonth) {
        row.push(null);
      } else {
        row.push(currentDay);
        currentDay++;
      }
    }
    rows.push(row);
  }
  return rows;
};

const toggleItemInArray = <T,>(arr: T[], value: T): T[] => {
  if (arr.includes(value)) {
    return arr.filter(item => item !== value);
  }
  return [...arr, value];
};

const sortNumericArray = (arr: number[]) => [...arr].sort((a, b) => a - b);

const sanitizeRecurrenceDraft = (draft: RecurrenceConfig | null, fallbackDate: Date): RecurrenceConfig => {
  const base = draft ?? createDefaultRecurrenceConfig();
  const sanitized = cloneRecurrenceConfig(base);
  sanitized.enabled = !!base.enabled;
  sanitized.interval = clampRecurrenceInterval(sanitized.interval || 1);

  if (sanitized.mode === 'weekly') {
    const uniqueDays = Array.from(new Set(sanitized.weekDays));
    sanitized.weekDays = uniqueDays.length > 0 ? uniqueDays : [getWeekDayCode(fallbackDate)];
    sanitized.monthDays = [];
  } else if (sanitized.mode === 'monthly') {
    const filteredDays = sanitized.monthDays
      .map(day => Math.max(1, Math.min(31, Math.round(day))))
      .filter((day, index, arr) => arr.indexOf(day) === index)
      .sort((a, b) => a - b);
    sanitized.monthDays = filteredDays.length > 0 ? filteredDays : [fallbackDate.getDate()];
    sanitized.weekDays = [];
  } else {
    sanitized.weekDays = [];
    sanitized.monthDays = [];
  }

  if (!sanitized.hasEndDate) {
    sanitized.endDate = null;
  }

  return sanitized;
};


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
const dateKeyToLocalDate = (dateKey: string, minutesFromStart: number) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Crear fecha directamente en UTC para evitar problemas de zona horaria
  const dt = new Date(Date.UTC(y, (m - 1), d, START_HOUR, 0, 0, 0));
  dt.setUTCMinutes(dt.getUTCMinutes() + minutesFromStart);
  return dt; // UTC Date
};

const dateKeyToDate = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const formatDateKey = (dateKey: string) => {
  const d = dateKeyToDate(dateKey);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDisplayMonthYear = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

async function apiPutEventTimes(eventId: string, startUtcIso: string, endUtcIso: string) {
  const url = `${API_BASE}/events/${eventId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_utc: startUtcIso, end_utc: endUtcIso }),
  });
  return res;
}

async function apiPutEvent(eventId: string, payload: any) {
  const url = `${API_BASE}/events/${eventId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res;
}

async function apiGetCalendars() {
  const res = await fetch(`${API_BASE}/calendars`);
  return res.json();
}

async function apiPostEvent(payload: any) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res;
}

async function apiDeleteEvent(eventId: string) {
  const res = await fetch(`${API_BASE}/events/${eventId}`, { method: 'DELETE' });
  return res;
}

async function apiFetchEvents(startIso: string, endIso: string) {
  const params = new URLSearchParams({ start: startIso, end: endIso });
  const res = await fetch(`${API_BASE}/events?${params.toString()}`);
  return res;
}

interface EventResizableBlockProps {
  ev: Event;
  onResizeCommit: (event: Event, newStartTime: number, newDuration: number) => void;
  onMoveCommit: (event: Event, newStartTime: number, newDate: string) => void;
  cellWidth: number;
  onQuickPress?: (ev: Event) => void; // <-- NEW
}

const EventResizableBlock = React.memo(function EventResizableBlock({ ev, onResizeCommit, onMoveCommit, onQuickPress, cellWidth }: EventResizableBlockProps) {

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
            borderColor: ev.color,
            borderRadius: 4,
            backgroundColor: `${ev.color}40`, // 40% opacity para mejor visibilidad
            zIndex: 200, // 🔧 FIX: Ghost por encima del evento
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
            borderColor: ev.color
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
            borderColor: ev.color
          }} />
        </Animated.View>
      )}

        <View 
          key={`${ev.id}-${forceRender}`} // 🔧 FIX: Forzar re-render con key única
          style={[
            styles.eventBlock, 
            { 
              backgroundColor: ev.color, 
              height: blockHeight,
              minHeight: blockHeight, // 🔧 OPTIMIZACIÓN: Usar altura memoizada
              zIndex: 100 // 🔧 FIX: Asegurar que esté encima del grid
            }
          ]}
        >
        <Text style={styles.eventText} numberOfLines={2}>{ev.title}</Text>
        {/* Handles invisibles superior e inferior (hitzone ampliada 12px) */}
        <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12 }} />
        <View {...bottomResponder.panHandlers} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 }} />
        {/* Área central para mover el bloque completo */}
        <View {...moveResponder.panHandlers} style={{ position: 'absolute', top: 12, left: 0, right: 0, bottom: 12 }} />
      </View>
    </View>
  );
});

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

// Componente del Modal de Repetición
interface RecurrenceModalProps {
  config: RecurrenceConfig;
  onSave: (config: RecurrenceConfig) => void;
  onCancel: () => void;
  calendarMonth: Date;
  onCalendarMonthChange: (date: Date) => void;
}

function RecurrenceModal({ config, onSave, onCancel, calendarMonth, onCalendarMonthChange }: RecurrenceModalProps) {
  const insets = useSafeAreaInsets();
  const [localConfig, setLocalConfig] = useState<RecurrenceConfig>(() => cloneRecurrenceConfig(config));
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Actualizar configuración local cuando cambie la prop
  useEffect(() => {
    setLocalConfig(cloneRecurrenceConfig(config));
  }, [config]);

  const updateConfig = useCallback((updates: Partial<RecurrenceConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localConfig);
  }, [localConfig, onSave]);

  const handleModeChange = useCallback((mode: RecurrenceMode) => {
    const updates: Partial<RecurrenceConfig> = { mode };
    
    // Configurar valores por defecto según el modo
    if (mode === 'weekly') {
      const currentWeekDay = getWeekDayCode(new Date());
      updates.weekDays = localConfig.weekDays.length > 0 ? localConfig.weekDays : [currentWeekDay];
    } else if (mode === 'monthly') {
      const currentDay = new Date().getDate();
      updates.monthDays = localConfig.monthDays.length > 0 ? localConfig.monthDays : [currentDay];
    }
    
    updateConfig(updates);
  }, [localConfig.weekDays, localConfig.monthDays, updateConfig]);

  const handleIntervalChange = useCallback((delta: number) => {
    const newInterval = clampRecurrenceInterval(localConfig.interval + delta);
    updateConfig({ interval: newInterval });
  }, [localConfig.interval, updateConfig]);

  const handleWeekDayToggle = useCallback((dayCode: string) => {
    const newWeekDays = localConfig.weekDays.includes(dayCode)
      ? localConfig.weekDays.filter(d => d !== dayCode)
      : [...localConfig.weekDays, dayCode];
    updateConfig({ weekDays: newWeekDays });
  }, [localConfig.weekDays, updateConfig]);

  const handleMonthDayToggle = useCallback((day: number) => {
    const newMonthDays = localConfig.monthDays.includes(day)
      ? localConfig.monthDays.filter(d => d !== day)
      : [...localConfig.monthDays, day];
    updateConfig({ monthDays: newMonthDays });
  }, [localConfig.monthDays, updateConfig]);

  const handleEndDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      updateConfig({ endDate: dateStr });
    }
  }, [updateConfig]);

  const formatEndDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  }, []);

  const renderTabContent = () => {
    switch (localConfig.mode) {
      case 'daily':
        return (
          <View style={recurrenceStyles.tabContent}>
            <View style={recurrenceStyles.intervalSection}>
              <Text style={recurrenceStyles.sectionTitle}>Intervalo</Text>
              <View style={recurrenceStyles.intervalRow}>
                <Text style={recurrenceStyles.intervalLabel}>A cada</Text>
                <View style={recurrenceStyles.stepperContainer}>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(-1)}
                    disabled={localConfig.interval <= 1}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval <= 1 && recurrenceStyles.stepperDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={recurrenceStyles.intervalValue}>{localConfig.interval.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(1)}
                    disabled={localConfig.interval >= 30}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval >= 30 && recurrenceStyles.stepperDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={recurrenceStyles.intervalLabel}>
                  {localConfig.interval === 1 ? 'dia' : 'dias'}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'weekly':
        return (
          <View style={recurrenceStyles.tabContent}>
            <View style={recurrenceStyles.weekDaysSection}>
              <View style={recurrenceStyles.weekDaysGrid}>
                {WEEK_DAY_ITEMS.map(item => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      recurrenceStyles.weekDayChip,
                      localConfig.weekDays.includes(item.code) && recurrenceStyles.weekDayChipSelected
                    ]}
                    onPress={() => handleWeekDayToggle(item.code)}
                  >
                    <Text style={[
                      recurrenceStyles.weekDayChipText,
                      localConfig.weekDays.includes(item.code) && recurrenceStyles.weekDayChipTextSelected
                    ]}>
                      {item.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={recurrenceStyles.intervalSection}>
              <Text style={recurrenceStyles.sectionTitle}>Intervalo</Text>
              <View style={recurrenceStyles.intervalRow}>
                <Text style={recurrenceStyles.intervalLabel}>A cada</Text>
                <View style={recurrenceStyles.stepperContainer}>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(-1)}
                    disabled={localConfig.interval <= 1}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval <= 1 && recurrenceStyles.stepperDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={recurrenceStyles.intervalValue}>{localConfig.interval.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(1)}
                    disabled={localConfig.interval >= 30}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval >= 30 && recurrenceStyles.stepperDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={recurrenceStyles.intervalLabel}>
                  {localConfig.interval === 1 ? 'semana' : 'semanas'}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'monthly':
        return (
          <View style={recurrenceStyles.tabContent}>
            <View style={recurrenceStyles.monthDaysSection}>
              <View style={recurrenceStyles.monthGrid}>
                {MONTH_DAY_ITEMS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      recurrenceStyles.monthDayChip,
                      localConfig.monthDays.includes(day) && recurrenceStyles.monthDayChipSelected
                    ]}
                    onPress={() => handleMonthDayToggle(day)}
                  >
                    <Text style={[
                      recurrenceStyles.monthDayChipText,
                      localConfig.monthDays.includes(day) && recurrenceStyles.monthDayChipTextSelected
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={recurrenceStyles.intervalSection}>
              <Text style={recurrenceStyles.sectionTitle}>Intervalo</Text>
              <View style={recurrenceStyles.intervalRow}>
                <Text style={recurrenceStyles.intervalLabel}>A cada</Text>
                <View style={recurrenceStyles.stepperContainer}>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(-1)}
                    disabled={localConfig.interval <= 1}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval <= 1 && recurrenceStyles.stepperDisabled]}>-</Text>
                  </TouchableOpacity>
                  <Text style={recurrenceStyles.intervalValue}>{localConfig.interval.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={recurrenceStyles.stepperButton}
                    onPress={() => handleIntervalChange(1)}
                    disabled={localConfig.interval >= 30}
                  >
                    <Text style={[recurrenceStyles.stepperText, localConfig.interval >= 30 && recurrenceStyles.stepperDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={recurrenceStyles.intervalLabel}>
                  {localConfig.interval === 1 ? 'mês' : 'meses'}
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={recurrenceStyles.container}>
      <View style={[recurrenceStyles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={recurrenceStyles.backButton} onPress={onCancel}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={recurrenceStyles.headerTitle}>
          {localConfig.enabled ? getRecurrenceTitle(localConfig) : 'Repetir'}
        </Text>
      </View>

      <ScrollView style={recurrenceStyles.content}>
        {/* Switch principal de repetición */}
        <View style={recurrenceStyles.mainSwitchSection}>
          <View style={recurrenceStyles.mainSwitchRow}>
            <Ionicons name="refresh-outline" size={20} color={Colors.light.tint} />
            <Text style={recurrenceStyles.mainSwitchLabel}>Repetir</Text>
            <Text style={recurrenceStyles.mainSwitchSubtitle}>Defina um ciclo para seu plano</Text>
            <Switch
              value={localConfig.enabled}
              onValueChange={(enabled) => updateConfig({ enabled })}
              trackColor={{ false: '#e0e0e0', true: Colors.light.tint }}
              thumbColor={localConfig.enabled ? 'white' : '#f4f3f4'}
            />
          </View>
        </View>

        {localConfig.enabled && (
          <>
            {/* Pestañas de modo */}
            <View style={recurrenceStyles.tabsSection}>
              <View style={recurrenceStyles.tabsContainer}>
                {(['daily', 'weekly', 'monthly'] as RecurrenceMode[]).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      recurrenceStyles.tab,
                      localConfig.mode === mode && recurrenceStyles.tabActive
                    ]}
                    onPress={() => handleModeChange(mode)}
                  >
                    <Text style={[
                      recurrenceStyles.tabText,
                      localConfig.mode === mode && recurrenceStyles.tabTextActive
                    ]}>
                      {RECURRENCE_MODE_LABEL[mode]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Contenido de la pestaña activa */}
            {renderTabContent()}

            {/* Sección de fecha de término */}
            <View style={recurrenceStyles.endDateSection}>
              <View style={recurrenceStyles.endDateRow}>
                <Text style={recurrenceStyles.endDateLabel}>Data de término</Text>
                <Switch
                  value={localConfig.hasEndDate}
                  onValueChange={(hasEndDate) => updateConfig({ hasEndDate, endDate: hasEndDate ? new Date().toISOString().split('T')[0] : null })}
                  trackColor={{ false: '#e0e0e0', true: Colors.light.tint }}
                  thumbColor={localConfig.hasEndDate ? 'white' : '#f4f3f4'}
                />
              </View>

              {localConfig.hasEndDate && (
                <TouchableOpacity
                  style={recurrenceStyles.endDateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={recurrenceStyles.endDateButtonText}>
                    {formatEndDate(localConfig.endDate) || 'Selecionar data'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Botón de guardar */}
        <View style={recurrenceStyles.saveSection}>
          <TouchableOpacity style={recurrenceStyles.saveButton} onPress={handleSave}>
            <Text style={recurrenceStyles.saveButtonText}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker para fecha de término */}
      {showEndDatePicker && (
        <DateTimePicker
          value={localConfig.endDate ? new Date(localConfig.endDate + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

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
          const instanceDate = selectedEvent.date; // Fecha de la instancia (ej: 2025-09-30)
          const instanceStartTime = selectedEvent.startTime; // Hora de la instancia
          const instanceDuration = selectedEvent.duration;
          
          // Convertir startTime a horas y minutos
          const hours = Math.floor(instanceStartTime / 60);
          const minutes = instanceStartTime % 60;
          const endHours = Math.floor((instanceStartTime + instanceDuration) / 60);
          const endMinutes = (instanceStartTime + instanceDuration) % 60;
          
          const overridePayload = {
            calendar_id: 1, // Usar calendar_id por defecto
            title: selectedEvent.title,
            description: selectedEvent.description || '',
            start_utc: new Date(`${instanceDate}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).toISOString(),
            end_utc: new Date(`${instanceDate}T${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00.000Z`).toISOString(),
            series_id: selectedEvent.series_id,
            original_start_utc: new Date(`${instanceDate}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`).toISOString(), // 🎯 CORREGIR: Usar la fecha de la instancia
            color: selectedEvent.color,
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

    const startTime = timeIndex * 30;
    const lookupKey = `${dateKey}-${startTime}`;
    const existingEvent = eventsByCell[lookupKey];

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
          
          // 2. Eliminar el evento original que venía de la serie
          await apiDeleteEvent(String(selectedEvent.id));
          
          // 3. Refrescar eventos para mostrar la nueva serie
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

            
            // 2. Eliminar el evento liberado original
            await apiDeleteEvent(String(selectedEvent.id));
            
            // 3. Refrescar eventos para mostrar la nueva serie
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

    // Limpiar modal
    setModalVisible(false);
    setEventTitle('');
    setEventDescription('');
    setSelectedEvent(null);
    setSelectedCell(null);
    setSelectedMonthCell(null);
    // NO resetear recurrenceConfig aquí - se mantiene para próximos eventos
  }, [eventTitle, eventDescription, eventColor, selectedEvent, selectedCell, selectedMonthCell, currentView, currentDate, recurrenceConfig]);

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
    // 🎯 LOGGING DE IDENTIFICACIÓN DE EVENTO

    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventColor(event.color);
    setRecurrenceConfig(extractRecurrenceFromEvent(event));
    setModalVisible(true);
  }, []);

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
                    return (
                      <View key={i} style={[styles.dayHeader, { width: dayHeaderWidth }]}>
                        <Text style={styles.dayText}>{`${dayName} ${String(dayNum).padStart(2, '0')}`}</Text>
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
            return (
              <View style={styles.timeRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
                <TouchableOpacity style={[styles.cell, { width: getCellWidth() }]} onPress={() => handleCellPress(0, timeIndex)}>
                {event && (
                    <EventResizableBlock key={event.id} ev={event} onResizeCommit={onResizeCommit} onMoveCommit={onMoveCommit} onQuickPress={onQuickPress} cellWidth={getCellWidth()} />
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
                  {timeSlots.map((_, timeIndex) => (
                    <View key={`row-${timeIndex}`} style={[styles.timeRow, { width: getCellWidth() * 7 }]}> 
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const weekStart = startOfWeek(currentDate);
                        const dayDate = addDays(weekStart, dayIndex);
                        const dateKey = toDateKey(dayDate);
                        const startTime = timeIndex * 30;
                        const lookupKey = `${dateKey}-${startTime}`;
                        const event = eventsByCell[lookupKey];

                        return (
                          <TouchableOpacity
                            key={`cell-${dayIndex}-${timeIndex}`}
                            style={[styles.cell, { width: getCellWidth() }]}
                            onPress={() => handleCellPress(dayIndex, timeIndex)}
                          >
                            {event && (
                                <EventResizableBlock key={event.id} ev={event} onResizeCommit={onResizeCommit} onMoveCommit={onMoveCommit} onQuickPress={onQuickPress} cellWidth={getCellWidth()} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Modal para crear/editar */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleCloseModal}>
        <View style={styles.fullscreenModal}>
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.createButton} onPress={handleSaveEvent}>
              <Text style={styles.createButtonText}>{selectedEvent ? 'Editar' : 'Crear'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
            <View style={styles.titleSection}>
              <Text style={styles.emoji}>☀️</Text>
              <Text style={styles.taskTitle}>Nueva tarea</Text>
              <Text style={styles.subtitle}>Toque para renombrar</Text>
            </View>

            <TextInput style={styles.titleInput} placeholder="Nova tarefa" value={eventTitle} onChangeText={setEventTitle} maxLength={50} autoFocus />
            <Text style={styles.charCounter}>{eventTitle.length}/50</Text>

            <View style={styles.colorSection}>
              {availableColors.map(color => (
                <TouchableOpacity key={color} style={[styles.colorCircle, { backgroundColor: color }, eventColor === color && styles.selectedColorCircle]} onPress={() => setEventColor(color)}>
                  {eventColor === color && <Ionicons name="checkmark" size={16} color="white" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.configCard}>
              <TouchableOpacity style={styles.configRow}>
                <Ionicons name="calendar-outline" size={20} color={Colors.light.tint} />
                <Text style={styles.configLabel}>Data</Text>
                <Text style={styles.configValue}>Hoje</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.configRow}
                onPress={handleOpenRecurrenceModal}
              >
                <Ionicons name="refresh-outline" size={20} color={Colors.light.tint} />
                <Text style={styles.configLabel}>Repetir</Text>
                <Text style={styles.configValue} numberOfLines={1}>{recurrenceSummary}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.configRow}>
                <Ionicons name="time-outline" size={20} color={Colors.light.tint} />
                <Text style={styles.configLabel}>Tempo</Text>
                <Text style={styles.configValue}>A qualquer momento</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.configRow}>
                <Ionicons name="alarm-outline" size={20} color={Colors.light.tint} />
                <Text style={styles.configLabel}>Lembrete</Text>
                <Text style={styles.configValue}>Sem lembrete</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.configRow}>
                <Ionicons name="pricetag-outline" size={20} color={Colors.light.tint} />
                <Text style={styles.configLabel}>Tag</Text>
                <Text style={styles.configValue}>Sem tag</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.subtasksCard}>
              <Ionicons name="add" size={20} color={Colors.light.tint} />
              <Text style={styles.subtasksLabel}>Subtarefas</Text>
            </TouchableOpacity>

            <Text style={styles.subtasksDescription}>As subtarefas podem ser definidas como sua rotina ou lista de verificação diária</Text>

            {/* Botón de borrar - solo visible cuando se está editando un evento */}
            {selectedEvent && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteEvent}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                <Text style={styles.deleteButtonText}>Borrar evento</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

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
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>¿Borrar evento?</Text>
            <Text style={styles.deleteModalMessage}>
              ¿Quieres borrar solo este evento o toda la secuencia?
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalButtonSecondary]}
                onPress={() => handleDeleteConfirm('single')}
              >
                <Text style={styles.deleteModalButtonTextSecondary}>Solo este evento</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalButtonPrimary]}
                onPress={() => handleDeleteConfirm('series')}
              >
                <Text style={styles.deleteModalButtonTextPrimary}>Toda la secuencia</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.deleteModalCancel}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={styles.deleteModalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  eventContainer: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2 },
  eventBlock: { flex: 1, borderRadius: 4, padding: 4, justifyContent: 'center', minHeight: 20 },
  gridBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  eventText: { fontSize: 11, color: 'white', fontWeight: '500' },
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
  subtasksCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subtasksLabel: { fontSize: 16, color: Colors.light.text, marginLeft: 12 },
  subtasksDescription: { fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 16 },
  
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
