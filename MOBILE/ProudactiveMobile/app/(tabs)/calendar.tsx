// calendar.tsx
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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


const { width } = Dimensions.get('window');
const CELL_HEIGHT = 50; // 30 minutos = 50px
const START_HOUR = 6;
const END_HOUR = 22;

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
  // Debug: Log para ver qué datos está recibiendo
  console.log('🔍 DEBUG - Evento recibido para extraer recurrencia:', {
    id: event?.id,
    is_recurring: event?.is_recurring,
    recurrence_rule: event?.recurrence_rule,
    recurrence_end_date: event?.recurrence_end_date
  });

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

    console.log('🔍 DEBUG - Configuración de recurrencia extraída:', config);
    return config;
  } catch (error) {
    console.warn('Error parsing recurrence rule:', error);
    return createDefaultRecurrenceConfig();
  }
};

// Función para generar instancias recurrentes bajo demanda
const generateRecurrentInstances = (
  masterEvent: any, 
  startDate: Date, 
  endDate: Date
): Event[] => {
  if (!masterEvent || !masterEvent.is_recurring) {
    return [];
  }

  try {
    console.log('🔍 DEBUG - masterEvent.recurrence_rule:', masterEvent.recurrence_rule);
    
    const rule = typeof masterEvent.recurrence_rule === 'string'
      ? JSON.parse(masterEvent.recurrence_rule)
      : masterEvent.recurrence_rule;

    console.log('🔍 DEBUG - rule parseado:', rule);

    if (!rule || !rule.frequency) {
      console.log('🔍 DEBUG - Regla inválida o sin frecuencia:', rule);
      return [];
    }

    const instances: Event[] = [];
    const eventStart = new Date(masterEvent.start_utc);
    const eventEnd = new Date(masterEvent.end_utc);
    const duration = eventEnd.getTime() - eventStart.getTime();
    
    // Crear recurrenceEndDate de manera más robusta
    let recurrenceEndDate = null;
    if (masterEvent.recurrence_end_date) {
      try {
        // Parsear la fecha YYYY-MM-DD y crear fecha UTC al final del día
        const [year, month, day] = masterEvent.recurrence_end_date.split('-').map(Number);
        recurrenceEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      } catch (error) {
        console.error('Error al parsear recurrence_end_date:', error);
        recurrenceEndDate = null;
      }
    }

    // Debug: Log para verificar las fechas de recurrencia
    console.log('🔍 DEBUG - Generando instancias recurrentes:', {
      eventStart: eventStart.toISOString(),
      recurrenceEndDate: recurrenceEndDate?.toISOString(),
      hasEndDate: !!masterEvent.recurrence_end_date,
      endDateFromEvent: masterEvent.recurrence_end_date
    });

    const frequency = rule.frequency.toUpperCase();
    const interval = rule.interval || 1;

    let currentDate = new Date(eventStart);
    let instanceCount = 0;
    const maxInstances = 1000; // Límite de seguridad

    console.log('🔍 DEBUG - Iniciando bucle de recurrencia:', {
      eventStart: eventStart.toISOString(),
      endDate: endDate.toISOString(),
      recurrenceEndDate: recurrenceEndDate?.toISOString(),
      currentDate: currentDate.toISOString()
    });

    while (
      currentDate <= endDate && 
      instanceCount < maxInstances &&
      (!recurrenceEndDate || currentDate <= recurrenceEndDate)
    ) {
      // Debug: Log para verificar la condición del bucle
      if (instanceCount < 5) { // Solo los primeros 5 para no spamear
        console.log('🔍 DEBUG - Bucle recurrencia:', {
          currentDate: currentDate.toISOString(),
          endDate: endDate.toISOString(),
          recurrenceEndDate: recurrenceEndDate?.toISOString(),
          condition1: currentDate <= endDate,
          condition2: instanceCount < maxInstances,
          condition3: !recurrenceEndDate || currentDate <= recurrenceEndDate,
          willContinue: currentDate <= endDate && instanceCount < maxInstances && (!recurrenceEndDate || currentDate <= recurrenceEndDate)
        });
      }
      
      // Solo generar si la instancia está en el rango visible
      if (currentDate >= startDate) {
        // Mantener las fechas en UTC para evitar problemas de zona horaria
        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(currentDate.getTime() + duration);
        
        // Crear la instancia con ID único
        const instance: Event = {
          id: `${masterEvent.id}_${currentDate.toISOString().split('T')[0]}`,
          title: masterEvent.title,
          description: masterEvent.description,
          startTime: (instanceStart.getUTCHours() * 60 + instanceStart.getUTCMinutes()) - (START_HOUR * 60),
          duration: Math.round(duration / (1000 * 60)), // minutos
          color: masterEvent.color,
          category: masterEvent.category || 'General',
          date: instanceStart.toISOString().slice(0, 10), // YYYY-MM-DD
          // IMPORTANTE: Pasar los campos de recurrencia del evento master
          is_recurring: masterEvent.is_recurring,
          recurrence_rule: masterEvent.recurrence_rule,
          recurrence_end_date: masterEvent.recurrence_end_date,
        };

        instances.push(instance);
      }

      // Calcular la próxima fecha según la frecuencia
      switch (frequency) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        
        case 'WEEKLY':
          if (rule.byWeekDays && rule.byWeekDays.length > 0) {
            // Encontrar el próximo día de la semana especificado
            const weekDayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
            const targetDays = rule.byWeekDays.map((day: string) => weekDayCodes.indexOf(day)).filter((d: number) => d !== -1);
            
            let nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            // Buscar el próximo día válido
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
            // Encontrar el próximo día del mes especificado
            const currentDay = currentDate.getDate();
            const targetDays = rule.byMonthDays.sort((a: number, b: number) => a - b);
            
            let nextDay = targetDays.find((day: number) => day > currentDay);
            if (nextDay) {
              currentDate.setDate(nextDay);
            } else {
              // Ir al próximo mes con el primer día especificado
              currentDate.setMonth(currentDate.getMonth() + interval);
              currentDate.setDate(targetDays[0]);
            }
          } else {
            currentDate.setMonth(currentDate.getMonth() + interval);
          }
          break;
        
        default:
          // Si no reconocemos la frecuencia, salir para evitar bucle infinito
          return instances;
      }

      instanceCount++;
    }

    return instances;
  } catch (error) {
    console.warn('Error generating recurrent instances:', error);
    console.log('🔍 DEBUG - Error context:', {
      masterEvent: {
        id: masterEvent.id,
        start_utc: masterEvent.start_utc,
        end_utc: masterEvent.end_utc,
        recurrence_end_date: masterEvent.recurrence_end_date
      },
      rule: rule,
      error: error
    });
    return [];
  }
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
  startTime: number; // minutos desde las 6 AM
  duration: number; // minutos
  color: string;
  category: string;
  date: string; // 'YYYY-MM-DD' -> fecha absoluta del evento
  // Campos de recurrencia
  is_recurring?: boolean;
  recurrence_rule?: string | object | null;
  recurrence_end_date?: string | null;
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

async function apiFetchEvents(startIso: string, endIso: string) {
  const params = new URLSearchParams({ start: startIso, end: endIso });
  const res = await fetch(`${API_BASE}/events?${params.toString()}`);
  return res;
}

interface EventResizableBlockProps {
  ev: Event;
  onResizeCommit: (event: Event, newStartTime: number, newDuration: number) => void;
}

const EventResizableBlock = React.memo(function EventResizableBlock({ ev, onResizeCommit }: EventResizableBlockProps) {
  const ghostHeight = useRef(new Animated.Value((ev.duration / 30) * CELL_HEIGHT - 2)).current;
  const ghostTopOffset = useRef(new Animated.Value(0)).current;
  const [showGhost, setShowGhost] = useState(false);
  const initial = useRef({ startTime: ev.startTime, duration: ev.duration }).current;

  const commitResize = useCallback((newStartTime: number, newDuration: number) => {
    const minDuration = 30;
    if (newDuration < minDuration) newDuration = minDuration;
    if (newStartTime < 0) return;
    onResizeCommit(ev, newStartTime, newDuration);
  }, [ev, onResizeCommit]);

  const topResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setShowGhost(true);
      ghostTopOffset.setValue(0);
      ghostHeight.setValue((initial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT); // snap 30min
      const deltaMin = deltaSlots * 30;
      const newStart = initial.startTime + deltaMin;
      const newDuration = initial.duration - deltaMin;
      if (newDuration >= 30 && newStart >= 0) {
        ghostTopOffset.setValue(deltaSlots * CELL_HEIGHT);
        ghostHeight.setValue((newDuration / 30) * CELL_HEIGHT - 2);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newStart = Math.max(0, initial.startTime + deltaMin);
      const newDuration = Math.max(30, initial.duration - deltaMin);
      setShowGhost(false);
      commitResize(newStart, newDuration);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => setShowGhost(false),
  })).current;

  const bottomResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setShowGhost(true);
      ghostTopOffset.setValue(0);
      ghostHeight.setValue((initial.duration / 30) * CELL_HEIGHT - 2);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newDuration = initial.duration + deltaMin;
      if (newDuration >= 30) {
        ghostHeight.setValue((newDuration / 30) * CELL_HEIGHT - 2);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const deltaSlots = Math.round(gesture.dy / CELL_HEIGHT);
      const deltaMin = deltaSlots * 30;
      const newDuration = Math.max(30, initial.duration + deltaMin);
      setShowGhost(false);
      commitResize(initial.startTime, newDuration);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => setShowGhost(false),
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
            transform: [{ translateY: ghostTopOffset }],
            height: ghostHeight,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: ev.color,
            borderRadius: 4,
            backgroundColor: 'transparent',
            zIndex: 5,
          }}
        />
      )}

      <View style={[styles.eventBlock, { backgroundColor: ev.color, height: (ev.duration / 30) * CELL_HEIGHT - 2 }]}> 
        <Text style={styles.eventText} numberOfLines={2}>{ev.title}</Text>
        {/* Handles invisibles superior e inferior (hitzone ampliada 12px) */}
        <View {...topResponder.panHandlers} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12 }} />
        <View {...bottomResponder.panHandlers} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 12 }} />
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
    if (!apiEvent?.id || !apiEvent?.start_utc || !apiEvent?.end_utc) return null;

    const startDate = new Date(apiEvent.start_utc);
    const endDate = new Date(apiEvent.end_utc);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

    const totalStartMinutes = startDate.getHours() * 60 + startDate.getMinutes();
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
    };
  }, [toDateKey]);

  // Función para refrescar eventos después de crear/editar
  const refreshEvents = useCallback(async () => {
    try {
      const rangeStart = new Date(currentDate);
      rangeStart.setDate(rangeStart.getDate() - 7); // 1 semana atrás
      const rangeEnd = new Date(currentDate);
      rangeEnd.setDate(rangeEnd.getDate() + 30); // 1 mes adelante
      
      const fetched = await fetchEventsForRange(rangeStart, rangeEnd);
      if (fetched) {
        // Evitar duplicados: solo agregar eventos que no existan ya
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = fetched.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        });
      }
    } catch (error) {
      console.error('Error al refrescar eventos:', error);
    }
  }, [currentDate, fetchEventsForRange]);

  const fetchEventsForRange = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    try {
      // Expandir el rango para capturar eventos recurrentes que puedan generar instancias en el rango visible
      const expandedStart = new Date(rangeStart);
      expandedStart.setMonth(expandedStart.getMonth() - 6); // 6 meses atrás para capturar eventos recurrentes
      
      const response = await apiFetchEvents(expandedStart.toISOString(), rangeEnd.toISOString());
      if (!response.ok) {
        console.log('GET events failed:', response.status);
        return null;
      }

      const body = await response.json();
      if (!body?.success || !Array.isArray(body.data)) {
        console.log('GET events unexpected body:', body);
        return null;
      }

      const allEvents: Event[] = [];
      
      // Procesar eventos regulares y recurrentes
      for (const item of body.data) {
        if (item.is_recurring) {
          // Generar instancias recurrentes solo para el rango visible
          const recurrentInstances = generateRecurrentInstances(item, rangeStart, rangeEnd);
          allEvents.push(...recurrentInstances);
          
          // También incluir el evento maestro si está en el rango visible
          const masterEvent = normalizeApiEvent(item);
          if (masterEvent) {
            const masterDate = new Date(masterEvent.date);
            if (masterDate >= rangeStart && masterDate <= rangeEnd) {
              allEvents.push(masterEvent);
            }
          }
        } else {
          // Evento regular
          const normalizedEvent = normalizeApiEvent(item);
          if (normalizedEvent) {
            allEvents.push(normalizedEvent);
          }
        }
      }

      return allEvents;
    } catch (error) {
      console.log('GET events error:', (error as Error).message);
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

    if (tempId && !isNewEvent) {
      // Lógica para actualizar un evento existente
      if ('startTime' in selectedEvent) {
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

      const localId = Date.now().toString();
      const newEvent: Event = {
        id: localId,
        title: eventTitle,
        description: eventDescription,
        startTime: selectedCell.startTime,
        duration: 30,
        color: eventColor,
        category: 'General',
        date: dateKey,
        // Campos de recurrencia
        is_recurring: recurrenceConfig.enabled,
        recurrence_rule: recurrenceConfig.enabled ? JSON.stringify({
          frequency: recurrenceConfig.mode.toUpperCase(),
          interval: recurrenceConfig.interval,
          ...(recurrenceConfig.mode === 'weekly' && recurrenceConfig.weekDays.length > 0 && { byWeekDays: recurrenceConfig.weekDays }),
          ...(recurrenceConfig.mode === 'monthly' && recurrenceConfig.monthDays.length > 0 && { byMonthDays: recurrenceConfig.monthDays })
        }) : null,
        recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null
      };
      setEvents(prev => [...prev, newEvent]);

      // Persistencia API con reconciliación de ID
      try {
        const startLocal = dateKeyToLocalDate(dateKey, newEvent.startTime);
        const endLocal = dateKeyToLocalDate(dateKey, newEvent.startTime + newEvent.duration);
        
        // Debug: Verificar conversión de fechas
        console.log('🔍 DEBUG - Conversión de fechas:', {
          dateKey,
          startTime: newEvent.startTime,
          startLocal: startLocal.toISOString(),
          endLocal: endLocal.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
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
        }

        const payload = {
          calendar_id: calendarId,
          title: newEvent.title,
          description: newEvent.description,
          start_utc: startLocal.toISOString(),
          end_utc: endLocal.toISOString(),
          color: newEvent.color,
          is_recurring: recurrenceConfig.enabled,
          recurrence_rule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
          recurrence_end_date: recurrenceConfig.hasEndDate ? recurrenceConfig.endDate : null,
        };
        
        // Debug: Log para verificar qué se está enviando
        console.log('🔍 DEBUG - Payload enviado al API:', JSON.stringify(payload, null, 2));
        const res = await apiPostEvent(payload);
        const createdEvent = await res.json();
        
        // En handleSaveEvent, reemplaza el bloque if (res.ok...) por este:
      if (res.ok && createdEvent?.data?.id) {
        // Construimos un objeto limpio que SÍ CUMPLE con la interfaz 'Event'
        const finalEvent: Event = {
            id: createdEvent.data.id.toString(), // Usamos el ID real del servidor
            title: createdEvent.data.title,
            description: createdEvent.data.description,
            color: createdEvent.data.color,
            // Mantenemos estos datos del evento temporal que creamos antes
            date: dateKey,
            startTime: newEvent.startTime,
            duration: newEvent.duration,
            category: 'General',
        };

        // Reemplaza el evento temporal por el evento final con el ID correcto
        setEvents(prev => [...prev.filter(e => e.id !== localId), finalEvent]);
        
        // Refrescar eventos para mostrar la recurrencia inmediatamente
        await refreshEvents();

      } else {
        // Tu lógica de manejo de errores
        console.log('POST event failed:', res.status, createdEvent);
        Alert.alert('Aviso', 'El evento se creó localmente pero no en el servidor.');
      }
      } catch (e) {
        console.log('POST event error:', (e as any)?.message || e);
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

    if (resizeLockRef.current.has(eventId)) return;
    resizeLockRef.current.add(eventId);

    // 1. Actualización optimista de la UI (para que se vea instantáneo)
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, startTime: newStartTime, duration: newDuration } : ev));

    const startLocal = dateKeyToLocalDate(eventToUpdate.date, newStartTime);
    const endLocal = dateKeyToLocalDate(eventToUpdate.date, newStartTime + newDuration);

    try {
        console.log(`PATCH attempt eventId: ${eventId} start: ${startLocal.toISOString()} end: ${endLocal.toISOString()}`);
        const res = await apiPutEventTimes(eventId, startLocal.toISOString(), endLocal.toISOString());
        console.log('Resize PATCH status:', res.status);

        if (res.status === 404) {
            // FALLBACK: El evento no existía en el servidor, lo creamos
            console.log('Fallback: Event not found, creating it...');
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
                console.log(`Fallback POST created event id: ${serverId}, replacing old id: ${eventId}`);

                // Reemplazamos el ID temporal por el ID del servidor EN el evento que ya habíamos actualizado
                setEvents(prev => prev.map(e => (e.id === eventId ? { ...e, id: serverId } : e)));

                // Reintentamos el guardado de la hora correcta con el nuevo ID
                const retryRes = await apiPutEventTimes(serverId, startLocal.toISOString(), endLocal.toISOString());
                console.log('Re-try PUT after create status:', retryRes.status);
                if (!retryRes.ok) throw new Error('Failed to update after fallback create');
            } else {
                throw new Error('Fallback POST failed');
            }
        } else if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
    } catch (e) {
        console.log('Error during resize commit:', (e as Error).message);
        Alert.alert('Error', 'No se pudo guardar el cambio. Reintentando...');
        // Revertimos al estado original del bloque antes del estiramiento
        setEvents(prev => prev.map(ev => ev.id === eventId ? eventToUpdate : ev));
    } finally {
        resizeLockRef.current.delete(eventId);
    }
}, []); // <-- La dependencia vacía [] es clave, ahora no sufre de "estado obsoleto"

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
                    <EventResizableBlock key={event.id} ev={event} onResizeCommit={onResizeCommit} />
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
                                <EventResizableBlock key={event.id} ev={event} onResizeCommit={onResizeCommit} />
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
              <Text style={styles.createButtonText}>Crear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
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
          </View>
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
  timeRow: { flexDirection: 'row', height: CELL_HEIGHT, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  timeText: { fontSize: 12, color: Colors.light.text, textAlign: 'center' },
  cell: { flex: 1, borderRightWidth: 0.5, borderRightColor: '#f0f0f0', position: 'relative' },
  eventContainer: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2 },
  eventBlock: { flex: 1, borderRadius: 4, padding: 4, justifyContent: 'center', minHeight: 20 },
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
