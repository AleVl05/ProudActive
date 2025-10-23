import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo o Imagen */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>📅</Text>
          <Text style={styles.appName}>Proudactive</Text>
          <Text style={styles.tagline}>Tu productividad en un solo lugar</Text>
        </View>

        {/* Botones */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Al continuar, aceptas nuestros términos y condiciones
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: height * 0.15,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 20,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    color: '#ffffff',
    opacity: 0.7,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

