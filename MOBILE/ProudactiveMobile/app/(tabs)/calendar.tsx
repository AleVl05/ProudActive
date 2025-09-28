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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CELL_HEIGHT = 50; // 30 minutos = 50px
const START_HOUR = 6;
const END_HOUR = 22;

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: number; // minutos desde las 6 AM
  duration: number; // minutos
  color: string;
  category: string;
  date: string; // 'YYYY-MM-DD' -> fecha absoluta del evento
}

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

export default function CalendarView({}: CalendarViewProps) {
  const insets = useSafeAreaInsets();

  // estado principal
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

  // Refs para scroll y sincronización
  const verticalScrollRef = useRef<ScrollView | null>(null);
  const contentHorizontalRef = useRef<ScrollView | null>(null); // contenido de días (semana)
  const headerHorizontalRef = useRef<ScrollView | null>(null); // header de días (sin gestos)
  const horizontalOffsetRef = useRef(0);

  // colores
  const availableColors = ['#6b53e2', '#f44336', '#4caf50', '#ff9800', '#9c27b0'];

  // --- utilidades de fecha ---
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
    // 'YYYY-MM-DD'
    return d.toISOString().slice(0, 10);
  }, []);

  // time slots
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

  // Indexar eventos por fecha+hora para lookup rápido
  const eventsByCell = useMemo(() => {
    const index: { [key: string]: Event } = {};
    events.forEach(ev => {
      const key = `${ev.date}-${ev.startTime}`;
      index[key] = ev;
    });
    return index;
  }, [events]);

  // Indexar eventos mensuales por año-mes-dia
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

  // obtener ancho celda
  const getCellWidth = useCallback(() => {
    if (currentView === 'day') {
      return width - 60;
    } else if (currentView === 'week') {
      return ((width - 60) / 7) * 2; // doble ancho por día (según requeriste)
    }
    return (width - 60) / 7;
  }, [currentView]);

  // Formatea header superior usando currentDate (no usar new Date fijo)
  const formatHeaderDate = useCallback(() => {
    const d = new Date(currentDate);
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    if (currentView === 'day') {
      return `Hoy, ${dayNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`;
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);
      return `Semana ${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
    } else if (currentView === 'month') {
      return `${d.toLocaleString('es-ES', { month: 'long' })} ${d.getFullYear()}`;
    }
    return '';
  }, [currentView, currentDate, startOfWeek, addDays]);

  // ---- Manejo de creación/edición de eventos ----
  // Determina la fecha real (YYYY-MM-DD) que corresponde a la celda seleccionada
  const dateForCell = useCallback((view: string, cell: SelectedCell | SelectedMonthCell | null) => {
    if (!cell) return null;
    if (view === 'day' && 'timeIndex' in (cell as SelectedCell)) {
      // el día actual
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
    // calcular fecha correspondiente a la celda (usando view semana)
    let dateKey = '';
    if (currentView === 'day') {
      dateKey = toDateKey(currentDate);
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const dayDate = addDays(weekStart, dayIndex);
      dateKey = toDateKey(dayDate);
    } else {
      // por defecto usar currentDate
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
      setModalVisible(true);
    } else {
      setSelectedEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventColor(getRandomColor());
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
      setModalVisible(true);
    } else {
      setSelectedEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventColor(getRandomColor());
      setModalVisible(true);
      setSelectedMonthCell({ dayIndex: day - 1, day });
    }
  }, [currentDate, monthEventsByDay, getRandomColor]);

  const handleSaveEvent = useCallback(() => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    if (selectedEvent) {
      // editar existente
      if ('startTime' in selectedEvent) {
        setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, title: eventTitle, description: eventDescription, color: eventColor } : ev));
      } else {
        setMonthEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, title: eventTitle, description: eventDescription, color: eventColor } : ev));
      }
    } else if (selectedCell) {
      // crear evento día/semana -> asignar fecha absoluta
      let dateKey = '';
      if (currentView === 'day') {
        dateKey = toDateKey(currentDate);
      } else if (currentView === 'week') {
        const weekStart = startOfWeek(currentDate);
        const dayDate = addDays(weekStart, selectedCell.dayIndex);
        dateKey = toDateKey(dayDate);
      } else {
        // fallback al día actual
        dateKey = toDateKey(currentDate);
      }

      const newEvent: Event = {
        id: Date.now().toString(),
        title: eventTitle,
        description: eventDescription,
        startTime: selectedCell.startTime,
        duration: 30,
        color: eventColor,
        category: 'General',
        date: dateKey,
      };
      setEvents(prev => [...prev, newEvent]);
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

    // limpiar modal
    setModalVisible(false);
    setEventTitle('');
    setEventDescription('');
    setSelectedEvent(null);
    setSelectedCell(null);
    setSelectedMonthCell(null);
  }, [eventTitle, eventDescription, eventColor, selectedEvent, selectedCell, selectedMonthCell, currentView, currentDate, startOfWeek, addDays, toDateKey]);

  // ---- Navegación de fecha (flechas) ----
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (currentView === 'day') {
      const newDate = addDays(currentDate, direction === 'next' ? 1 : -1);
      setCurrentDate(newDate);
      // reset scrolls
      verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: true });
      return;
    }

    if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const newWeekStart = addDays(weekStart, direction === 'next' ? 7 : -7);
      setCurrentDate(newWeekStart);
      // reset scroll horizontal/vertical
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

  // Cuando el usuario cambia la vista desde los botones de arriba:
  // - si elige 'day' volvemos al día de hoy (UX solicitado)
  // - reset de scrolls
  const onChangeView = useCallback((view: 'day'|'week'|'month'|'year') => {
    setCurrentView(view);
    if (view === 'day') {
      setCurrentDate(new Date());
    }
    // reseteo visual
    setTimeout(() => {
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
    }, 20);
  }, []);

  // sincronizar horizontal header con contenido (semana)
  const handleHorizontalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset?.x || 0;
    horizontalOffsetRef.current = x;
    // sync header (no gestos en header)
    headerHorizontalRef.current?.scrollTo({ x, animated: false });
  }, []);

  // al cambiar currentView/currentDate, resetear offsets si hace falta (sin setState en bucle)
  useEffect(() => {
    // solo ajustar scrolls después de render
    setTimeout(() => {
      contentHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      headerHorizontalRef.current?.scrollTo({ x: 0, animated: false });
      verticalScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 20);
  }, [currentView, currentDate]);

  // ---- renderizado ----
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

      {/* header días (si no month) - para semana sincronizamos el scroll horizontal del header */}
      {currentView !== 'month' && (
        <View style={styles.weekHeader}>
          <View style={styles.timeColumn} />
          {currentView === 'day' ? (
            <View style={[styles.dayHeader, { width: getCellWidth() }]}>
              <Text style={styles.dayText}>Hoy</Text>
            </View>
          ) : (
            // Semana: header horizontal sincronizable (no permitimos scroll en header directamente)
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

      {/* header mes */}
      {currentView === 'month' && (
        <View style={styles.monthHeader}>
          <View style={styles.timeColumn} />
          <View style={styles.monthTitleContainer}>
            <Text style={styles.monthTitle}>Días del mes</Text>
          </View>
        </View>
      )}

      {/* contenido: month / day / week */}
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
                    <View style={[styles.eventBlock, { backgroundColor: event.color, height: (event.duration / 30) * CELL_HEIGHT - 2 }]}>
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
      ) : (
        // WEEK view: single vertical ScrollView (para evitar jitter) que contiene columna de horas + content horizontal
        <View style={styles.weekContainer}>
          <ScrollView
            ref={verticalScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <View style={{ flexDirection: 'row' }}>
              {/* Column of hours (fixed) */}
              <View style={styles.fixedTimeColumn}>
                {timeSlots.map((time, idx) => (
                  <View key={`h-${idx}`} style={[styles.timeRow, { width: 60 }]}>
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Horizontal days content (scrollable) */}
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
                              <View style={[styles.eventBlock, { backgroundColor: event.color, height: (event.duration / 30) * CELL_HEIGHT - 2 }]}>
                                <Text style={styles.eventText} numberOfLines={2}>{event.title}</Text>
                              </View>
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

      {/* Modal para crear/editar (restaurado con opciones que pediste) */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {
        setModalVisible(false);
        setSelectedEvent(null);
        setSelectedCell(null);
        setSelectedMonthCell(null);
      }}>
        <View style={styles.fullscreenModal}>
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => { setModalVisible(false); setSelectedEvent(null); setSelectedCell(null); }}>
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

              <TouchableOpacity style={styles.configRow}>
                <Ionicons name="refresh-outline" size={20} color={Colors.light.tint} />
                <Text style={styles.configLabel}>Repetir</Text>
                <Text style={styles.configValue}>Desligado</Text>
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
