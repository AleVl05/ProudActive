import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import authService from '../services/auth';

export const unstable_settings = {
  initialRouteName: '(auth)/welcome',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // No hacer nada si aún no se ha verificado la autenticación inicial
    if (isAuthenticated === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = segments[0] === '(tabs)';

    // Si está navegando a una ruta protegida, verificar autenticación
    // Esto es importante después de un login exitoso
    if (inProtectedGroup) {
      checkAuth().then((authenticated) => {
        if (!authenticated) {
          router.replace('/(auth)/welcome');
        }
        // Si está autenticado, dejar que navegue libremente entre tabs
      });
      return;
    }

    // Si está navegando a rutas de auth y está autenticado, redirigir al calendario
    // (solo cuando viene de login/register/verify, no cuando navega normalmente)
    if (inAuthGroup && isAuthenticated === true) {
      router.replace('/(tabs)/calendar');
      return;
    }

    // Si no está autenticado y no está en el grupo de auth, redirigir a welcome
    if (isAuthenticated === false && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    }
  }, [segments, isAuthenticated]);

  const checkAuth = async (): Promise<boolean> => {
    const authenticated = await authService.isAuthenticated();
    setIsAuthenticated(authenticated);
    return authenticated;
  };

  if (isAuthenticated === null) {
    // Mostrar splash o loading
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
