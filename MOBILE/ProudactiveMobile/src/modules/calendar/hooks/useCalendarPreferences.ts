import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import authService from '@/services/auth';
import { apiGetPreferences, apiRegisterDailyAccess } from '@/services/calendarApi';
import { START_HOUR, END_HOUR } from '@/utils/dateConstants';

export function useCalendarPreferences() {
  const [userStartHour, setUserStartHour] = useState<number>(START_HOUR);
  const [userEndHour, setUserEndHour] = useState<number>(END_HOUR);

  // Función para cargar preferencias del usuario
  const loadUserPreferences = useCallback(async () => {
    try {
      const token = await authService.getToken();
      if (!token) {
        // Sin sesión: usar valores por defecto y no llamar API
        setUserStartHour(START_HOUR);
        setUserEndHour(END_HOUR);
        return;
      }

      console.log('[Calendar] Cargando preferencias del usuario...');
      const response = await apiGetPreferences();

      if (response.status === 401) {
        // Sesión expirada o logout: no mostrar error
        setUserStartHour(START_HOUR);
        setUserEndHour(END_HOUR);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('[Calendar] Preferencias recibidas:', result.data);

        if (result.success && result.data) {
          const newStartHour = result.data.start_hour ?? START_HOUR;
          const newEndHour = result.data.end_hour ?? END_HOUR;
          console.log(`? Actualizando horas: ${newStartHour}:00 - ${newEndHour === 24 ? '00:00' : newEndHour + ':00'}`);
          setUserStartHour(newStartHour);
          setUserEndHour(newEndHour);
        } else {
          console.warn('[Calendar] Preferencias sin datos, usando valores por defecto');
          setUserStartHour(START_HOUR);
          setUserEndHour(END_HOUR);
        }
      } else {
        console.error('? Error en respuesta de preferencias:', response.status);
        setUserStartHour(START_HOUR);
        setUserEndHour(END_HOUR);
      }
    } catch (error) {
      console.error('? Error loading user preferences:', error);
      // Usar valores por defecto si falla
      setUserStartHour(START_HOUR);
      setUserEndHour(END_HOUR);
    }
  }, []);

  // Cargar preferencias del usuario al iniciar
  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

  // Estado para animación de días consecutivos
  const [showConsecutiveDaysModal, setShowConsecutiveDaysModal] = useState(false);
  const [consecutiveDaysCount, setConsecutiveDaysCount] = useState(0);
  const consecutiveDaysScale = useRef(new Animated.Value(1)).current;

  // Recargar preferencias cuando el usuario vuelve a esta pantalla (desde perfil)
  useFocusEffect(
    useCallback(() => {
      loadUserPreferences();
      // Registrar acceso diario cuando se enfoca el calendario
      apiRegisterDailyAccess()
        .then(async (response) => {
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.was_increased) {
              // Mostrar animación de celebración
              setConsecutiveDaysCount(result.data.consecutive_days);
              setShowConsecutiveDaysModal(true);

              // Animación de escala
              Animated.sequence([
                Animated.timing(consecutiveDaysScale, {
                  toValue: 1.2,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(consecutiveDaysScale, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]).start();

              // Cerrar automáticamente después de 3 segundos
              setTimeout(() => {
                setShowConsecutiveDaysModal(false);
              }, 3000);
            }
          }
        })
        .catch((error) => {
          console.error('Error registrando acceso diario:', error);
        });
    }, [loadUserPreferences])
  );

  return {
    userStartHour,
    userEndHour,
    showConsecutiveDaysModal,
    setShowConsecutiveDaysModal,
    consecutiveDaysCount,
    consecutiveDaysScale,
  };
}
