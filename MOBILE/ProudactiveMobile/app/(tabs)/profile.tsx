import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Image, Switch, Platform, Linking, Animated } from 'react-native';
import { Colors } from '@/constants/theme';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import authService, { User } from '../../services/auth';
import tutorialService from '../../src/utils/tutorialService';
import { PermissionsAndroid } from 'react-native';
import { apiDeleteAllEvents, apiRestoreAllEvents, apiGetPreferences, apiUpdatePreferences, apiFetchEvents, apiGetStats } from '../../services/calendarApi';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showHourConfig, setShowHourConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [startHour, setStartHour] = useState('6');
  const [endHour, setEndHour] = useState('24');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAllEventsModal, setShowDeleteAllEventsModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingEvents, setIsDeletingEvents] = useState(false);
  const [isRestoringEvents, setIsRestoringEvents] = useState(false);
  
  // Estadísticas del usuario
  const [userStats, setUserStats] = useState({
    consecutiveDays: 0,
    totalTasks: 23,
    completedTasks: 18,
    streak: 5,
    consecutiveAccesses: 0
  });
  
  // Animación para días consecutivos
  const consecutiveDaysAnim = useState(new Animated.Value(0))[0];
  const [previousConsecutiveDays, setPreviousConsecutiveDays] = useState(0);
  const [showConsecutiveDaysAnimation, setShowConsecutiveDaysAnimation] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  const loadUserData = async () => {
    const userData = await authService.getUser();
    setUser(userData);
    if (userData) {
      setEditName(userData.name || '');
      setEditEmail(userData.email || '');
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await apiGetPreferences();
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStartHour(result.data.start_hour?.toString() || '6');
          setEndHour(result.data.end_hour?.toString() || '24');
          // Cargar días consecutivos desde las preferencias
          const consecutiveDays = result.data.consecutive_days || 0;
          setUserStats(prev => ({
            ...prev,
            consecutiveDays: consecutiveDays,
            consecutiveAccesses: consecutiveDays
          }));
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiGetStats();
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newConsecutiveDays = result.data.consecutive_days || 0;
          const oldConsecutiveDays = userStats.consecutiveDays;
          
          // Si aumentó, mostrar animación
          if (newConsecutiveDays > oldConsecutiveDays && oldConsecutiveDays > 0) {
            setPreviousConsecutiveDays(oldConsecutiveDays);
            setShowConsecutiveDaysAnimation(true);
            setAnimatedValue(oldConsecutiveDays);
            // Animación de número que sube
            consecutiveDaysAnim.setValue(oldConsecutiveDays);
            
            // Listener para actualizar el valor mostrado
            const listener = consecutiveDaysAnim.addListener(({ value }) => {
              setAnimatedValue(Math.round(value));
            });
            
            Animated.sequence([
              Animated.timing(consecutiveDaysAnim, {
                toValue: newConsecutiveDays,
                duration: 800,
                useNativeDriver: false,
              }),
              Animated.delay(1500),
            ]).start(() => {
              consecutiveDaysAnim.removeListener(listener);
              setShowConsecutiveDaysAnimation(false);
            });
          }
          
          setUserStats(prev => ({
            ...prev,
            consecutiveDays: newConsecutiveDays,
            consecutiveAccesses: newConsecutiveDays
          }));
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadUserData();
    checkNotificationPermissions();
    loadPreferences();
    loadStats();
  }, []);
  
  // Recargar stats cuando se enfoca la pantalla del perfil
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const checkEventsOutsideRange = async (newStartHour: number, newEndHour: number): Promise<number> => {
    try {
      // Obtener eventos del último mes y próximo mes para verificar
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const response = await apiFetchEvents(startDate.toISOString(), endDate.toISOString());
      if (!response.ok) {
        return 0;
      }

      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        return 0;
      }

      let count = 0;
      for (const event of result.data) {
        if (!event.start_utc) continue;
        
        const eventDate = new Date(event.start_utc);
        const eventHour = eventDate.getUTCHours();
        const eventEndDate = event.end_utc ? new Date(event.end_utc) : new Date(eventDate.getTime() + 30 * 60 * 1000);
        const eventEndHour = eventEndDate.getUTCHours();
        
        // Verificar si el evento está fuera del rango configurado
        // Si end_hour es 24, tratarlo como medianoche (0 del día siguiente)
        const effectiveEndHour = newEndHour === 24 ? 24 : newEndHour;
        
        // Evento está fuera del rango si:
        // - Empieza antes de start_hour
        // - Termina después de end_hour (o empieza después si end_hour es 24)
        if (eventHour < newStartHour || (effectiveEndHour < 24 && eventEndHour >= effectiveEndHour) || (effectiveEndHour === 24 && eventHour >= 24)) {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error('Error checking events outside range:', error);
      return 0;
    }
  };

  const saveHourPreferences = async (startHourNum: number, endHourNum: number) => {
    setIsLoading(true);
    try {
      console.log('💾 Guardando preferencias:', { start_hour: startHourNum, end_hour: endHourNum });
      const response = await apiUpdatePreferences({
        start_hour: startHourNum,
        end_hour: endHourNum
      });

      if (response.ok) {
        const result = await response.json();
        console.log('💾 Respuesta del servidor:', result);
        if (result.success) {
          console.log('✅ Preferencias guardadas correctamente:', result.data);
          Alert.alert('Configuración guardada', `Horas del calendario: ${startHourNum}:00 - ${endHourNum === 24 ? '00:00' : endHourNum + ':00'}`);
          setShowHourConfig(false);
          // Recargar preferencias para asegurar sincronización
          await loadPreferences();
        } else {
          console.error('❌ Error guardando preferencias:', result.message);
          Alert.alert('Error', result.message || 'No se pudo guardar la configuración');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Error en respuesta:', response.status, errorData);
        Alert.alert('Error', errorData.message || 'No se pudo guardar la configuración');
      }
    } catch (error) {
      console.error('❌ Excepción guardando preferencias:', error);
      Alert.alert('Error', 'Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const checkNotificationPermissions = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        setNotificationsEnabled(granted);
      } else {
        setNotificationsEnabled(true);
      }
    } else {
      setNotificationsEnabled(true);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleEditProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.updateProfile({
        name: editName.trim(),
      });

      if (result.success) {
        await loadUserData();
        setShowEditProfile(false);
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
      } else {
        Alert.alert('Error', result.message || 'No se pudo actualizar el perfil');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!editEmail.trim() || !editEmail.includes('@')) {
      Alert.alert('Error', 'Ingresa un email válido');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.updateProfile({
        email: editEmail.trim(),
      });

      if (result.success) {
        await loadUserData();
        setShowEditEmail(false);
        Alert.alert('Éxito', 'Email actualizado correctamente');
      } else {
        Alert.alert('Error', result.message || 'No se pudo actualizar el email');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        if (value) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permiso necesario',
              'Se necesita permiso de notificaciones para usar alarmas. ¿Deseas abrir la configuración?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Abrir configuración',
                  onPress: () => {
                    Linking.openSettings();
                  },
                },
              ]
            );
            return;
          }
        }
      }
    }
    
    setNotificationsEnabled(value);
  };

  const handleDeleteAllEventsPress = () => {
    // Primera confirmación: ¿Estás seguro?
    Alert.alert(
      '⚠️ ELIMINAR TODOS LOS EVENTOS',
      'Esta acción eliminará PERMANENTEMENTE todos los eventos de tu cuenta. Esta acción NO se puede deshacer.\n\n¿Estás completamente seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, estoy seguro',
          style: 'destructive',
          onPress: () => {
            // Segunda confirmación: Modal para ingresar contraseña
            setShowDeleteAllEventsModal(true);
          },
        },
      ]
    );
  };

  const handleDeleteAllEventsConfirm = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    setIsDeletingEvents(true);
    try {
      const response = await apiDeleteAllEvents(deletePassword);
      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ Eventos eliminados',
          result.message || 'Todos los eventos han sido eliminados exitosamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowDeleteAllEventsModal(false);
                setDeletePassword('');
                // Recargar la pantalla o navegar si es necesario
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'No se pudieron eliminar los eventos. Verifica tu contraseña.');
      }
    } catch (error) {
      console.error('Error eliminando eventos:', error);
      Alert.alert('Error', 'Ocurrió un error al eliminar los eventos. Por favor intenta de nuevo.');
    } finally {
      setIsDeletingEvents(false);
    }
  };

  const handleRestoreAllEvents = async () => {
    Alert.alert(
      '🔄 Restaurar Eventos',
      '¿Deseas restaurar los eventos que fueron eliminados en los últimos 7 días?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, restaurar',
          onPress: async () => {
            setIsRestoringEvents(true);
            try {
              const response = await apiRestoreAllEvents();
              const result = await response.json();

              if (result.success) {
                Alert.alert(
                  '✅ Eventos restaurados',
                  result.message || 'Los eventos eliminados en los últimos 7 días han sido restaurados exitosamente.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', result.message || 'No se pudieron restaurar los eventos.');
              }
            } catch (error) {
              console.error('Error restaurando eventos:', error);
              Alert.alert('Error', 'Ocurrió un error al restaurar los eventos. Por favor intenta de nuevo.');
            } finally {
              setIsRestoringEvents(false);
            }
          },
        },
      ]
    );
  };

  // Si no hay usuario autenticado, mostrar pantalla de login
  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.loginContainer}>
        <View style={styles.loginContent}>
          <Text style={styles.loginEmoji}>👤</Text>
          <Text style={styles.loginTitle}>Inicia sesión</Text>
          <Text style={styles.loginSubtitle}>Para acceder a tu perfil, necesitas iniciar sesión</Text>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>🚀 Iniciar Sesión</Text>
          </TouchableOpacity>
          
          <View style={styles.loginFooter}>
            <Text style={styles.loginFooterText}>¿Ya tienes una cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginFooterLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header del Perfil */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'usuario@ejemplo.com'}</Text>
        
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => setShowEditProfile(true)}
        >
          <Text style={styles.editProfileText}>✏️ Editar perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Estadísticas del Usuario */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            {showConsecutiveDaysAnimation ? (
              <View style={styles.animatedNumberContainer}>
                <Animated.Text 
                  style={[
                    styles.statNumber,
                    styles.animatedNumber,
                    {
                      transform: [{
                        scale: consecutiveDaysAnim.interpolate({
                          inputRange: [previousConsecutiveDays, userStats.consecutiveDays],
                          outputRange: [1, 1.3],
                        })
                      }],
                    }
                  ]}
                >
                  {animatedValue}
                </Animated.Text>
                <View style={styles.celebrationBadge}>
                  <Text style={styles.celebrationText}>🎉</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.statNumber}>{userStats.consecutiveDays}</Text>
            )}
            <Text style={styles.statLabel}>Días consecutivos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.completedTasks}</Text>
            <Text style={styles.statLabel}>Tareas completadas</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.streak}</Text>
            <Text style={styles.statLabel}>Racha actual</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.totalTasks}</Text>
            <Text style={styles.statLabel}>Total tareas</Text>
          </View>
        </View>
      </View>

      {/* Información Personal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Información Personal</Text>
        
        <TouchableOpacity 
          style={styles.infoRow}
          onPress={() => setShowEditEmail(true)}
        >
          <Text style={styles.infoLabel}>📧 Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'usuario@ejemplo.com'}</Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🌐 Idioma</Text>
          <Text style={styles.infoValue}>{user?.locale || 'es'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📅 Accesos consecutivos</Text>
          <Text style={styles.infoValue}>{userStats.consecutiveAccesses} días</Text>
        </View>
      </View>

      {/* Configuraciones */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => setShowSettings(!showSettings)}
        >
          <Text style={styles.settingsButtonText}>
            ⚙️ Configuraciones {showSettings ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showSettings && (
          <View style={styles.settingsContent}>
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowHourConfig(true)}>
              <Text style={styles.settingText}>⏰ Configurar horas del calendario</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={async () => {
                Alert.alert(
                  'Reiniciar Tutorial',
                  '¿Deseas ver el tutorial de nuevo? Esto te ayudará a recordar las funciones principales de la aplicación.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Reiniciar',
                      onPress: async () => {
                        await tutorialService.resetTutorial();
                        Alert.alert('Tutorial reiniciado', 'El tutorial se mostrará la próxima vez que entres al calendario.');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.settingText}>🎓 Ver tutorial de nuevo</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingText}>🔔 Notificaciones</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#767577', true: Colors.light.tint }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.settingItem, styles.dangerSettingItem]}
              onPress={handleDeleteAllEventsPress}
            >
              <Text style={[styles.settingText, styles.dangerText]}>
                🗑️ Eliminar todos los eventos
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ff3b30" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, styles.restoreSettingItem]}
              onPress={handleRestoreAllEvents}
              disabled={isRestoringEvents}
            >
              <Text style={[styles.settingText, styles.restoreText]}>
                {isRestoringEvents ? '🔄 Restaurando eventos...' : '🔄 Restaurar eventos (últimos 7 días)'}
              </Text>
              {!isRestoringEvents && <Ionicons name="chevron-forward" size={16} color={Colors.light.tint} />}
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Cerrar Sesión */}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={[styles.buttonText, styles.logoutButtonText]}>🚪 Cerrar sesión</Text>
      </TouchableOpacity>
      
      <Text style={styles.infoText}>
        Versión actual: 1.0.0
      </Text>
      
      {/* Modal de editar perfil */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre:</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre completo"
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditProfile(false);
                  setEditName(user?.name || '');
                }}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleEditProfile}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de cambiar email */}
      <Modal
        visible={showEditEmail}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Email</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nuevo email:</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="email@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditEmail(false);
                  setEditEmail(user?.email || '');
                }}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangeEmail}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de configuración de horas */}
      <Modal
        visible={showHourConfig}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Horas del Calendario</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hora de inicio:</Text>
              <TextInput
                style={styles.input}
                value={startHour}
                onChangeText={setStartHour}
                keyboardType="numeric"
                placeholder="6"
                maxLength={2}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hora de fin:</Text>
              <TextInput
                style={styles.input}
                value={endHour}
                onChangeText={setEndHour}
                keyboardType="numeric"
                placeholder="24"
                maxLength={2}
              />
            </View>
            
            <Text style={styles.helpText}>
              Las horas van de 0 a 24. Ejemplo: 6 para 6:00 AM, 24 para 12:00 AM
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowHourConfig(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  const newStartHour = parseInt(startHour, 10);
                  const newEndHour = parseInt(endHour, 10);

                  // Validaciones básicas
                  if (isNaN(newStartHour) || newStartHour < 0 || newStartHour > 23) {
                    Alert.alert('Error', 'La hora de inicio debe ser un número entre 0 y 23');
                    return;
                  }

                  if (isNaN(newEndHour) || newEndHour < 1 || newEndHour > 24) {
                    Alert.alert('Error', 'La hora de fin debe ser un número entre 1 y 24');
                    return;
                  }

                  if (newEndHour !== 24 && newEndHour <= newStartHour) {
                    Alert.alert('Error', 'La hora de fin debe ser mayor que la hora de inicio');
                    return;
                  }

                  // Verificar eventos fuera del rango
                  const eventsOutsideRange = await checkEventsOutsideRange(newStartHour, newEndHour);
                  
                  if (eventsOutsideRange > 0) {
                    Alert.alert(
                      'Eventos fuera del rango',
                      `Hay ${eventsOutsideRange} evento(s) en las horas que estás eliminando del calendario. Estos eventos NO serán eliminados, pero NO serán visibles hasta que vuelvas a expandir el rango de horas del calendario.`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Continuar',
                          onPress: async () => {
                            await saveHourPreferences(newStartHour, newEndHour);
                          }
                        }
                      ]
                    );
                  } else {
                    await saveHourPreferences(newStartHour, newEndHour);
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para eliminar todos los eventos */}
      <Modal
        visible={showDeleteAllEventsModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, styles.dangerTitle]}>
              ⚠️ ELIMINAR TODOS LOS EVENTOS
            </Text>
            
            <Text style={styles.warningText}>
              Esta acción eliminará PERMANENTEMENTE todos los eventos de tu cuenta.
              {'\n\n'}
              Esta acción NO se puede deshacer.
              {'\n\n'}
              Para confirmar, ingresa tu contraseña:
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña:</Text>
              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Ingresa tu contraseña"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isDeletingEvents}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteAllEventsModal(false);
                  setDeletePassword('');
                }}
                disabled={isDeletingEvents}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.dangerButton]}
                onPress={handleDeleteAllEventsConfirm}
                disabled={isDeletingEvents || !deletePassword.trim()}
              >
                <Text style={styles.dangerButtonText}>
                  {isDeletingEvents ? 'Eliminando...' : 'Eliminar todo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  // Header del perfil
  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
    marginBottom: 16,
  },
  editProfileButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estadísticas
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.text,
    textAlign: 'center',
  },
  // Secciones generales
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 15,
  },
  // Información personal
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
    marginRight: 8,
  },
  // Configuraciones
  settingsButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    textAlign: 'center',
  },
  settingsContent: {
    marginTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  // Botones
  button: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.text,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  
  // Estilos para el modal de configuración de horas
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#ffffff',
  },
  dangerSettingItem: {
    borderTopWidth: 1,
    borderTopColor: '#ffebee',
    marginTop: 8,
    paddingTop: 16,
  },
  dangerText: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  dangerTitle: {
    color: '#ff3b30',
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
  },
  dangerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginContent: {
    width: '100%',
    alignItems: 'center',
  },
  loginEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  loginButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginFooterText: {
    color: Colors.light.text,
    fontSize: 14,
    opacity: 0.7,
  },
  loginFooterLink: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
  },
  restoreSettingItem: {
    borderTopWidth: 1,
    borderTopColor: '#e8f5e9',
    marginTop: 8,
    paddingTop: 16,
  },
  restoreText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  animatedNumberContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  celebrationBadge: {
    position: 'absolute',
    top: -10,
    right: -20,
    backgroundColor: '#ffd700',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 16,
  },
});
