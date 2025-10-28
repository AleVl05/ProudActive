import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// import { 
//   initializeNotifications, 
//   displayTestNotification, 
//   displayTaskNotification 
// } from '../services/notifications';

export default function NotificationTester() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar notificaciones al montar el componente
  useEffect(() => {
    // TODO: Implementar con expo-notifications
    console.log('⚠️ Sistema de notificaciones deshabilitado - Notifee removido');
    setIsInitialized(false);
  }, []);

  const handleTestNotification = async () => {
    Alert.alert('⚠️ Deshabilitado', 'Sistema de notificaciones deshabilitado - Notifee removido');
  };

  const handleTaskNotification = async () => {
    Alert.alert('⚠️ Deshabilitado', 'Sistema de notificaciones deshabilitado - Notifee removido');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Probador de Notificaciones</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Estado: ⚠️ Deshabilitado (Notifee removido)
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.disabledButton]} 
          onPress={handleTestNotification}
          disabled={true}
        >
          <Text style={styles.buttonText}>
            🔔 Probar Notificación (Deshabilitado)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.disabledButton]} 
          onPress={handleTaskNotification}
          disabled={true}
        >
          <Text style={styles.buttonText}>
            📋 Notificación de Tarea (Deshabilitado)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          💡 <Text style={styles.bold}>Nota:</Text>
        </Text>
        <Text style={styles.infoText}>
          • El sistema de notificaciones fue deshabilitado al remover Notifee
        </Text>
        <Text style={styles.infoText}>
          • Para habilitar notificaciones, implementar con expo-notifications
        </Text>
        <Text style={styles.infoText}>
          • O usar react-native-firebase para notificaciones avanzadas
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
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#856404',
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
  disabledButton: {
    backgroundColor: '#ccc',
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