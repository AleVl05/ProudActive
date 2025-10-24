-- ========================================================
-- Script para arreglar Usuario 1 (alevalcarcel21@gmail.com)
-- Ejecutar DESPUÉS de php artisan migrate
-- ========================================================

-- PASO 1: Verificar que la migración se ejecutó
SHOW COLUMNS FROM users LIKE 'email';

-- PASO 2: Actualizar usuario 1 con datos de autenticación correctos
UPDATE users 
SET 
    email = 'alevalcarcel21@gmail.com',
    email_verified_at = NOW(),
    -- La contraseña ya está correcta (se guardó en el registro)
    is_active = 1,
    last_login_at = NOW()
WHERE id = 1;

-- PASO 3: Verificar que el usuario tiene calendario
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    c.id as calendar_id,
    c.name as calendar_name,
    c.is_default
FROM users u
LEFT JOIN calendars c ON u.id = c.user_id
WHERE u.id = 1;

-- PASO 4: Si no tiene calendario, crear uno
INSERT INTO calendars (user_id, name, description, color, is_default, is_visible, sort_order, created_at, updated_at)
SELECT 1, 'Personal', 'Mi calendario personal', '#1976d2', 1, 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM calendars WHERE user_id = 1 AND is_default = 1);

-- PASO 5: Si no tiene preferencias, crear
INSERT INTO user_preferences (user_id, time_interval_minutes, start_hour, end_hour, default_view, week_starts_on, created_at, updated_at)
SELECT 1, 30, 6, 22, 'week', 'monday', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_preferences WHERE user_id = 1);

-- PASO 6: Verificar eventos del usuario 1
SELECT COUNT(*) as total_events FROM events WHERE user_id = 1;

-- PASO 7: Verificar todo está correcto
SELECT 
    id,
    name,
    email,
    email_verified_at,
    is_active,
    last_login_at,
    created_at
FROM users 
WHERE id = 1;

