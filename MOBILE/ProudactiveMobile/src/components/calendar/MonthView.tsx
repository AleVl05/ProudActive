// MonthView.tsx - Component for month view calendar
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { CELL_HEIGHT } from '../../utils/dateConstants';
import { Colors } from '@/constants/theme';
import EventResizableBlock from './EventResizableBlock/EventResizableBlock';
import GridBackground from './GridBackground';
import {
  MonthEvent,
  monthEventFrontendToBackend,
} from './monthEventHelpers';
import {
  apiPutMonthEvent,
  apiPostMonthEvent,
} from '@/services/calendarApi';
import { apiGetCalendars } from '@/services/calendarApi';

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  duration: number;
  color: string;
  category: string;
  date: string;
}

interface MonthViewProps {
  currentDate: Date;
  monthEvents: MonthEvent[];
  setMonthEvents: React.Dispatch<React.SetStateAction<MonthEvent[]>>;
  verticalScrollRef: React.RefObject<ScrollView | null>;
  getCellWidth: () => number;
  setSelectedEvent: (event: Event | MonthEvent | null) => void;
  setEventTitle: (title: string) => void;
  setEventDescription: (description: string) => void;
  setEventColor: (color: string) => void;
  setModalVisible: (visible: boolean) => void;
  setSelectedMonthCell: (cell: { dayIndex: number; day: number } | null) => void;
  getRandomColor: () => string;
  createDefaultRecurrenceConfig: () => any;
  setSubtasks: (tasks: any[]) => void;
  setNewSubtaskText: (text: string) => void;
  setShowSubtaskInput: (show: boolean) => void;
  loadSubtasks: (eventId: string, event: MonthEvent, forceReload?: boolean) => void;
  eventLongPressHandlers: Record<string, () => void>;
  longPressActiveRef: React.MutableRefObject<Record<string, boolean>>;
  refreshMonthEvents: () => Promise<void>;
  getSubtaskStatus: (eventId: string) => { hasSubtasks: boolean; allCompleted: boolean };
  onDelete?: (event: MonthEvent) => void; // Prop para eliminar evento desde long press
}

export default function MonthView({
  currentDate,
  monthEvents,
  setMonthEvents,
  verticalScrollRef,
  getCellWidth,
  setSelectedEvent,
  setEventTitle,
  setEventDescription,
  setEventColor,
  setModalVisible,
  setSelectedMonthCell,
  getRandomColor,
  createDefaultRecurrenceConfig,
  setSubtasks,
  setNewSubtaskText,
  setShowSubtaskInput,
  loadSubtasks,
  eventLongPressHandlers,
  longPressActiveRef,
  refreshMonthEvents,
  getSubtaskStatus,
  onDelete,
}: MonthViewProps) {
  // Calcular días del mes
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [currentDate]);

  // Mapear eventos por día (para encontrar eventos rápidamente)
  const monthEventsByDayIndex = useMemo(() => {
    const map: Record<number, MonthEvent> = {};
    monthEvents.forEach(ev => {
      // Mapear todos los días que cubre el evento para permitir edición desde cualquier día visible
      const start = Math.max(1, ev.startDay);
      const end = Math.min(monthDays.length, ev.startDay + ev.duration - 1);
      for (let day = start; day <= end; day += 1) {
        map[day] = ev;
      }
    });
    return map;
  }, [monthEvents, monthDays.length]);

  // Adaptar MonthEvent a Event helper function
  const adaptMonthEvent = useCallback((ev: MonthEvent): Event => ({
    id: ev.id,
    title: ev.title,
    description: ev.description,
    startTime: (ev.startDay - 1) * 30, // Día 1 = 0 min, día 2 = 30 min (1 slot)
    duration: ev.duration * 30, // 1 día = 30 minutos (1 slot de altura)
    date: `${ev.year}-${String(ev.month + 1).padStart(2, '0')}-${String(ev.startDay).padStart(2, '0')}`,
    color: ev.color,
    category: ev.category,
  }), []);

  return (
    <View style={styles.dayContainer}>
      <ScrollView
        ref={verticalScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <View style={{ flexDirection: 'row' }}>
          {/* Columna de días (fija) */}
          <View style={styles.fixedTimeColumn}>
            {monthDays.map((day, idx) => {
              const now = new Date();
              const currentDay = now.getDate();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const isCurrentDay = day === currentDay && 
                                   currentMonth === currentDate.getMonth() && 
                                   currentYear === currentDate.getFullYear();
              
              return (
                <View key={`day-${idx}`} style={[styles.timeRow, { width: 60 }]}> 
                  <View style={[
                    styles.timeColumn,
                    isCurrentDay && styles.currentHourColumn
                  ]}>
                    <Text style={[
                      styles.timeText,
                      isCurrentDay && styles.currentHourText
                    ]}>{day}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Contenido de la grilla - días del mes */}
          <View style={{ position: 'absolute', left: 60, top: 0, width: getCellWidth(), height: monthDays.length * CELL_HEIGHT }}>
            {monthDays.map((day, dayIndex) => {
              const event = monthEventsByDayIndex[day];
              const isStartDay = !!event && event.startDay === day;
              
              const now = new Date();
              const currentDay = now.getDate();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const isCurrentDay = day === currentDay && 
                                   currentMonth === currentDate.getMonth() && 
                                   currentYear === currentDate.getFullYear();
              
              return (
                <TouchableOpacity
                  key={`cell-${dayIndex}`}
                  style={[
                    styles.gridCell,
                    { 
                      width: getCellWidth(),
                      height: CELL_HEIGHT,
                      top: dayIndex * CELL_HEIGHT
                    },
                    isCurrentDay && styles.currentHourCell
                  ]}
                  onPress={() => {
                    // Verificar si hay un evento en esta celda
                    const hasOccupyingEvent = !!event;
                    
                    if (!hasOccupyingEvent) {
                      // Crear nuevo evento - limpiar estado previo
                      setSelectedEvent(null);
                      setEventTitle('');
                      setEventDescription('');
                      setEventColor(getRandomColor());
                      createDefaultRecurrenceConfig();
                      setSubtasks([]);
                      setNewSubtaskText('');
                      setShowSubtaskInput(false);
                      setSelectedMonthCell({ dayIndex: day - 1, day });
                      setModalVisible(true);
                    } else {
                      // Si hubo long press en este evento, no abrir modal al soltar
                      if (longPressActiveRef.current[event.id]) {
                        return;
                      }
                      // Editar evento existente
                      // ?? FIX: Convertir MonthEvent a Event antes de pasarlo (para evitar crash en DatePickerSetting)
                      setSelectedMonthCell(null);
                      setSelectedEvent(event);
                      setEventTitle(event.title);
                      setEventDescription(event.description || '');
                      setEventColor(event.color);
                      createDefaultRecurrenceConfig();
                      setModalVisible(true);
                      loadSubtasks(event.id, event); // Pasar el MonthEvent original para loadSubtasks
                    }
                  }}
                  onLongPress={() => {
                    // LONG PRESS para eventos en vista de mes
                    if (event) {
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
                    // ?? FIX: Renderizar EventResizableBlock solo en la celda donde el evento empieza
                    if (event && isStartDay) {
                      const adaptedEvent = adaptMonthEvent(event);
                      return (
                        <EventResizableBlock 
                          key={event.id} 
                          ev={adaptedEvent} 
                          onMoveCommit={async (ev: Event, newStartTime: number, newDate: string) => {
                            // Convertir minutos de vuelta a días y actualizar fecha
                            const newStartDay = Math.max(1, Math.min(monthDays.length, Math.round(newStartTime / 30) + 1));
                            const dateParts = newDate.split('-');
                            const newYear = parseInt(dateParts[0]);
                            const newMonth = parseInt(dateParts[1]) - 1;
                            
                            // Preservar la duración original del evento (en días)
                            const originalDuration = event.duration;
                            
                            // 1. Actualización optimista de la UI (inmediata)
                            const updated = { ...event, startDay: newStartDay, year: newYear, month: newMonth, duration: originalDuration };
                            setMonthEvents(prev => prev.map(e => e.id === event.id ? updated : e));
                            
                            // 2. Actualizar en API (en background)
                            try {
                              const backendData = monthEventFrontendToBackend(updated);
                              await apiPutMonthEvent(event.id, {
                                title: updated.title,
                                description: updated.description || '',
                                color: updated.color,
                                ...backendData,
                              });
                              // Si hay cambio de mes, refrescar eventos
                              if (newYear !== currentDate.getFullYear() || newMonth !== currentDate.getMonth()) {
                                await refreshMonthEvents();
                              }
                            } catch (e) {
                              // Revertir cambios si hay error
                              setMonthEvents(prev => prev.map(e => e.id === event.id ? event : e));
                              Alert.alert('Error', 'No se pudo mover el evento.');
                            }
                          }}
                          onResizeCommit={async (ev: Event, newStartTime: number, newDuration: number) => {
                            // Convertir minutos de vuelta a días (30 minutos = 1 día en vista de mes)
                            const newStartDay = Math.max(1, Math.min(monthDays.length, Math.round(newStartTime / 30) + 1));
                            const newDurationDays = Math.max(1, Math.round(newDuration / 30));
                            
                            // 1. Actualización optimista de la UI (inmediata)
                            const updated = { 
                              ...event, 
                              startDay: newStartDay, // Actualizar también startDay si se resize desde arriba
                              duration: newDurationDays 
                            };
                            setMonthEvents(prev => prev.map(e => e.id === event.id ? updated : e));
                            
                            // 2. Actualizar en API (en background)
                            try {
                              const backendData = monthEventFrontendToBackend(updated);
                              await apiPutMonthEvent(event.id, {
                                title: updated.title,
                                description: updated.description || '',
                                color: updated.color,
                                ...backendData,
                              });
                            } catch (e) {
                              // Revertir cambios si hay error
                              setMonthEvents(prev => prev.map(e => e.id === event.id ? event : e));
                              Alert.alert('Error', 'No se pudo redimensionar el evento.');
                            }
                          }}
                          onQuickPress={(ev) => {
                            // ?? FIX: Convertir MonthEvent a Event antes de pasarlo (para evitar crash en DatePickerSetting)
                            const adaptedEvent = adaptMonthEvent(event);
                            setSelectedMonthCell(null);
                            setSelectedEvent(event);
                            setEventTitle(event.title);
                            setEventDescription(event.description || '');
                            setEventColor(event.color);
                            createDefaultRecurrenceConfig();
                            setModalVisible(true);
                            loadSubtasks(event.id, event); // Pasar el MonthEvent original para loadSubtasks
                          }}
                          cellWidth={getCellWidth()} 
                          currentView="month"
                          subtaskStatus={getSubtaskStatus(event.id)}
                          onLongPress={undefined}
                          onDelete={onDelete ? () => onDelete(event) : undefined}
                          onDuplicate={async (ev) => {
                            // Duplicar month event
                            try {
                              const year = currentDate.getFullYear();
                              const month = currentDate.getMonth();
                              const slot = 1; // +1 día debajo
                              const newStartDay = Math.min(event.startDay + event.duration + slot, monthDays.length);
                              
                              const tempMonthEvent: MonthEvent = {
                                id: Date.now().toString(),
                                title: event.title,
                                description: event.description || '',
                                startDay: newStartDay,
                                duration: event.duration,
                                color: event.color,
                                category: event.category,
                                year,
                                month,
                              };
                              
                              const backendData = monthEventFrontendToBackend(tempMonthEvent);
                              const calendarId = (await apiGetCalendars())?.data?.[0]?.id;
                              if (!calendarId) throw new Error('No hay calendars disponibles');
                              
                              const payload = {
                                calendar_id: calendarId,
                                title: event.title,
                                description: event.description || '',
                                color: event.color,
                                ...backendData,
                              };
                              
                              const postRes = await apiPostMonthEvent(payload);
                              const created = await postRes.json();
                              
                              if (postRes.ok && created?.data?.id) {
                                await refreshMonthEvents();
                                Alert.alert('Éxito', 'Evento duplicado correctamente.');
                              } else {
                                Alert.alert('Error', 'No se pudo duplicar el evento');
                              }
                            } catch (e) {
                              Alert.alert('Error', 'No se pudo duplicar el evento');
                            }
                          }}
                        />
                      );
                    }
                    
                    // ?? FIX: Buscar eventos que ocupan esta celda pero empiezan antes
                    let occupyingEvent = null;
                    let isFirstCell = false;
                    let isLastCell = false;
                    const startTime = (day - 1) * 30; // Día 1 = 0 min, día 2 = 30 min
                    
                    // Buscar eventos que empiezan antes pero ocupan este día
                    for (let i = 1; i <= monthDays.length; i++) {
                      const checkDay = day - i;
                      if (checkDay < 1) break;
                      
                      const checkEvent = monthEventsByDayIndex[checkDay];
                      if (checkEvent && checkEvent.startDay <= day && (checkEvent.startDay + checkEvent.duration) > day) {
                        occupyingEvent = checkEvent;
                        // Verificar si esta es la primera celda del evento
                        isFirstCell = (checkEvent.startDay === day);
                        // Verificar si esta es la última celda del evento
                        const eventEndDay = checkEvent.startDay + checkEvent.duration;
                        isLastCell = (eventEndDay > day && eventEndDay <= day + 1);
                        break;
                      }
                    }
                    
                    // ?? FIX: Renderizar drag handler en celdas intermedias
                    if (occupyingEvent && !isFirstCell && !isLastCell) {
                      const adaptedEvent = adaptMonthEvent(occupyingEvent);
                      return (
                        <EventResizableBlock 
                          key={`${occupyingEvent.id}-middle-${day}`} 
                          ev={adaptedEvent} 
                          onMoveCommit={async (ev: Event, newStartTime: number, newDate: string) => {
                            // Convertir minutos de vuelta a días y actualizar fecha
                            const newStartDay = Math.max(1, Math.min(monthDays.length, Math.round(newStartTime / 30) + 1));
                            const dateParts = newDate.split('-');
                            const newYear = parseInt(dateParts[0]);
                            const newMonth = parseInt(dateParts[1]) - 1;
                            
                            // Preservar la duración original del evento (en días)
                            const originalDuration = occupyingEvent.duration;
                            
                            // 1. Actualización optimista de la UI (inmediata)
                            const updated = { ...occupyingEvent, startDay: newStartDay, year: newYear, month: newMonth, duration: originalDuration };
                            setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? updated : e));
                            
                            // 2. Actualizar en API (en background)
                            try {
                              const backendData = monthEventFrontendToBackend(updated);
                              await apiPutMonthEvent(occupyingEvent.id, backendData);
                              // Si hay cambio de mes, refrescar eventos
                              if (newYear !== currentDate.getFullYear() || newMonth !== currentDate.getMonth()) {
                                await refreshMonthEvents();
                              }
                            } catch (e) {
                              // Revertir cambios si hay error
                              setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? occupyingEvent : e));
                              Alert.alert('Error', 'No se pudo mover el evento.');
                            }
                          }}
                          onResizeCommit={async (ev: Event, newStartTime: number, newDuration: number) => {
                            const newStartDay = Math.max(1, Math.min(monthDays.length, Math.round(newStartTime / 30) + 1));
                            const newDurationDays = Math.max(1, Math.round(newDuration / 30));
                            
                            // 1. Actualización optimista de la UI (inmediata)
                            const updated = { ...occupyingEvent, startDay: newStartDay, duration: newDurationDays };
                            setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? updated : e));
                            
                            // 2. Actualizar en API (en background)
                            try {
                              const backendData = monthEventFrontendToBackend(updated);
                              await apiPutMonthEvent(occupyingEvent.id, backendData);
                            } catch (e) {
                              // Revertir cambios si hay error
                              setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? occupyingEvent : e));
                              Alert.alert('Error', 'No se pudo redimensionar el evento.');
                            }
                          }}
                          onQuickPress={(ev) => {
                            // ?? FIX: Convertir MonthEvent a Event antes de pasarlo (para evitar crash en DatePickerSetting)
                            const adaptedEvent = adaptMonthEvent(occupyingEvent);
                            setSelectedEvent(event);
                            setEventTitle(occupyingEvent.title);
                            setEventDescription(occupyingEvent.description || '');
                            setEventColor(occupyingEvent.color);
                            createDefaultRecurrenceConfig();
                            setModalVisible(true);
                            loadSubtasks(occupyingEvent.id, occupyingEvent); // Pasar el MonthEvent original para loadSubtasks
                          }}
                          cellWidth={getCellWidth()} 
                          currentView="month"
                          subtaskStatus={getSubtaskStatus(occupyingEvent.id)}
                          onLongPress={undefined}
                          onDelete={onDelete ? () => onDelete(occupyingEvent) : undefined}
                          renderMiddleCell={true}
                          currentCellStartTime={startTime}
                        />
                      );
                    }
                    
                    // ?? FIX: Renderizar bloque extendido SOLO en la última celda para el handler de abajo
                    if (occupyingEvent && !isFirstCell && isLastCell) {
                      const adaptedEvent = adaptMonthEvent(occupyingEvent);
                      return (
                        <EventResizableBlock 
                          key={`${occupyingEvent.id}-bottom-handler`} 
                          ev={adaptedEvent} 
                          onMoveCommit={async (ev: Event, newStartTime: number, newDate: string) => {
                            // Convertir minutos de vuelta a días y actualizar fecha
                            const newStartDay = Math.max(1, Math.min(monthDays.length, Math.round(newStartTime / 30) + 1));
                            const dateParts = newDate.split('-');
                            const newYear = parseInt(dateParts[0]);
                            const newMonth = parseInt(dateParts[1]) - 1;
                            
                            // Preservar la duración original del evento (en días)
                            const originalDuration = occupyingEvent.duration;
                            
                            // 1. Actualización optimista de la UI (inmediata)
                            const updated = { ...occupyingEvent, startDay: newStartDay, year: newYear, month: newMonth, duration: originalDuration };
                            setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? updated : e));
                            
                            // 2. Actualizar en API (en background)
                            try {
                              const backendData = monthEventFrontendToBackend(updated);
                              await apiPutMonthEvent(occupyingEvent.id, backendData);
                              // Si hay cambio de mes, refrescar eventos
                              if (newYear !== currentDate.getFullYear() || newMonth !== currentDate.getMonth()) {
                                await refreshMonthEvents();
                              }
                            } catch (e) {
                              // Revertir cambios si hay error
                              setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? occupyingEvent : e));
                              Alert.alert('Error', 'No se pudo mover el evento.');
                            }
                          }}
                          onResizeCommit={async (ev: Event, newStartTime: number, newDuration: number) => {
                            const newStartDay = Math.max(1, Math.min(monthDays.length, Math.round(newStartTime / 30) + 1));
                            const newDurationDays = Math.max(1, Math.round(newDuration / 30));
                            
                            // 1. Actualización optimista de la UI (inmediata)
                            const updated = { ...occupyingEvent, startDay: newStartDay, duration: newDurationDays };
                            setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? updated : e));
                            
                            // 2. Actualizar en API (en background)
                            try {
                              const backendData = monthEventFrontendToBackend(updated);
                              await apiPutMonthEvent(occupyingEvent.id, backendData);
                            } catch (e) {
                              // Revertir cambios si hay error
                              setMonthEvents(prev => prev.map(e => e.id === occupyingEvent.id ? occupyingEvent : e));
                              Alert.alert('Error', 'No se pudo redimensionar el evento.');
                            }
                          }}
                          onQuickPress={(ev) => {
                            // ?? FIX: Convertir MonthEvent a Event antes de pasarlo (para evitar crash en DatePickerSetting)
                            const adaptedEvent = adaptMonthEvent(occupyingEvent);
                            setSelectedEvent(event);
                            setEventTitle(occupyingEvent.title);
                            setEventDescription(occupyingEvent.description || '');
                            setEventColor(occupyingEvent.color);
                            createDefaultRecurrenceConfig();
                            setModalVisible(true);
                            loadSubtasks(occupyingEvent.id, occupyingEvent); // Pasar el MonthEvent original para loadSubtasks
                          }}
                          cellWidth={getCellWidth()} 
                          currentView="month"
                          subtaskStatus={getSubtaskStatus(occupyingEvent.id)}
                          onLongPress={undefined}
                          onDelete={onDelete ? () => onDelete(occupyingEvent) : undefined}
                          renderOnlyBottomHandler={true}
                          currentCellStartTime={startTime}
                        />
                      );
                    }
                    
                    return null;
                  })()}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fondo del grid para mes */}
          <View style={{ marginLeft: 60 }}>
            <GridBackground 
              width={getCellWidth()} 
              height={monthDays.length * CELL_HEIGHT} 
              cellHeight={CELL_HEIGHT} 
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dayContainer: { flexDirection: 'row', flex: 1 },
  fixedTimeColumn: { width: 60, backgroundColor: '#f8f9fa', borderRightWidth: 1, borderRightColor: '#e0e0e0' },
  timeRow: { flexDirection: 'row', height: CELL_HEIGHT },
  timeColumn: { width: 60, alignItems: 'center', justifyContent: 'center' },
  timeText: { fontSize: 12, color: Colors.light.text, textAlign: 'center' },
  currentHourColumn: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
  currentHourText: { color: Colors.light.tint, fontWeight: '700' },
  gridCell: { position: 'absolute', borderWidth: 0.5, borderColor: '#e0e0e0', backgroundColor: 'transparent' },
  currentHourCell: { backgroundColor: 'rgba(107, 83, 226, 0.1)' },
});








