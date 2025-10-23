import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../src/config/api';

const TOKEN_KEY = '@proudactive_token';
const USER_KEY = '@proudactive_user';

export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  timezone: string;
  locale: string;
  avatar_url?: string;
  email_verified_at?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
    token_type: string;
  };
  requires_verification?: boolean;
  errors?: any;
}

class AuthService {
  // Guardar token
  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  // Obtener token
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }

  // Guardar usuario
  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Obtener usuario
  async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  // Verificar si está autenticado
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Limpiar sesión
  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }

  // Registro
  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error en registro:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }

  // Login
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔵 Intentando login a:', `${API_BASE}/auth/login`);
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔵 Status de respuesta:', response.status);
      
      const responseText = await response.text();
      console.log('🔵 Respuesta recibida:', responseText.substring(0, 200));

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Error parseando JSON:', parseError);
        return {
          success: false,
          message: `Error del servidor (${response.status}). La API puede estar caída o devolviendo HTML.`,
        };
      }

      if (result.success && result.data) {
        await this.saveToken(result.data.token);
        await this.saveUser(result.data.user);
      }

      return result;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return {
        success: false,
        message: 'Error de conexión. Verifica tu internet.',
      };
    }
  }

  // Verificar email
  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        await this.saveToken(result.data.token);
        await this.saveUser(result.data.user);
      }

      return result;
    } catch (error) {
      console.error('Error en verificación:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }

  // Reenviar código
  async resendCode(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error reenviando código:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }

  // Olvidé mi contraseña
  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error en forgot password:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }

  // Resetear contraseña
  async resetPassword(data: {
    email: string;
    code: string;
    password: string;
    password_confirmation: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Error en reset password:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      await this.clearSession();
    }
  }

  // Obtener perfil
  async getProfile(): Promise<User | null> {
    try {
      const token = await this.getToken();
      
      if (!token) return null;

      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        await this.saveUser(result.data.user);
        return result.data.user;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  }
}

export default new AuthService();

