// TimeWheelPicker.tsx - iOS-style wheel picker for time selection (30-minute intervals)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { START_HOUR, END_HOUR } from '../../utils/dateConstants';

interface TimeWheelPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: { hours: number; minutes: number }) => void;
  initialTime?: { hours: number; minutes: number };
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export default function TimeWheelPicker({
  visible,
  onClose,
  onSelect,
  initialTime,
}: TimeWheelPickerProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Generar opciones de tiempo cada 30 minutos desde START_HOUR hasta END_HOUR
  const timeOptions = React.useMemo(() => {
    const options: { hours: number; minutes: number; label: string; value: string }[] = [];
    
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      // Convertir a formato 12 horas
      let hours12: number;
      let ampm: string;
      
      if (hour === 0) {
        hours12 = 12;
        ampm = 'AM';
      } else if (hour === 12) {
        hours12 = 12;
        ampm = 'PM';
      } else if (hour > 12) {
        hours12 = hour - 12;
        ampm = 'PM';
      } else {
        hours12 = hour;
        ampm = 'AM';
      }
      
      // 00 minutos
      options.push({
        hours: hour,
        minutes: 0,
        label: `${hours12}:00 ${ampm}`,
        value: `${hour.toString().padStart(2, '0')}:00`,
      });
      
      // 30 minutos (siempre agregar, excepto en la última hora del rango)
      if (hour < END_HOUR - 1) {
        options.push({
          hours: hour,
          minutes: 30,
          label: `${hours12}:30 ${ampm}`,
          value: `${hour.toString().padStart(2, '0')}:30`,
        });
      }
    }
    
    return options;
  }, []);

  // Encontrar índice inicial
  const getInitialIndex = () => {
    if (initialTime) {
      const index = timeOptions.findIndex(
        opt => opt.hours === initialTime.hours && opt.minutes === initialTime.minutes
      );
      return index >= 0 ? index : 0;
    }
    return 0;
  };

  const [selectedIndex, setSelectedIndex] = useState(getInitialIndex());

  // Scroll al índice inicial cuando se abre
  useEffect(() => {
    if (visible) {
      const index = getInitialIndex();
      setSelectedIndex(index);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialTime]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, timeOptions.length - 1));
    setSelectedIndex(clampedIndex);
  };

  const handleSelect = () => {
    const selected = timeOptions[selectedIndex];
    if (selected) {
      onSelect({ hours: selected.hours, minutes: selected.minutes });
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Seleccionar Hora</Text>
            <TouchableOpacity onPress={handleSelect} style={styles.headerButton}>
              <Text style={styles.saveButton}>Guardar</Text>
            </TouchableOpacity>
          </View>

          {/* Wheel Picker */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerMaskTop} />
            <ScrollView
              ref={scrollViewRef}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {timeOptions.map((option, index) => (
                <View
                  key={`${option.hours}-${option.minutes}`}
                  style={[
                    styles.pickerItem,
                    index === selectedIndex && styles.pickerItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      index === selectedIndex && styles.pickerItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.pickerMaskBottom} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c1c1e', // Fondo oscuro estilo iOS
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3a3a3c',
  },
  headerButton: {
    minWidth: 80,
  },
  cancelButton: {
    color: '#007AFF', // Azul iOS
    fontSize: 17,
    fontWeight: '400',
  },
  saveButton: {
    color: '#007AFF', // Azul iOS
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  pickerContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    overflow: 'hidden',
  },
  pickerScroll: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: ITEM_HEIGHT * 2, // Padding para mostrar items antes/después
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerItemText: {
    color: '#8e8e93',
    fontSize: 21,
    fontWeight: '400',
  },
  pickerItemTextSelected: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '500',
  },
  pickerMaskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    backgroundColor: '#1c1c1e',
    opacity: 0.95,
    pointerEvents: 'none',
    zIndex: 1,
  },
  pickerMaskBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    backgroundColor: '#1c1c1e',
    opacity: 0.95,
    pointerEvents: 'none',
    zIndex: 1,
  },
});

