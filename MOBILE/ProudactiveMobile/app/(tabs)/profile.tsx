import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import * as Updates from 'expo-updates';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
// import NotificationTester from '@/components/NotificationTester'; // Deshabilitado - Notifee removido
import authService, { User } from '../../services/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showHourConfig, setShowHourConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [startHour, setStartHour] = useState('6');
  const [endHour, setEndHour] = useState('24');
  
  // Estadísticas del usuario (simuladas por ahora)
  const [userStats, setUserStats] = useState({
    consecutiveDays: 7,
    totalTasks: 23,
    completedTasks: 18,
    streak: 5,
    lastLogin: 'Hoy'
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = await authService.getUser();
    setUser(userData);
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

  const handleCheckForUpdates = async () => {
    try {
      Alert.alert('Buscando actualizaciones...', 'Verificando si hay nuevas versiones disponibles.');
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Actualización disponible',
          'Se encontró una nueva versión. ¿Deseas descargarla e instalarla ahora?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Actualizar', 
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (error) {
                  Alert.alert('Error', 'No se pudo instalar la actualización. Inténtalo de nuevo.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Sin actualizaciones', 'Tu aplicación está actualizada con la última versión.');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert('Error', 'No se pudo verificar las actualizaciones. Verifica tu conexión a internet.');
    }
  };

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
        
        <TouchableOpacity style={styles.editProfileButton}>
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
        
        <TouchableOpacity style={styles.infoRow}>
          <Text style={styles.infoLabel}>📧 Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'usuario@ejemplo.com'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.infoRow}>
          <Text style={styles.infoLabel}>🌍 Zona horaria</Text>
          <Text style={styles.infoValue}>{user?.timezone || 'UTC'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.infoRow}>
          <Text style={styles.infoLabel}>🌐 Idioma</Text>
          <Text style={styles.infoValue}>{user?.locale || 'es'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.infoRow}>
          <Text style={styles.infoLabel}>📅 Último acceso</Text>
          <Text style={styles.infoValue}>{userStats.lastLogin}</Text>
        </TouchableOpacity>
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
            <TouchableOpacity style={styles.settingItem} onPress={handleCheckForUpdates}>
              <Text style={styles.settingText}>🔍 Buscar actualizaciones</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowHourConfig(true)}>
              <Text style={styles.settingText}>⏰ Configurar horas del calendario</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>🔔 Notificaciones</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>🎨 Tema</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>🔒 Privacidad</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Probador de Notificaciones (deshabilitado - Notifee removido) */}
      {/* <View style={styles.section}>
        <NotificationTester />
      </View> */}
      
      {/* Cerrar Sesión */}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={[styles.buttonText, styles.logoutButtonText]}>🚪 Cerrar sesión</Text>
      </TouchableOpacity>
      
      <Text style={styles.infoText}>
        Versión actual: 1.0.0
      </Text>
      
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
  },
  infoValue: {
    fontSize: 16,
    color: Colors.light.text,
    opacity: 0.7,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: Colors.light.text,
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
});
