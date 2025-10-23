import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#1a1a1a',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Iniciar Sesión',
          headerBackTitle: 'Atrás',
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Crear Cuenta',
          headerBackTitle: 'Atrás',
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          title: 'Verificar Email',
          headerBackTitle: 'Atrás',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Recuperar Contraseña',
          headerBackTitle: 'Atrás',
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: 'Nueva Contraseña',
          headerBackTitle: 'Atrás',
        }}
      />
    </Stack>
  );
}

