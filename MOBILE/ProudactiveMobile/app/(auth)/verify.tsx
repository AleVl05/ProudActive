import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import authService from '../../services/auth';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.verifyEmail(email, code);

      if (result.success) {
        Alert.alert(
          '¡Email verificado!',
          'Tu cuenta ha sido verificada exitosamente',
          [
            {
              text: 'Continuar',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Código inválido');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResending(true);
    try {
      const result = await authService.resendCode(email);

      if (result.success) {
        Alert.alert('Código enviado', 'Revisa tu email');
        setCountdown(60);
      } else if (result.already_verified) {
        // Email ya verificado, redirigir a login
        Alert.alert(
          'Email verificado',
          'Tu email ya está verificado. Por favor inicia sesión.',
          [
            {
              text: 'Ir a Login',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'No se pudo enviar el código');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Verifica tu email</Text>
          <Text style={styles.subtitle}>
            Hemos enviado un código de 6 dígitos a{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Código de verificación</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Verificar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>¿No recibiste el código? </Text>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resending || countdown > 0}
            >
              <Text
                style={[
                  styles.resendLink,
                  (resending || countdown > 0) && styles.resendDisabled,
                ]}
              >
                {countdown > 0
                  ? `Reenviar (${countdown}s)`
                  : resending
                  ? 'Enviando...'
                  : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    fontWeight: '600',
    color: '#667eea',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#666666',
    fontSize: 14,
  },
  resendLink: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    color: '#cccccc',
  },
});

