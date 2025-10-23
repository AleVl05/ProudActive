import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import NotificationTester from '@/components/NotificationTester';
import authService from '../../services/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const [showHourConfig, setShowHourConfig] = useState(false);
  const [startHour, setStartHour] = useState('6');
  const [endHour, setEndHour] = useState('24');

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
      <Text style={styles.title}>Perfil</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleCheckForUpdates}>
          <Text style={styles.buttonText}>🔍 Buscar actualizaciones</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={() => setShowHourConfig(true)}>
          <Text style={styles.buttonText}>⏰ Configurar horas del calendario</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={[styles.buttonText, styles.logoutButtonText]}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>
        
        <Text style={styles.infoText}>
          Versión actual: 1.0.0
        </Text>
      </View>

      {/* Probador de Notificaciones */}
      <View style={styles.section}>
        <NotificationTester />
      </View>
      
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
