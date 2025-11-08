// DatePickerSetting.tsx - Component for selecting event date and time
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../../../constants/theme';
import { dateKeyToLocalDate, dateKeyToDate } from '../../utils/dateUtils';
import { START_HOUR } from '../../utils/dateConstants';
import TimeWheelPicker from './TimeWheelPicker';

interface DatePickerSettingProps {
  selectedEvent: any;
  selectedCell?: any;
  eventDateKey?: string;
  onDateChange?: (dateKey: string, startTime: number) => void;
}

export default function DatePickerSetting({
  selectedEvent,
  selectedCell,
  eventDateKey,
  onDateChange,
}: DatePickerSettingProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  
  // Convertir hora seleccionada a formato { hours, minutes } para el wheel picker
  const getTimeFromDate = (date: Date) => {
    const totalMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    // Redondear a los 30 minutos más cercanos
    const roundedMinutes = minutes < 30 ? 0 : 30;
    return { hours, minutes: roundedMinutes };
  };

  // Inicializar fecha y hora desde evento o celda seleccionada
  useEffect(() => {
    let initialDate: Date;
    let initialTime: Date;

    if (selectedEvent) {
      // Evento existente - usar su fecha y hora
      const eventDate = dateKeyToLocalDate(selectedEvent.date, selectedEvent.startTime);
      initialDate = eventDate;
      initialTime = eventDate;
    } else if (selectedCell && eventDateKey) {
      // Evento nuevo - usar selectedCell
      const cellDate = dateKeyToLocalDate(eventDateKey, selectedCell.startTime);
      initialDate = cellDate;
      initialTime = cellDate;
    } else {
      // Fallback - usar fecha actual
      const now = new Date();
      initialDate = now;
      initialTime = now;
    }

    setSelectedDate(initialDate);
    setSelectedTime(initialTime);
  }, [selectedEvent, selectedCell, eventDateKey]);

  // Formatear fecha para mostrar
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formatear hora para mostrar (usando UTC para mantener consistencia)
  const formatTime = (date: Date): string => {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    
    // Convertir a formato 12 horas
    let hours12 = hours % 12;
    if (hours12 === 0) hours12 = 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  // Manejar cambio de fecha
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      // Combinar fecha seleccionada con hora actual usando UTC
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const hours = selectedTime.getUTCHours();
      const minutes = selectedTime.getUTCMinutes();
      
      const newDate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
      setSelectedDate(newDate);
      setSelectedTime(newDate);
      
      // Notificar cambio
      if (onDateChange) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // Calcular minutos desde START_HOUR usando UTC
        const totalMinutes = hours * 60 + minutes;
        const minutesFromStart = totalMinutes - (START_HOUR * 60);
        onDateChange(dateKey, Math.max(0, minutesFromStart));
      }
    }
  };

  // Manejar selección de hora desde wheel picker
  const handleTimeSelect = (time: { hours: number; minutes: number }) => {
    const year = selectedDate.getUTCFullYear();
    const month = selectedDate.getUTCMonth();
    const day = selectedDate.getUTCDate();
    
    // Crear fecha UTC con la hora seleccionada
    const newTime = new Date(Date.UTC(year, month, day, time.hours, time.minutes, 0, 0));
    setSelectedDate(newTime);
    setSelectedTime(newTime);
    
    // Notificar cambio
    if (onDateChange) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // Calcular minutos desde START_HOUR usando UTC
      const totalMinutes = time.hours * 60 + time.minutes;
      const minutesFromStart = totalMinutes - (START_HOUR * 60);
      onDateChange(dateKey, Math.max(0, minutesFromStart));
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.configRow}
        onPress={() => setShowDatePicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={Colors.light.tint} />
        <Text style={styles.configLabel}>Fecha</Text>
        <Text style={styles.configValue} numberOfLines={1}>
          {formatDate(selectedDate)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.configRow}
        onPress={() => setShowTimePicker(true)}
      >
        <Ionicons name="time-outline" size={20} color={Colors.light.tint} />
        <Text style={styles.configLabel}>Hora</Text>
        <Text style={styles.configValue} numberOfLines={1}>
          {formatTime(selectedTime)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
      </TouchableOpacity>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Wheel Picker */}
      <TimeWheelPicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={handleTimeSelect}
        initialTime={getTimeFromDate(selectedTime)}
      />
    </View>
  );
}

const styles = {
  configRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  configLabel: {
    fontSize: 16,
    color: Colors.light.text,
    marginLeft: 12,
    flex: 1,
  },
  configValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    flex: 1,
    textAlign: 'right' as const,
  },
};

