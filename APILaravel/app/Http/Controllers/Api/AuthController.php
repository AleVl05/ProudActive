<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Registro de usuario con código de verificación
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'timezone' => 'nullable|string|max:64',
            'locale' => 'nullable|string|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Crear usuario
        $user = User::create([
            'uuid' => Str::uuid(),
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'timezone' => $request->timezone ?? 'America/Sao_Paulo',
            'locale' => $request->locale ?? 'pt-BR',
            'is_active' => true,
        ]);

        // Crear calendario por defecto
        $user->calendars()->create([
            'name' => 'Personal',
            'description' => 'Mi calendario personal',
            'color' => '#1976d2',
            'is_default' => true,
            'is_visible' => true,
        ]);

        // Crear preferencias por defecto
        $user->preferences()->create([
            'time_interval_minutes' => 30,
            'start_hour' => 6,
            'end_hour' => 22,
            'default_view' => 'week',
            'week_starts_on' => 'monday',
        ]);

        // Generar código de verificación
        $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Guardar en cache por 10 minutos
        Cache::put("email_verification_{$user->email}", $verificationCode, now()->addMinutes(10));

        // Enviar email
        $this->sendVerificationEmail($user->email, $verificationCode, $user->name);

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado. Revisa tu email para verificar tu cuenta.',
            'data' => [
                'user' => $user->only(['id', 'uuid', 'name', 'email', 'timezone', 'locale']),
                'requires_verification' => true
            ]
        ], 201);
    }

    /**
     * Verificar email con código
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $cachedCode = Cache::get("email_verification_{$request->email}");

        if (!$cachedCode || $cachedCode !== $request->code) {
            return response()->json([
                'success' => false,
                'message' => 'Código inválido o expirado'
            ], 400);
        }

        // Verificar email
        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado'
            ], 404);
        }

        $user->update(['email_verified_at' => now()]);
        
        // Eliminar código del cache
        Cache::forget("email_verification_{$request->email}");

        // Crear token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Email verificado exitosamente',
            'data' => [
                'user' => $user,
                'token' => $token,
                'token_type' => 'Bearer'
            ]
        ]);
    }

    /**
     * Login de usuario
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales inválidas'
            ], 401);
        }

        // Verificar si el email está verificado
        if (!$user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Email no verificado',
                'requires_verification' => true
            ], 403);
        }

        // Actualizar último login
        $user->update(['last_login_at' => now()]);

        // Crear token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Cargar relaciones
        $user->load(['calendars', 'preferences']);

        return response()->json([
            'success' => true,
            'message' => 'Login exitoso',
            'data' => [
                'user' => $user,
                'token' => $token,
                'token_type' => 'Bearer'
            ]
        ]);
    }

    /**
     * Reenviar código de verificación
     */
    public function resendVerificationCode(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if ($user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'El email ya está verificado'
            ], 400);
        }

        // Generar nuevo código
        $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Guardar en cache por 10 minutos
        Cache::put("email_verification_{$user->email}", $verificationCode, now()->addMinutes(10));

        // Enviar email
        $this->sendVerificationEmail($user->email, $verificationCode, $user->name);

        return response()->json([
            'success' => true,
            'message' => 'Código de verificación enviado'
        ]);
    }

    /**
     * Solicitar recuperación de contraseña
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        // Generar código de recuperación
        $resetCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Guardar en cache por 15 minutos
        Cache::put("password_reset_{$user->email}", $resetCode, now()->addMinutes(15));

        // Enviar email
        $this->sendPasswordResetEmail($user->email, $resetCode, $user->name);

        return response()->json([
            'success' => true,
            'message' => 'Código de recuperación enviado a tu email'
        ]);
    }

    /**
     * Resetear contraseña con código
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $cachedCode = Cache::get("password_reset_{$request->email}");

        if (!$cachedCode || $cachedCode !== $request->code) {
            return response()->json([
                'success' => false,
                'message' => 'Código inválido o expirado'
            ], 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->update(['password' => Hash::make($request->password)]);

        // Eliminar código del cache
        Cache::forget("password_reset_{$request->email}");

        // Revocar todos los tokens existentes
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente'
        ]);
    }

    /**
     * Logout de usuario
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout exitoso'
        ]);
    }

    /**
     * Obtener perfil del usuario autenticado
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['calendars', 'preferences']);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Actualizar perfil del usuario
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:150',
            'timezone' => 'sometimes|string|max:64',
            'locale' => 'sometimes|string|max:10',
            'avatar_url' => 'sometimes|nullable|string|max:512',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($request->only(['name', 'timezone', 'locale', 'avatar_url']));

        return response()->json([
            'success' => true,
            'message' => 'Perfil actualizado exitosamente',
            'data' => [
                'user' => $user
            ]
        ]);
    }

    /**
     * Cambiar contraseña
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña actual incorrecta'
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente'
        ]);
    }

    /**
     * Enviar email de verificación
     */
    private function sendVerificationEmail(string $email, string $code, string $name): void
    {
        try {
            Mail::raw("Hola {$name},\n\nTu código de verificación es: {$code}\n\nEste código expira en 10 minutos.\n\nSi no solicitaste este código, ignora este mensaje.\n\n- Equipo Proudactive", function ($message) use ($email) {
                $message->to($email)
                        ->subject('Verifica tu cuenta - Proudactive');
            });
        } catch (\Exception $e) {
            \Log::error('Error enviando email de verificación: ' . $e->getMessage());
        }
    }

    /**
     * Enviar email de recuperación de contraseña
     */
    private function sendPasswordResetEmail(string $email, string $code, string $name): void
    {
        try {
            Mail::raw("Hola {$name},\n\nTu código de recuperación de contraseña es: {$code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste este código, ignora este mensaje.\n\n- Equipo Proudactive", function ($message) use ($email) {
                $message->to($email)
                        ->subject('Recuperar contraseña - Proudactive');
            });
        } catch (\Exception $e) {
            \Log::error('Error enviando email de recuperación: ' . $e->getMessage());
        }
    }
}
