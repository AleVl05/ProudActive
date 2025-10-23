import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

// Crear canal de notificación con sonido personalizado
export async function createNotificationChannel() {
  try {
    await notifee.createChannel({
      id: 'default',
      name: 'Notificaciones Proudactive',
      description: 'Canal principal para notificaciones de tareas',
      sound: 'cling', // SIN extensión - debe coincidir con el archivo en android/app/src/main/res/raw/
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
    });
    
    console.log('✅ Canal de notificación creado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error creando canal de notificación:', error);
    return false;
  }
}

// Solicitar permisos de notificación
export async function requestNotificationPermissions() {
  try {
    const settings = await notifee.requestPermission();
    
    if (settings.authorizationStatus >= 1) {
      console.log('✅ Permisos de notificación concedidos');
      return true;
    } else {
      console.log('❌ Permisos de notificación denegados');
      return false;
    }
  } catch (error) {
    console.error('❌ Error solicitando permisos:', error);
    return false;
  }
}

// Mostrar notificación de prueba
export async function displayTestNotification() {
  try {
    await notifee.displayNotification({
      title: '🎯 Tarea Actual',
      body: 'Lavarse los dientes - ¡Es hora de ser productivo!',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
    });
    
    console.log('✅ Notificación de prueba mostrada');
    return true;
  } catch (error) {
    console.error('❌ Error mostrando notificación:', error);
    return false;
  }
}

// Mostrar notificación de tarea específica
export async function displayTaskNotification(taskTitle: string, taskDescription?: string) {
  try {
    await notifee.displayNotification({
      title: `🎯 ${taskTitle}`,
      body: taskDescription || '¡Es hora de ser productivo!',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
    });
    
    console.log(`✅ Notificación de tarea mostrada: ${taskTitle}`);
    return true;
  } catch (error) {
    console.error('❌ Error mostrando notificación de tarea:', error);
    return false;
  }
}

// Inicializar notificaciones (llamar al iniciar la app)
export async function initializeNotifications() {
  console.log('🚀 Inicializando sistema de notificaciones...');
  
  // 1. Solicitar permisos
  const hasPermissions = await requestNotificationPermissions();
  if (!hasPermissions) {
    console.log('⚠️ Sin permisos de notificación');
    return false;
  }
  
  // 2. Crear canal
  const channelCreated = await createNotificationChannel();
  if (!channelCreated) {
    console.log('⚠️ Error creando canal de notificación');
    return false;
  }
  
  console.log('✅ Sistema de notificaciones inicializado correctamente');
  return true;
}
