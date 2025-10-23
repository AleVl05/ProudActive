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
    if (isAuthenticated === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    // 🔧 FIX: Solo redirigir si no está autenticado
    // No redirigir automáticamente si ya está autenticado (las pantallas lo harán manualmente)
    if (!isAuthenticated && !inAuthGroup) {
      // No autenticado, redirigir a welcome
      router.replace('/(auth)/welcome');
    }
    // Eliminamos el else if que causaba la redirección automática al login
  }, [isAuthenticated, segments]);

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated();
    setIsAuthenticated(authenticated);
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
