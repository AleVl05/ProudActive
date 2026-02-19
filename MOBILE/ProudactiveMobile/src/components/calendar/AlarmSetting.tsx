import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, Switch } from 'react-native';
import { NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { dateKeyToLocalDate } from '../../utils/dateUtils';
import { PermissionsAndroid } from 'react-native';

const { AlarmModule } = NativeModules;

// Verificar que el módulo está disponible
if (!AlarmModule && Platform.OS === 'android') {
  console.warn('[Alarm] AlarmModule no está disponible. Asegúrate de haber recompilado la app con: npx expo run:android');
}

export type AlarmOption = '5min' | '10min' | 'at_start' | 'end';

interface AlarmSettingProps {
  selectedEvent: any; // Event | MonthEvent | null
  selectedCell: any; // SelectedCell | null
  eventTitle: string;
  eventDateKey?: string; // YYYY-MM-DD format
  alarmEnabled?: boolean;
  alarmOption?: AlarmOption;
  onAlarmChange?: (enabled: boolean, option?: AlarmOption) => void;
}

export default function AlarmSetting({
  selectedEvent,
  selectedCell,
  eventTitle,
  eventDateKey,
  alarmEnabled: initialAlarmEnabled = false,
  alarmOption: initialAlarmOption = 'at_start',
  onAlarmChange,
}: AlarmSettingProps) {
  const [enabled, setEnabled] = useState(initialAlarmEnabled);
  const [option, setOption] = useState<AlarmOption>(initialAlarmOption);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Solicitar permisos cuando se habilita la alarma
  useEffect(() => {
    if (enabled && Platform.OS === 'android') {
      requestAndroidPermissions();
    }
  }, [enabled]);

  // Programar/cancelar alarma cuando cambia el estado o la opción
  useEffect(() => {
    if (enabled && eventTitle.trim()) {
      // Solo programar si no está en el pasado (ya validamos antes de activar el switch)
      if (!wouldBeInPast()) {
        scheduleForEvent().catch((error) => {
          // Si es error de permiso, no es un error técnico, no loguear
          const isPermissionError = error.code === 'ERR_NO_PERMISSION' || error.message?.includes('SCHEDULE_EXACT_ALARM') || error.message?.includes('Se requiere permiso de alarmas exactas');
          if (!isPermissionError) {
            console.error('Error al programar alarma:', error);
          }
        });
      }
    } else if (!enabled) {
      cancelAlarm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, option]);

  // Reprogramar alarma cuando el título del evento cambia (si está habilitada)
  useEffect(() => {
    if (enabled && eventTitle.trim()) {
      scheduleForEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTitle]);

  async function requestAndroidPermissions() {
    if (Platform.OS !== 'android') return true;

    setIsRequestingPermission(true);
    try {
      // POST_NOTIFICATIONS (Android 13+)
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permiso necesario',
            'Se necesita permiso de notificaciones para usar alarmas. Por favor, activa las notificaciones en la configuración de la app.',
            [{ text: 'OK' }]
          );
          setEnabled(false);
          return false;
        }
      }

      // Verificar permiso de alarmas exactas (Android 12+)
      if (!AlarmModule) {
        Alert.alert(
          'Módulo de alarmas no disponible',
          'El módulo nativo de alarmas no está disponible. Por favor, recompila la app con: npx expo run:android',
          [{ text: 'OK', onPress: () => setEnabled(false) }]
        );
        return false;
      }
      
      if (Platform.Version >= 31) {
        try {
          const canSchedule = await AlarmModule.canScheduleExactAlarms();

          if (!canSchedule) {
            Alert.alert(
              'Permiso de alarmas exactas necesario',
              'Para usar alarmas, necesitas otorgar el permiso de "Alarmas exactas" en la configuración del sistema. ¿Deseas abrir la configuración ahora?',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => setEnabled(false) },
                {
                  text: 'Abrir configuración',
                  onPress: async () => {
                    try {
                      await AlarmModule.openAlarmSettings();
                    } catch (e) {
                      console.error('Error al abrir configuración:', e);
                    }
                  },
                },
              ]
            );
            return false;
          }
        } catch (e) {
          console.error('Error al verificar permiso de alarmas exactas:', e);
        }
      }

      return true;
    } catch (e) {
      console.error('Error al solicitar permisos:', e);
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }

  // Función helper para calcular si la alarma estaría en el pasado
  function wouldBeInPast(): boolean {
    // Obtener fecha y hora del evento
    let eventDate: string;
    let startTime: number;
    let duration: number = 30; // default

    if (selectedEvent) {
      // Evento existente
      eventDate = selectedEvent.date;
      startTime = selectedEvent.startTime;
      duration = selectedEvent.duration || 30;
    } else if (selectedCell && eventDateKey) {
      // Evento nuevo - usar selectedCell y eventDateKey
      eventDate = eventDateKey;
      startTime = selectedCell.startTime || 0;
      duration = 30; // default duration for new events
    } else if (selectedCell) {
      // Fallback: calcular dateKey desde selectedCell si no está disponible
      const today = new Date();
      eventDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      startTime = selectedCell.startTime || 0;
      duration = 30;
    } else {
      // No hay información suficiente, no bloquear
      return false;
    }

    // Calcular timestamp según la opción
    const startDate = dateKeyToLocalDate(eventDate, startTime);
    const endDate = dateKeyToLocalDate(eventDate, startTime + duration);

    let timeMs = startDate.getTime();

    if (option === '5min') {
      timeMs = startDate.getTime() - 5 * 60 * 1000;
    } else if (option === '10min') {
      timeMs = startDate.getTime() - 10 * 60 * 1000;
    } else if (option === 'at_start') {
      timeMs = startDate.getTime();
    } else if (option === 'end') {
      timeMs = endDate.getTime();
    }

    // Solo verificar para eventos existentes
    return selectedEvent && timeMs < Date.now();
  }

  async function scheduleForEvent() {
    if (!AlarmModule) {
      Alert.alert(
        'Módulo de alarmas no disponible',
        'El módulo nativo de alarmas no está disponible. Esto puede ocurrir si:\n\n? La app no fue recompilada después de los cambios nativos\n? Estás usando Expo Go (no compatible con módulos nativos personalizados)\n\nPor favor, ejecuta: npx expo run:android para recompilar e instalar la app.',
        [{ text: 'OK' }]
      );
      setEnabled(false);
      return;
    }

    // Validar que el evento tenga título
    if (!eventTitle.trim()) {
      console.log('Alarma no programada: el evento no tiene título aún');
      return;
    }

    try {
      // Obtener fecha y hora del evento
      let eventDate: string;
      let startTime: number;
      let duration: number = 30; // default

      if (selectedEvent) {
        // Evento existente
        eventDate = selectedEvent.date;
        startTime = selectedEvent.startTime;
        duration = selectedEvent.duration || 30;
      } else if (selectedCell && eventDateKey) {
        // Evento nuevo - usar selectedCell y eventDateKey
        eventDate = eventDateKey;
        startTime = selectedCell.startTime || 0;
        duration = 30; // default duration for new events
      } else if (selectedCell) {
        // Fallback: calcular dateKey desde selectedCell si no está disponible
        const today = new Date();
        eventDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        startTime = selectedCell.startTime || 0;
        duration = 30;
      } else {
        Alert.alert('Error', 'No hay información del evento disponible');
        return;
      }

      // Calcular timestamp según la opción
      const startDate = dateKeyToLocalDate(eventDate, startTime);
      const endDate = dateKeyToLocalDate(eventDate, startTime + duration);

      let timeMs = startDate.getTime();

      if (option === '5min') {
        timeMs = startDate.getTime() - 5 * 60 * 1000;
      } else if (option === '10min') {
        timeMs = startDate.getTime() - 10 * 60 * 1000;
      } else if (option === 'at_start') {
        timeMs = startDate.getTime();
      } else if (option === 'end') {
        timeMs = endDate.getTime();
      }

      // Llamar al módulo nativo
      await AlarmModule.scheduleAlarm(
        timeMs,
        `Proudly: ${eventTitle || 'Recordatorio'}`,
        'Tu recordatorio está a punto de comenzar'
      );

      onAlarmChange?.(true, option);
    } catch (e: any) {
      // Si es error de permiso, no es un error técnico, solo un aviso al usuario
      const isPermissionError = e.code === 'ERR_NO_PERMISSION' || e.message?.includes('SCHEDULE_EXACT_ALARM') || e.message?.includes('Se requiere permiso de alarmas exactas');
      
      // Solo loguear como error si NO es un error de permiso
      if (!isPermissionError) {
        console.error('Error al programar alarma:', e);
      }
      
      // Si es error de permiso, mostrar alerta con opción de abrir configuración
      if (isPermissionError) {
        Alert.alert(
          'Permiso de alarmas exactas necesario',
          'Para usar alarmas, necesitas otorgar el permiso de "Alarmas exactas" en la configuración del sistema. ¿Deseas abrir la configuración ahora?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setEnabled(false) },
            {
              text: 'Abrir configuración',
              onPress: async () => {
                try {
                  if (AlarmModule) {
                    await AlarmModule.openAlarmSettings();
                  }
                } catch (err) {
                  console.error('Error al abrir configuración:', err);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo programar la alarma. Verifica que tengas los permisos necesarios.');
      }
      // Solo desactivar si es error de permiso, no para otros errores
      if (e.code === 'ERR_NO_PERMISSION' || e.message?.includes('SCHEDULE_EXACT_ALARM')) {
        setEnabled(false);
      }
    }
  }

  async function cancelAlarm() {
    if (!AlarmModule) return;

    try {
      await AlarmModule.cancelAlarm();
      onAlarmChange?.(false);
    } catch (e) {
      console.error('Error al cancelar alarma:', e);
    }
  }

  const optionLabels: Record<AlarmOption, string> = {
    '5min': '5 min antes',
    '10min': '10 min antes',
    'at_start': 'Al comenzar',
    'end': 'Al finalizar',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="alarm-outline" size={20} color={Colors.light.tint} />
        <Text style={styles.label}>Alarma</Text>
        <Switch
          value={enabled}
          onValueChange={(value) => {
            // Si está intentando activar, verificar primero si sería válido
            if (value && selectedEvent) {
              // Verificar si la alarma estaría en el pasado
              if (wouldBeInPast()) {
                Alert.alert(
                  'Alarma no válida',
                  'La hora seleccionada ya pasí. Por favor, selecciona una hora futura o cambia la fecha del evento.',
                  [{ text: 'OK' }]
                );
                // No activar el switch
                return;
              }
            }
            // Si está desactivando o si es válido, proceder normalmente
            setEnabled(value);
          }}
          trackColor={{ false: '#DDD', true: Colors.light.tint }}
          thumbColor={enabled ? '#fff' : '#f4f3f4'}
          disabled={isRequestingPermission}
        />
      </View>

      {enabled && (
        <View style={styles.optionsContainer}>
          <View style={styles.optionsRow}>
            {(Object.keys(optionLabels) as AlarmOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionButton,
                  option === opt && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  // Si la alarma está activada y cambiar a esta opción la pondría en el pasado
                  if (enabled && selectedEvent) {
                    const tempOption = option;
                    // Temporalmente cambiar la opción para verificar
                    const wouldBePast = (() => {
                      const currentOption = option;
                      // Simular cambio temporal
                      const testOption = opt;
                      // Calcular con la nueva opción
                      const eventDate = selectedEvent.date;
                      const startTime = selectedEvent.startTime;
                      const duration = selectedEvent.duration || 30;
                      const startDate = dateKeyToLocalDate(eventDate, startTime);
                      const endDate = dateKeyToLocalDate(eventDate, startTime + duration);
                      
                      let timeMs = startDate.getTime();
                      if (testOption === '5min') {
                        timeMs = startDate.getTime() - 5 * 60 * 1000;
                      } else if (testOption === '10min') {
                        timeMs = startDate.getTime() - 10 * 60 * 1000;
                      } else if (testOption === 'at_start') {
                        timeMs = startDate.getTime();
                      } else if (testOption === 'end') {
                        timeMs = endDate.getTime();
                      }
                      return timeMs < Date.now();
                    })();
                    
                    if (wouldBePast) {
                      Alert.alert(
                        'Alarma no válida',
                        'La hora seleccionada ya pasí. Por favor, selecciona una hora futura o cambia la fecha del evento.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                  }
                  setOption(opt);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    option === opt && styles.optionTextSelected,
                  ]}
                >
                  {optionLabels[opt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            La alarma aparecer? en pantalla completa si el permiso está concedido
          </Text>
          
          {/* Botón de prueba temporal - solo en desarrollo */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={async () => {
                try {
                  if (!AlarmModule) {
                    Alert.alert(
                      'Módulo de alarmas no disponible',
                      'El módulo nativo de alarmas no está disponible. Por favor, recompila la app con: npx expo run:android',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  const testTime = Date.now() + 5000; // 5 segundos desde ahora
                  await AlarmModule.scheduleAlarm(
                    testTime,
                    `Proudly: ${eventTitle || 'Prueba'}`,
                    'Esta es una alarma de prueba'
                  );
                  Alert.alert('Éxito', 'Alarma de prueba programada para 5 segundos');
                } catch (e: any) {
                  Alert.alert('Error', `No se pudo programar: ${e.message}`);
                }
              }}
            >
              <Text style={styles.testButtonText}>Probar ahora (5s)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: Colors.light.text,
    marginLeft: 12,
    flex: 1,
    fontWeight: '600' as const,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: Colors.light.tint,
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic' as const,
  },
  testButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
};











