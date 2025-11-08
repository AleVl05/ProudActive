import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Image, Switch, Platform, Linking } from 'react-native';
import { Colors } from '@/constants/theme';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import authService, { User } from '../../services/auth';
import tutorialService from '../../src/utils/tutorialService';
import { PermissionsAndroid } from 'react-native';
import { apiDeleteAllEvents } from '../../services/calendarApi';

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
  
  // Estadísticas del usuario (simuladas por ahora)
  const [userStats, setUserStats] = useState({
    consecutiveDays: 7,
    totalTasks: 23,
    completedTasks: 18,
    streak: 5,
    consecutiveAccesses: 7
  });

  useEffect(() => {
    loadUserData();
    checkNotificationPermissions();
  }, []);

  const loadUserData = async () => {
    const userData = await authService.getUser();
    setUser(userData);
    if (userData) {
      setEditName(userData.name || '');
      setEditEmail(userData.email || '');
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
            <Text style={styles.statNumber}>{userStats.consecutiveDays}</Text>
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
                onPress={() => {
                  // TODO: Guardar configuración y aplicar cambios
                  Alert.alert('Configuración guardada', `Horas: ${startHour}:00 - ${endHour}:00`);
                  setShowHourConfig(false);
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
});
