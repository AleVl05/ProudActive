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
use Illuminate\Support\Facades\Log;
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

        // Marcar email como verificado
        $user->email_verified_at = now();
        $user->save();
        
        // Refrescar el modelo para asegurar que tiene los datos actualizados
        $user->refresh();
        
        // Debug: Verificar que se guardó
        Log::info('✅ Email verified - email_verified_at:', [
            'user_id' => $user->id,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'verified_at_timestamp' => $user->email_verified_at ? $user->email_verified_at->toDateTimeString() : null
        ]);
        
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

        // Log para debug
        Log::info('🔑 Login attempt:', [
            'user_id' => $user->id,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'is_verified' => !is_null($user->email_verified_at)
        ]);

        // Verificar si el email está verificado
        if (!$user->email_verified_at) {
            Log::warning('⚠️ Login blocked - Email not verified:', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
            
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

        // Si el email ya está verificado, informar al usuario
        if ($user->email_verified_at) {
            Log::info('📧 Resend code requested for verified email:', [
                'user_id' => $user->id,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'El email ya está verificado. Por favor intenta iniciar sesión.',
                'already_verified' => true
            ], 400);
        }

        // Generar nuevo código
        $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Guardar en cache por 10 minutos
        Cache::put("email_verification_{$user->email}", $verificationCode, now()->addMinutes(10));

        // Enviar email
        $this->sendVerificationEmail($user->email, $verificationCode, $user->name);

        Log::info('✅ Verification code sent:', [
            'email' => $user->email,
            'code' => $verificationCode,
            'user_id' => $user->id,
            'cache_key' => "email_verification_{$user->email}"
        ]);

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
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
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

        $user->update($request->only(['name', 'email', 'timezone', 'locale', 'avatar_url']));

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
            // Log detallado de configuración antes de enviar
            Log::info('📧 [EMAIL DEBUG] Iniciando envío de email de verificación', [
                'email' => $email,
                'code' => $code,
                'name' => $name,
                'timestamp' => now()->toDateTimeString(),
            ]);

            // Log de configuración SMTP cargada
            Log::info('📧 [EMAIL DEBUG] Configuración SMTP cargada:', [
                'default_mailer' => config('mail.default'),
                'smtp_host' => config('mail.mailers.smtp.host'),
                'smtp_port' => config('mail.mailers.smtp.port'),
                'smtp_encryption' => config('mail.mailers.smtp.encryption'),
                'smtp_username' => config('mail.mailers.smtp.username'),
                'smtp_password_set' => !empty(config('mail.mailers.smtp.password')),
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
                'queue_connection' => config('queue.default'),
            ]);

            // Forzar uso de mailer SMTP explícitamente con vista HTML
            Mail::mailer('smtp')->send('emails.verification', [
                'name' => $name,
                'code' => $code
            ], function ($message) use ($email) {
                $message->to($email)
                        ->subject('Verifica tu cuenta - Proudly');
            });
            
            Log::info('✅ [EMAIL DEBUG] Email de verificación enviado exitosamente', [
                'email' => $email,
                'timestamp' => now()->toDateTimeString(),
            ]);
        } catch (\Exception $e) {
            Log::error('❌ [EMAIL DEBUG] Error enviando email de verificación', [
                'email' => $email,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'smtp_config' => [
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'username' => config('mail.mailers.smtp.username'),
                ],
                'timestamp' => now()->toDateTimeString(),
            ]);
        }
    }

    /**
     * Enviar email de recuperación de contraseña
     */
    private function sendPasswordResetEmail(string $email, string $code, string $name): void
    {
        try {
            // Log detallado de configuración antes de enviar
            Log::info('📧 [EMAIL DEBUG] Iniciando envío de email de recuperación', [
                'email' => $email,
                'code' => $code,
                'name' => $name,
                'timestamp' => now()->toDateTimeString(),
            ]);

            // Log de configuración SMTP cargada
            Log::info('📧 [EMAIL DEBUG] Configuración SMTP cargada:', [
                'default_mailer' => config('mail.default'),
                'smtp_host' => config('mail.mailers.smtp.host'),
                'smtp_port' => config('mail.mailers.smtp.port'),
                'smtp_encryption' => config('mail.mailers.smtp.encryption'),
                'smtp_username' => config('mail.mailers.smtp.username'),
                'smtp_password_set' => !empty(config('mail.mailers.smtp.password')),
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
                'queue_connection' => config('queue.default'),
            ]);

            // Forzar uso de mailer SMTP explícitamente con vista HTML
            Mail::mailer('smtp')->send('emails.password-reset', [
                'name' => $name,
                'code' => $code
            ], function ($message) use ($email) {
                $message->to($email)
                        ->subject('Recuperar contraseña - Proudly');
            });

            Log::info('✅ [EMAIL DEBUG] Email de recuperación enviado exitosamente', [
                'email' => $email,
                'timestamp' => now()->toDateTimeString(),
            ]);
        } catch (\Exception $e) {
            Log::error('❌ [EMAIL DEBUG] Error enviando email de recuperación', [
                'email' => $email,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'smtp_config' => [
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'username' => config('mail.mailers.smtp.username'),
                ],
                'timestamp' => now()->toDateTimeString(),
            ]);
        }
    }
}
