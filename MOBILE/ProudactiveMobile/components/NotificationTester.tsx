import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { 
  initializeNotifications, 
  displayTestNotification, 
  displayTaskNotification 
} from '../services/notifications';

export default function NotificationTester() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar notificaciones al montar el componente
  useEffect(() => {
    initializeNotifications().then((success) => {
      setIsInitialized(success);
    });
  }, []);

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      const success = await displayTestNotification();
      if (success) {
        Alert.alert('✅ Éxito', 'Notificación de prueba enviada con sonido personalizado');
      } else {
        Alert.alert('❌ Error', 'No se pudo enviar la notificación');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error inesperado al enviar notificación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskNotification = async () => {
    setIsLoading(true);
    try {
      const success = await displayTaskNotification(
        'Tarea Importante',
        'Completar el proyecto Proudactive - ¡Vamos que se puede!'
      );
      if (success) {
        Alert.alert('✅ Éxito', 'Notificación de tarea enviada');
      } else {
        Alert.alert('❌ Error', 'No se pudo enviar la notificación de tarea');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error inesperado al enviar notificación de tarea');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Probador de Notificaciones</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Estado: {isInitialized ? '✅ Inicializado' : '⏳ Inicializando...'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={handleTestNotification}
          disabled={!isInitialized || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '⏳ Enviando...' : '🔔 Probar Notificación'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.taskButton]} 
          onPress={handleTaskNotification}
          disabled={!isInitialized || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '⏳ Enviando...' : '📋 Notificación de Tarea'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          💡 <Text style={styles.bold}>Instrucciones:</Text>
        </Text>
        <Text style={styles.infoText}>
          • Presiona "Probar Notificación" para escuchar tu sonido personalizado
        </Text>
        <Text style={styles.infoText}>
          • La notificación aparecerá en la pantalla de bloqueo
        </Text>
        <Text style={styles.infoText}>
          • Si no escuchas el sonido, verifica que el volumen esté activado
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#2d5a2d',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  taskButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
});
