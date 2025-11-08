# Proudactive - Aplicativo de Produtividade

## Codigos para terminal

 INICIAR:
  cd MOBILE/ProudactiveMobile // VE A LA CARPETA DE MOBILE
  npx expo start // INICIA EXPO

  Github:

  INICIAR UN GIT
  git init
  git remote add origin URLDEGIT
  git branch -M main

  Subir A GIT:
  git add .
  git commit -m "commit1"
  git push -u origin main

  Ver tus COMMITS:
  git log --oneline
  git reset --soft 381f195

  👉 Te deja en ese commit, pero los cambios de commits posteriores quedan en tu editor como “unstaged changes”.

  git reset --hard 381f195

  👉 Vuelve al commit y borra cualquier cambio hecho después (lo que haya en VS Code desaparece). Es como viajar en el tiempo a ese snapshot exacto.

    para generar la app APK:

    npx eas build --platform android --profile production

### Actualizar App (OTA Updates):
```bash
# Para producción (Play Store)
npx eas update --branch production --message "Descripción de cambios"

# Para preview/testing
npx eas update --branch preview --message "Testing: Descripción"

# Para development
npx eas update --branch development --message "Dev: Descripción"
```

**📖 Ver guía completa:** `MOBILE/ProudactiveMobile/GUIA_UPDATES.md`

**⚠️ IMPORTANTE:**
- Updates OTA solo funcionan para cambios en JS/TS/assets
- Si cambias dependencias nativas, necesitas hacer un nuevo build
- El `runtimeVersion` en `app.json` debe coincidir entre build y updates


  para actualizar el backend (solo desde linux WSL):
  alejandro@DESKTOP-2KCG0IS:/mnt/c/PROYECTOS_WEB/Proudactive$ cd APILaravel
  ./deploy.sh

## Resumen del Proyecto

**Proudactive** es una aplicación completa de productividad **MOBILE-FIRST** que combina calendario inteligente, seguimiento de actividad física, biblioteca personal de notas y sistema de desafíos gamificados. El objetivo es centralizar todas las herramientas de productividad en una plataforma unificada y sincronizada.

## 🎯 **TAREAS v1.2 - LISTA COMPLETA**

### 🔥 **CRÍTICAS PARA PLAY STORE**
- [x] **Sistema de usuarios y autenticación** - ✅ COMPLETADO - Cada usuario tiene su cuenta y calendario
- [ ] **Vista del mes funcional** - Actualmente no funciona
- [ ] **Marcador de día/hora actual** - Arreglar bugs del indicador
- [x] **Recetas funcionales** - ✅ COMPLETADO - Modal de bloc de notas con edición completa

### 🎨 **MEJORAS DE UX**
- [ ] **Navegación automática** - Al abrir calendario semanal, ir al día actual
- [ ] **Bug de redimensionado** - Eventos vuelven a tamaño inicial al cambiar color
- [ ] **Subtareas mejoradas** - Texto negro hasta completar, arreglar teclado
- [ ] **Crear tareas con fecha/hora** - No solo donde haces click
- [ ] **Duplicar eventos** - Para reutilizar subtareas sin reescribir

### 🛠️ **FUNCIONALIDADES NUEVAS**
- [ ] **Bloque de notas** - Funcionalidad básica de notas
- [ ] **Copiar bloques** - Opción de copiar con subtareas incluidas
- [ ] **Colores por categoría** - Amarillo=comidas, etc.
- [ ] **Subtareas en creación** - Añadir subtareas al crear evento
- [ ] **Recurrencia mismo día** - Si creo evento sábado en sábado, debe aparecer
- [x] **Subtareas en recurrentes** - ✅ COMPLETADO - Sistema completo con modal "Solo este día" vs "Toda la serie"

1) Prioridades para la 1.2 (ordenadas)

~~Usuarios & Onboarding (crear cuenta / calendario por usuario).~~ ✅ **COMPLETADO** - Sistema multi-usuario funcional

Subtareas — UX + animación (lo que describiste: estado "negro" hasta completar y luego "brilla").

Crear tareas en fechas futuras + duplicar eventos (UX rápido).

Límites freemium básicos + sistema de flags (server-side).

Backend de suscripciones y verificación de recibos (Google Play).

QA, tests automatizados y checklist Play Store.


```

## 📋 Estado del Proyecto - CHECKLIST

### ✅ **CALENDARIO - COMPLETADO**
- [x] **Vistas implementadas**: Día, Semana, Mes con navegación
- [x] **Creación de eventos**: Modal con título, descripción, color
- [x] **Sistema de recurrencia**: Modal completo con modos diario/semanal/mensual
- [x] **Redimensionar bloques**: Arrastrar para cambiar duración (vertical)
- [x] **Mover bloques**: Drag & drop para cambiar horario y fecha
- [x] **Sincronización API**: Crear/actualizar eventos en base de datos
- [x] **Generación de instancias**: Eventos recurrentes se generan bajo demanda
- [x] **Persistencia**: Eventos se guardan y cargan desde API
- [x] **Recurrencia funcional**: ✅ **COMPLETAMENTE FUNCIONAL** - Horarios correctos, persistencia, generación de instancias
- [x] **Zona horaria**: ✅ **RESUELTO** - Sin diferencias de horario
- [x] **Drag & drop**: ✅ **COMPLETAMENTE FUNCIONAL** - Click corto para editar, long press para mover
- [x] **Liberación de series**: ✅ **COMPLETAMENTE FUNCIONAL** - Eventos de serie se pueden liberar y crear nueva serie independiente
- [x] **Edición de eventos liberados**: ✅ **COMPLETAMENTE FUNCIONAL** - Eventos liberados pueden aplicar nueva recurrencia creando serie independiente
- [x] **Hitbox de eventos expandidos**: ✅ **RESUELTO** - Eventos redimensionados son clickeables en toda su área

### ❌ **CALENDARIO - PENDIENTE**
- [ ] **Personalidad de bloques**: Manejo correcto de edición vs creación de eventos recurrentes
- [ ] **Excepciones de recurrencia**: Modificar/eliminar instancias específicas
- [ ] **División de series**: Cambiar reglas de recurrencia para eventos futuros
- [ ] **Cargar configuración al editar**: Mostrar configuración de recurrencia al editar eventos
- [ ] **Extensión horizontal**: Bloques multi-día en vista semanal
- [ ] **Alarmas**: Sistema de notificaciones locales/push

### 🎯 **ARQUITECTURA DE EXCEPCIONES Y DIVISIÓN DE SERIES - PENDIENTE**

#### **Problema Identificado:**
- **Edición vs Creación**: Al hacer clic en un evento recurrente, se abre modal de "crear" en lugar de "editar"
- **Creación accidental**: Usuario puede crear eventos duplicados sin querer
- **Falta de personalidad**: No se distingue entre instancia específica vs serie completa

#### **Arquitectura Propuesta:**

**1. Excepciones Puntuales (Override):**
- **Uso**: Cambiar/eliminar una sola ocurrencia específica
- **Implementación**: Tabla `recurrence_exceptions` con `is_deleted` o `override_event_id`
- **Ejemplo**: Eliminar solo el evento del 15 de octubre

**2. División de Series (Split Series):**
- **Uso**: Cambiar reglas de recurrencia para eventos futuros
- **Implementación**: 
  - Acortar serie original: `recurrence_end_date = fecha_división - 1`
  - Crear nueva serie: Nuevo evento con `recurrence_start_date = fecha_división`
- **Ejemplo**: Cambiar de miércoles a martes a partir del 1 de noviembre

**3. Modal de Edición Inteligente:**
- **Detectar contexto**: ¿Es instancia específica o serie completa?
- **Opciones claras**: "Solo este evento" vs "Todos los futuros" vs "Toda la serie"

### 🗑️ **ELIMINACIÓN DE EVENTOS - PENDIENTE**
- [ ] **Modal de confirmación** con opciones:
  - [ ] "Eliminar solo este evento"
  - [ ] "Eliminar este y todos los futuros" 
  - [ ] "Eliminar toda la serie"

### 🔔 **SISTEMA DE ALARMAS - PENDIENTE**
- [ ] **Tipos de Alarma**:
  - [ ] **Local**: Notificación en el dispositivo
  - [ ] **Push**: Notificación push (mobile)
  - [ ] **Email**: Envío de email (futuro)

### ✅ **API BACKEND - COMPLETADO**
- [x] **Estructura de base de datos**: Tablas creadas con campos de recurrencia
- [x] **Endpoints básicos**: GET/POST/PUT eventos
- [x] **Validación de recurrencia**: ✅ **FUNCIONANDO** - Se guardan las reglas JSON correctamente
- [x] **Persistencia de datos**: Los campos `is_recurring`, `recurrence_rule`, `recurrence_end_date` se guardan y cargan correctamente
- [ ] **Generación de instancias**: API debe generar eventos recurrentes
- [ ] **Manejo de excepciones**: Tabla `recurrence_exceptions`

### ✅ **MOBILE - COMPLETADO**
- [x] **Navegación**: React Navigation configurado
- [x] **Vistas de calendario**: Día/Semana/Mes funcionales
- [x] **Modal de eventos**: Crear/editar con todos los campos
- [x] **Modal de recurrencia**: Configuración completa
- [x] **Redimensionar**: Bloques redimensionables verticalmente
- [x] **Sincronización**: Conectado a API Laravel
- [x] **Recurrencia funcional**: ✅ **COMPLETAMENTE FUNCIONAL** - Crear, guardar, cargar, generar instancias
- [x] **Zona horaria**: ✅ **RESUELTO** - Horarios correctos sin diferencias

### 🌐 **WEB - PENDIENTE**
- [ ] **Setup inicial**: React + Vite configurado
- [ ] **Vistas de calendario**: Implementar mismas vistas que mobile
- [ ] **Sincronización**: Misma API que mobile
- [ ] **PWA**: Progressive Web App

### ✅ **MERCADO - COMPLETADO**
- [x] **Lista de compras**: Sistema de ítems con checkbox
- [x] **Agregar ítems**: Campo de texto para agregar nuevos ítems
- [x] **Eliminar individual**: Botón de basurero para cada ítem
- [x] **Eliminar todo**: Botón para limpiar toda la lista
- [x] **API Backend**: CRUD completo con autenticación
- [x] **Base de datos**: Tabla `market_items` con campos futuros
- [x] **Navegación**: Cambio de "Desafíos" a "Mercado"

### 🏋️ **MÓDULOS ADICIONALES - PENDIENTE**
- [ ] **Gimnasio**: Rastreador de entrenamientos
- [ ] **Biblioteca**: Gestión de libros y notas
- [ ] **Herramientas**: Pomodoro, tareas rápidas

## 🗄️ Base de Datos - Estructura Esencial

### Campos de Recurrencia en tabla `events`:
```sql
is_recurring TINYINT(1) DEFAULT 0
recurrence_rule JSON
recurrence_end_date DATE NULL
recurrence_count INT NULL
```

### Tablas principales:
- `users` - Usuarios del sistema
- `calendars` - Calendarios por usuario  
- `events` - Eventos con soporte de recurrencia
- `subtasks` - Subtareas de eventos (nueva)
- `market_items` - Lista de compras del mercado (nueva)
- `recurrence_exceptions` - Excepciones en series recurrentes
- `alarms` - Alarmas y recordatorios
- `devices` - Dispositivos para notificaciones push

### estructura de tablas

## Modelo de Datos MySQL

### Scripts de Creación

```sql
-- =============================================
-- PROUDACTIVE DATABASE SCHEMA
-- Versión: 1.0
-- Fecha: 2024-01-15
-- Charset: utf8mb4_unicode_ci
-- =============================================

-- Crear bases para diferentes entornos
CREATE DATABASE IF NOT EXISTS proudactive_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proudactive_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proudactive_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar base de desarrollo
USE proudactive_dev;

-- =============================================
-- TABLA: users
-- Almacena informaciones básicas de los usuarios
-- =============================================
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email único para login',
    email_verified_at TIMESTAMP NULL COMMENT 'Data de verificação do email',
    password VARCHAR(255) NOT NULL COMMENT 'Hash da senha (bcrypt)',
    name VARCHAR(150) NOT NULL COMMENT 'Nome completo do usuário',
    timezone VARCHAR(64) DEFAULT 'America/Sao_Paulo' COMMENT 'Fuso horário padrão do usuário',
    locale VARCHAR(10) DEFAULT 'pt-BR' COMMENT 'Idioma preferido (pt-BR, en-US, es-ES)',
    avatar_url VARCHAR(512) NULL COMMENT 'URL do avatar do usuário',
    is_active TINYINT(1) DEFAULT 1 COMMENT 'Status ativo/inativo da conta',
    last_login_at TIMESTAMP NULL COMMENT 'Último login registrado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: user_profiles
-- Información extendida y configuraciones del usuario
-- =============================================
CREATE TABLE user_profiles (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    bio TEXT COMMENT 'Biografia/descrição do usuário',
    settings JSON COMMENT 'Configurações personalizadas em JSON',
    notification_settings JSON COMMENT 'Preferências de notificação',
    theme_preference ENUM('light', 'dark', 'auto') DEFAULT 'auto' COMMENT 'Tema preferido da interface',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: calendars
-- Calendarios de los usuarios (permite múltiples por usuario)
-- =============================================
CREATE TABLE calendars (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL COMMENT 'Nome do calendário (ex: Pessoal, Trabalho)',
    description TEXT COMMENT 'Descrição do calendário',
    color VARCHAR(7) DEFAULT '#1976d2' COMMENT 'Cor em hexadecimal para identificação visual',
    is_default TINYINT(1) DEFAULT 0 COMMENT 'Se é o calendário padrão do usuário',
    is_visible TINYINT(1) DEFAULT 1 COMMENT 'Se está visível na interface',
    sort_order INT DEFAULT 0 COMMENT 'Ordem de exibição',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_user_default (user_id, is_default),
    UNIQUE KEY unique_user_default (user_id, is_default) -- Solo un predeterminado por usuario
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: events
-- Eventos del calendario (serie master o evento único)
-- 
-- NOTA: Campos simples (título, descripción, fecha/hora, color) se actualizan directamente.
-- Campos complejos (recurrencia, series_id, etc.) eliminan el evento y crean uno nuevo.
-- =============================================
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    calendar_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'Redundante mas útil para queries rápidas',
    title VARCHAR(255) NOT NULL COMMENT 'Título do evento',
    description TEXT COMMENT 'Descrição detalhada do evento',
    location VARCHAR(255) COMMENT 'Local do evento',
    
    -- Fechas y horarios (siempre en UTC)
    start_utc DATETIME NOT NULL COMMENT 'Data/hora de início em UTC',
    end_utc DATETIME NOT NULL COMMENT 'Data/hora de fim em UTC',
    all_day TINYINT(1) DEFAULT 0 COMMENT 'Se é evento de dia inteiro',
    timezone VARCHAR(64) DEFAULT 'UTC' COMMENT 'Fuso horário original de criação',
    
    -- Apariencia y categorización
    color VARCHAR(7) NULL COMMENT 'Cor personalizada (herda do calendário se NULL)',
    category VARCHAR(100) COMMENT 'Categoria/tag do evento',
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal' COMMENT 'Prioridade do evento',
    
    -- Recurrencia
    is_recurring TINYINT(1) DEFAULT 0 COMMENT 'Se é um evento recorrente',
    recurrence_rule JSON COMMENT 'Regras de recorrência em formato JSON',
    recurrence_end_date DATE NULL COMMENT 'Data limite para recorrências',
    recurrence_count INT NULL COMMENT 'Número máximo de ocorrências',
    
    -- Referencia para serie (cuando es una instancia modificada)
    series_id BIGINT UNSIGNED NULL COMMENT 'ID da série master se for override',
    original_start_utc DATETIME NULL COMMENT 'Horário original se foi modificado',
    
    -- Control
    is_deleted TINYINT(1) DEFAULT 0 COMMENT 'Soft delete',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (series_id) REFERENCES events(id) ON DELETE CASCADE,
    
    INDEX idx_calendar_id (calendar_id),
    INDEX idx_user_id (user_id),
    INDEX idx_start_utc (start_utc),
    INDEX idx_end_utc (end_utc),
    INDEX idx_date_range (start_utc, end_utc),
    INDEX idx_recurring (is_recurring),
    INDEX idx_series_id (series_id),
    INDEX idx_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: subtasks
-- Subtareas de eventos (checklist de tareas)
-- =============================================
CREATE TABLE subtasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL COMMENT 'ID del evento padre',
    text VARCHAR(500) NOT NULL COMMENT 'Texto de la subtarea',
    completed TINYINT(1) DEFAULT 0 COMMENT 'Si la subtarea está completada',
    sort_order INT DEFAULT 0 COMMENT 'Orden de visualización',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_event_id (event_id),
    INDEX idx_completed (completed),
    INDEX idx_sort_order (sort_order),
    CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- TABLA: recurrence_exceptions
-- Excepciones y modificaciones en series recurrentes
-- =============================================
CREATE TABLE recurrence_exceptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL COMMENT 'ID da série master',
    exception_date DATE NOT NULL COMMENT 'Data da ocorrência afetada (em UTC)',
    is_deleted TINYINT(1) DEFAULT 0 COMMENT '1 = ocorrência foi excluída',
    override_event_id BIGINT UNSIGNED NULL COMMENT 'ID do evento substituto se foi modificado',
    reason VARCHAR(255) COMMENT 'Motivo da exceção (opcional)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (override_event_id) REFERENCES events(id) ON DELETE CASCADE,
    
    INDEX idx_event_id (event_id),
    INDEX idx_exception_date (exception_date),
    UNIQUE KEY unique_event_date (event_id, exception_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: alarms
-- Alarmas y recordatorios para eventos
-- =============================================
CREATE TABLE alarms (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    trigger_minutes_before INT NOT NULL COMMENT 'Minutos antes do evento (ex: 15, 60, 1440)',
    method ENUM('local', 'push', 'email') DEFAULT 'local' COMMENT 'Tipo de notificação',
    custom_message VARCHAR(255) COMMENT 'Mensagem personalizada do alarme',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT 'Se o alarme está ativo',
    last_triggered_at TIMESTAMP NULL COMMENT 'Última vez que foi disparado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event_id (event_id),
    INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: devices
-- Dispositivos registrados para notificaciones push
-- =============================================
CREATE TABLE devices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    device_name VARCHAR(255) COMMENT 'Nome amigável do dispositivo',
    platform ENUM('android', 'ios', 'web') NOT NULL COMMENT 'Plataforma do dispositivo',
    push_token VARCHAR(1024) COMMENT 'Token para notificações push',
    app_version VARCHAR(20) COMMENT 'Versão do app',
    os_version VARCHAR(50) COMMENT 'Versão do sistema operacional',
    is_active TINYINT(1) DEFAULT 1 COMMENT 'Se está ativo para receber notificações',
    last_seen_at TIMESTAMP NULL COMMENT 'Última atividade registrada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_platform (platform),
    INDEX idx_active (is_active),
    INDEX idx_push_token (push_token(255)) -- Índice parcial devido ao tamanho
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MÓDULOS ADICIONALES
-- =============================================

-- TABLA: gym_entries (Rastreador de Gimnasio)
CREATE TABLE gym_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    date DATE NOT NULL COMMENT 'Data do treino',
    activity VARCHAR(255) COMMENT 'Tipo de atividade (ex: Musculação, Cardio)',
    duration_minutes INT COMMENT 'Duração em minutos',
    calories_burned INT COMMENT 'Calorias queimadas (estimativa)',
    notes TEXT COMMENT 'Observações sobre o treino',
    rating TINYINT(1) CHECK (rating >= 1 AND rating <= 5) COMMENT 'Avaliação do treino (1-5)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date),
    INDEX idx_activity (activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: books (Biblioteca/Lecturas)
CREATE TABLE books (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT 'Título do livro',
    author VARCHAR(255) COMMENT 'Autor do livro',
    isbn VARCHAR(20) COMMENT 'ISBN do livro',
    status ENUM('to-read', 'reading', 'finished', 'abandoned') DEFAULT 'to-read' COMMENT 'Status da leitura',
    rating TINYINT(1) CHECK (rating >= 1 AND rating <= 5) COMMENT 'Avaliação (1-5 estrelas)',
    pages_total INT COMMENT 'Total de páginas',
    pages_read INT DEFAULT 0 COMMENT 'Páginas lidas',
    started_at DATE COMMENT 'Data de início da leitura',
    finished_at DATE COMMENT 'Data de conclusão',
    notes TEXT COMMENT 'Anotações e resenha pessoal',
    cover_url VARCHAR(512) COMMENT 'URL da capa do livro',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: challenges (Sistema de Desafíos/Gamificación)
CREATE TABLE challenges (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT 'Título do desafio',
    description TEXT COMMENT 'Descrição detalhada',
    type ENUM('daily', 'weekly', 'monthly', 'custom') NOT NULL COMMENT 'Tipo de desafio',
    category ENUM('productivity', 'health', 'learning', 'habit') NOT NULL COMMENT 'Categoria',
    target_value INT NOT NULL COMMENT 'Meta a ser atingida',
    current_value INT DEFAULT 0 COMMENT 'Progresso atual',
    unit VARCHAR(50) COMMENT 'Unidade de medida (ex: horas, páginas, treinos)',
    start_date DATE NOT NULL COMMENT 'Data de início',
    end_date DATE NOT NULL COMMENT 'Data limite',
    status ENUM('active', 'completed', 'failed', 'paused') DEFAULT 'active' COMMENT 'Status do desafio',
    reward_points INT DEFAULT 0 COMMENT 'Pontos de recompensa',
    completed_at TIMESTAMP NULL COMMENT 'Data de conclusão',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: user_achievements (Logros de los usuarios)
CREATE TABLE user_achievements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    achievement_type VARCHAR(100) NOT NULL COMMENT 'Tipo de conquista',
    title VARCHAR(255) NOT NULL COMMENT 'Título da conquista',
    description TEXT COMMENT 'Descrição da conquista',
    points_earned INT DEFAULT 0 COMMENT 'Pontos ganhos',
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data da conquista',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (achievement_type),
    INDEX idx_earned_at (earned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: market_items (Lista de compras del mercado)
CREATE TABLE market_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'ID del usuario propietario del mercado',
    name VARCHAR(255) NOT NULL COMMENT 'Nombre del ítem (pan, queso, etc.)',
    checked TINYINT(1) DEFAULT 0 COMMENT 'Si el ítem fue marcado para eliminar',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Campos futuros para historial o estadísticas
    historical_data JSON DEFAULT NULL COMMENT 'Por si guardamos histórico de este ítem',
    popularity_count INT DEFAULT 0 COMMENT 'Por si guardamos cuántas veces se pidió este ítem',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_checked (checked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```


## 🎯 **RECURRENCIA - ✅ COMPLETAMENTE FUNCIONAL**

### ✅ **LO QUE YA FUNCIONA PERFECTAMENTE:**
- [x] **Modal de recurrencia**: Configuración completa diario/semanal/mensual
- [x] **Generación de instancias**: Eventos recurrentes se generan correctamente
- [x] **Envío al API**: Datos se envían correctamente al servidor
- [x] **Persistencia**: Los campos se guardan y cargan desde la base de datos
- [x] **Horarios correctos**: Sin diferencias de zona horaria
- [x] **Recarga de app**: Los eventos se mantienen al cerrar y abrir la app

### 🔧 **MEJORAS MENORES PENDIENTES:**
- [ ] **Recarga automática**: No requiere navegar para ver nuevos eventos
- [ ] **Cargar configuración al editar**: Mostrar configuración al editar eventos recurrentes
- [ ] **Optimización**: Mejorar rendimiento en la generación de instancias



7) Anti-piratería y seguridad de suscripciones

No existe “perfecto”, pero hay prácticas sólidas:

Server-side entitlements: Toda la lógica de “qué puede” hace el servidor. La app pide GET /api/me/entitlements y el servidor responde. Sin servidor no hay acceso premium.

Verificar recibos en backend: Para Google Play, validar purchaseToken con Google Play Developer API (server-to-server).

Verificación periódica: refrescar estado de suscripción en el servidor cada X horas.

Firebase App Check / SafetyNet: aumentar dificultad de emulación/ingeniería inversa.

Obfuscación & native checks: ProGuard/R8, y alguna validación nativa si te preocupa mucho, pero no confíes solo en eso.

Monitorización de anomalías: detectar múltiples cuentas con misma device id, múltiples compras invalidas, etc.

8) KPIs a medir desde el día 1

DAU / MAU

Activación (registro -> crea primer evento)

Retention D1, D7, D30

    ## 📱 **EXPO BARE WORKFLOW / PREBUILD**

### **Diferencias entre Expo Go y Bare Workflow:**

**1. Expo Go** → Solo puedes usar JS y módulos que ya vienen precompilados en Expo. Limitado si quieres notificaciones avanzadas o sonidos personalizados.

**2. Prebuild / Bare Workflow** → Expo genera las carpetas `android` y `ios` con código nativo. Ahí ya puedes usar librerías como **Notifee**, configurar sonidos personalizados, notificaciones en pantalla de bloqueo, etc.

**3. EAS Build** → Es la herramienta de Expo para compilar tu app nativa (apk/ipa) en la nube sin tener que instalar Android Studio o Xcode localmente. Funciona con Bare Workflow también.

**4. Android Studio / Xcode** → Es la opción de "todo local": abres la carpeta `android` o `ios` y compilas ahí. Necesario si quieres depurar nativo o usar librerías nativas que EAS Build no soporte bien.

### **Resumen:**
Tu app sigue siendo Expo, pero para ciertas cosas avanzadas como Notifee necesitas salir de Expo Go y usar **Prebuild + EAS Build** o abrir en Android Studio/Xcode.

### **Configuración actual:**
- ✅ Sonido personalizado `cling.mp3` configurado en `assets/sounds/`
- ✅ Configuración de notificaciones en `app.json`
- 🔄 Listo para implementar Notifee con notificaciones avanzadas

Conversion rate (trial → pago)

Churn rate mensualmente

ARPU y LTV

Feature usage: % users using subtasks, recurrence, duplicar eventos

---

## 🔐 **SISTEMA DE AUTENTICACIÓN MULTI-USUARIO - COMPLETADO (Octubre 2025)**

### ✅ **IMPLEMENTACIÓN COMPLETADA**

**Problema resuelto:** Sistema de autenticación multi-usuario completamente funcional. Cada usuario tiene su propia cuenta, calendario y eventos aislados.

### **Cambios realizados:**

#### **Backend (Laravel):**
- ✅ **Migración completada:** `add_auth_fields_to_users_table.php` con todos los campos de autenticación
- ✅ **EventController actualizado:** Usa `$request->user()->id` en lugar de `user_id = 1`
- ✅ **SubtaskController actualizado:** Verifica permisos del usuario autenticado
- ✅ **AuthController funcional:** Registro, login, verificación por email, tokens Sanctum

#### **Frontend (Mobile):**
- ✅ **Redirección arreglada:** `_layout.tsx` ya no causa redirección infinita
- ✅ **Login funcional:** Redirige correctamente a `/(tabs)` después del login
- ✅ **Verificación de email:** Redirige correctamente después de verificar código

#### **Base de datos:**
- ✅ **Campos agregados:** `email`, `password`, `email_verified_at`, `last_login_at`, `remember_token`, `avatar_url`, `is_active`
- ✅ **Índices creados:** Para optimización de consultas
- ✅ **Relaciones funcionando:** Usuario → Calendarios → Eventos → Subtareas

### **Arquitectura multi-usuario:**

```
┌─────────────┐
│   USER 1    │──┬──> Calendar "Personal"  ──┬──> Event 1
└─────────────┘  │                           ├──> Event 2
                 │                           └──> Event 3
                 │
                 └──> Calendar "Trabajo"    ──┬──> Event 4
                                             └──> Event 5

┌─────────────┐
│   USER 2    │──┬──> Calendar "Personal"  ──┬──> Event 6
└─────────────┘  │                           └──> Event 7
                 │
                 └──> Calendar "Familia"    ──┬──> Event 8
                                             └──> Event 9
```

### **Funcionalidades implementadas:**
- ✅ **Registro de usuarios** con verificación por email
- ✅ **Login seguro** con tokens Sanctum
- ✅ **Calendarios individuales** por usuario
- ✅ **Eventos aislados** por usuario
- ✅ **Subtareas vinculadas** a eventos del usuario
- ✅ **Lista de mercado individual** por usuario
- ✅ **Recetas personales** por usuario
- ✅ **Preferencias individuales** por usuario

### **Seguridad implementada:**
- ✅ **Passwords hasheados** con bcrypt
- ✅ **Tokens Sanctum** con expiración configurable
- ✅ **Middleware auth:sanctum** en todas las rutas protegidas
- ✅ **Filtrado por user_id** en todas las consultas
- ✅ **Verificación de permisos** en controladores

### **Estado actual:**
- ✅ **Backend:** 100% Completo
- ✅ **Frontend:** 100% Completo  
- ✅ **Base de datos:** 100% Completo
- ✅ **Documentación:** 100% Completa
- ✅ **Testing:** Listo para pruebas de usuario

### **Próximos pasos opcionales:**
- [ ] **Perfil de usuario:** Pantalla para cambiar avatar, password, timezone
- [ ] **Multi-calendarios:** UI para crear calendarios adicionales
- [ ] **Seguridad avanzada:** Rate limiting, 2FA, sesiones activas
- [ ] **UX mejorada:** Animaciones de transición, toast notifications

**El sistema multi-usuario está completamente funcional y listo para producción.** 🚀

---

## 🔧 FIX CRÍTICO - Autenticación en Peticiones API (23 Oct 2025)

### 2025-10-23 (Tarde): Corrección de Calendar ID y Email Verification ✅

**PROBLEMAS RESUELTOS:**

1. **Calendar ID Hardcoded → Usuarios veían calendario del Usuario 1** 🔧
   - **Problema**: En `calendar.tsx` línea 1926 había un `calendar_id: 1` hardcoded
   - **Solución**: Cambiado a obtener calendar_id dinámicamente usando `apiGetCalendars()?.data?.[0]?.id`
   - **Impacto**: Cada usuario ahora ve solo SU propio calendario con SUS eventos
   - **Archivos modificados**: `MOBILE/ProudactiveMobile/app/(tabs)/calendar.tsx`

2. **Email Verification Loop → Usuario no podía reloguear después de logout** 🔧
   - **Problema**: 
     - `email_verified_at` no se guardaba correctamente en DB al verificar código
     - Al hacer login después de logout, pedía verificar email nuevamente
     - Email de "reenviar código" no llegaba
   
   - **Solución Backend** (`APILaravel/app/Http/Controllers/Api/AuthController.php`):
     - Cambiado `$user->update()` por `$user->save()` + `$user->refresh()` para asegurar guardado
     - Agregado logs detallados en login para debug de `email_verified_at`
     - Mejorado `resendVerificationCode` para manejar casos de email ya verificado
     - Agregado import `use Illuminate\Support\Facades\Log;`
   
   - **Solución Frontend**:
     - `services/auth.ts`: Limpia sesión si email ya está verificado en resendCode
     - `app/(auth)/verify.tsx`: Redirige a login si email ya está verificado al reenviar código
   
   - **Flujo correcto ahora**:
     1. Usuario crea cuenta → Email verificación llega ✅
     2. Usuario verifica código → `email_verified_at` se guarda en DB ✅
     3. Usuario entra a la app ✅
     4. Usuario hace logout → Sesión limpia ✅
     5. Usuario hace login → Backend verifica `email_verified_at` y permite login ✅
   
   - **Archivos modificados**:
     - `APILaravel/app/Http/Controllers/Api/AuthController.php`
     - `MOBILE/ProudactiveMobile/services/auth.ts`
     - `MOBILE/ProudactiveMobile/app/(auth)/verify.tsx`

**IMPORTANTE**: Los logs ahora usan `Log::info()` en lugar de `\Log::info()` para cumplir con PSR-4.

---

### 2025-10-23 (Mañana): Sistema de Autenticación y Headers

### Problema identificado:
Las funciones API en el móvil (`calendar.tsx` y `challenges.tsx`) **NO enviaban el token de autenticación** en los headers, causando:
- ❌ Error 500 en endpoints protegidos
- ❌ Calendarios y eventos no se cargaban
- ❌ Market items y recipes no se cargaban
- ❌ `$request->user()` retornaba `null` en Laravel

### Solución implementada:

#### 1. **Mobile - calendar.tsx:**
- ✅ Agregado `import authService` 
- ✅ Creado helper `getAuthHeaders()` para obtener token
- ✅ Actualizadas TODAS las funciones API:
  - `apiPutEventTimes()`, `apiPutEvent()`, `apiGetCalendars()`
  - `apiPostEvent()`, `apiDeleteEvent()`, `apiFetchEvents()`
  - `apiGetSubtasks()`, `apiCreateSubtask()`, `apiUpdateSubtask()`
  - `apiDeleteSubtask()`, `apiUpdateMultipleSubtasks()`
- ✅ Cambiada ruta `/calendars-public-test` → `/calendars` (correcta)
- ✅ Eliminadas funciones debug temporales

#### 2. **Mobile - challenges.tsx:**
- ✅ Agregado `import authService`
- ✅ Creado helper `getAuthHeaders()`
- ✅ Actualizadas TODAS las funciones API:
  - `apiGetMarketItems()`, `apiCreateMarketItem()`, `apiDeleteMarketItem()`
  - `apiToggleMarketItem()`, `apiDeleteAllMarketItems()`
  - `apiGetRecipes()`, `apiCreateRecipe()`, `apiDeleteRecipe()`
- ✅ Cambiadas rutas `-test` → rutas correctas de producción
- ✅ Actualizado parseo de respuestas para formato Laravel

#### 3. **Backend - routes/api.php:**
- ✅ Eliminadas rutas temporales públicas:
  - `/v1/calendars-public-test`
  - `/v1/debug-headers`
  - `/v1/market-items-test*`
  - `/v1/recipes-test*`
- ✅ Solo rutas protegidas con `auth:sanctum`

### Resultado:
✅ **Todos los endpoints ahora requieren y validan autenticación**  
✅ **Los datos del usuario 1 (calendarios/eventos/items/recetas) ahora se cargan correctamente**  
✅ **No más errores 500 por falta de autenticación**  
✅ **Sistema de autenticación 100% funcional end-to-end**

### Código del helper implementado:
```typescript
// Helper para obtener headers autenticados
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}
```

**Todas las peticiones API ahora incluyen el token de autenticación correctamente.** 🔐

---

## 🔧 FIX - Verificación de Email y Conflicto de Tokens (23 Oct 2025)

### Problemas identificados:

#### 1. **Usuario nuevo veía eventos de otro usuario:**
- **Causa:** Conflicto de tokens en AsyncStorage. Al registrarse un nuevo usuario, el token del usuario anterior permanecía en memoria.
- **Síntoma:** Usuario 4 veía los eventos del usuario 1.

#### 2. **`email_verified_at` no se actualizaba en la BD:**
- **Causa:** El campo `email_verified_at` NO estaba en el array `$fillable` del modelo User.
- **Síntoma:** Aunque la verificación decía "exitosa", la fecha quedaba `NULL` en la BD. Al intentar login, pedía verificar de nuevo.

### Soluciones implementadas:

#### 1. **APILaravel/app/Models/User.php:**
- ✅ Agregado `email_verified_at` al array `$fillable`
- Ahora la verificación de email SÍ se guarda correctamente en la BD

#### 2. **MOBILE/ProudactiveMobile/app/(auth)/register.tsx:**
- ✅ Agregado `await authService.clearSession()` antes del registro
- Limpia cualquier token anterior para evitar conflictos

#### 3. **MOBILE/ProudactiveMobile/app/(tabs)/calendar.tsx:**
- ✅ Agregado debug visual mostrando User ID y Calendar ID
- Aparece en banner amarillo al entrar a la app
- Formato: `🐛 Debug: User ID: X | Calendar ID: Y`

#### 4. **Verificación de email en login:**
- ✅ Mantenida por seguridad
- Previene que usuarios no verificados accedan a la app

### Resultado:
✅ **email_verified_at ahora se guarda correctamente al verificar**  
✅ **No más conflictos de tokens entre usuarios**  
✅ **Cada usuario ve solo sus propios calendarios y eventos**  
✅ **Debug visual activo para confirmar User ID y Calendar ID**

**El sistema de autenticación multi-usuario ahora funciona correctamente end-to-end.** 🎉

















## 📅 **VISTA DE AÑO (YEAR VIEW) - Diciembre 2025**

### ✅ **LO QUE FUNCIONA:**
- **Líneas de eventos visibles**: Eventos mensuales se muestran como líneas de colores debajo de la barra de meses
- **Scroll vertical**: Agregado scroll vertical en el calendario para ver líneas completas sin cortarse
- **Leyenda de colores**: Leyenda fija que muestra colores únicos y nombres de eventos (máximo 4 por fila)
- **Modal "Planear Año"**: 
  - Página 1: Selección de metas anuales con sugerencias y campo personalizado
  - Página 2: Drag & drop de metas al calendario con preview visual
  - Guardado de metas como eventos mensuales (`MonthEvent`)
- **Navegación a mes**: Click en segmento de mes navega a vista mensual

### 🔧 **CÓMO RESTAURAR LÍNEAS SI SE ROMPEN:**
1. **`objectivesContainer`** debe tener:
   - `position: 'absolute'`, `top: 65`, `minWidth: 1800` (igual que `monthsBar`)
   - `zIndex: 2`, `pointerEvents: 'none'`, `backgroundColor: 'transparent'`
2. **`monthsBarContainer`** debe tener:
   - `position: 'relative'`, `minHeight: 200`
3. **`monthsBar`** debe tener:
   - `overflow: 'visible'` (no `'hidden'`)
4. **`objectiveLine`** debe tener:
   - `position: 'absolute'`, `height: 12`, `minWidth: 2`
   - `left` y `width` en porcentajes basados en cálculo: `monthStartPercent + (relativeStartInMonth * monthWidthPercent)`
5. **Scroll vertical**: `ScrollView` vertical dentro del horizontal con `maxHeight: Dimensions.get('window').height * 0.5`

### ❌ **PENDIENTE:**
- [ ] **Conversión año ↔ mes**: 
  - Cuando se crea línea en año view → convertir a días en vista mes
  - Cuando se crea evento en mes (días) → mostrar como línea en año view
- [ ] **Leyenda de colores**: Corregir problema de colores que se reemplazan (mostrar títulos más recientes)

### 📁 **ARCHIVOS CLAVE:**
- `MOBILE/ProudactiveMobile/src/components/calendar/YearView.tsx` - Componente principal
- `MOBILE/ProudactiveMobile/src/components/calendar/monthEventHelpers.ts` - Helpers para eventos mensuales
- `MOBILE/ProudactiveMobile/src/components/calendar/MonthView.tsx` - Vista mensual

---

# Avances del Proyecto Proudactive

## ✅ **LO QUE FUNCIONA PERFECTAMENTE:**

### Base de Datos - Recurrencia
- **Guardado correcto**: Los campos `is_recurring`, `recurrence_rule`, `recurrence_end_date` se guardan correctamente en la base de datos
- **Formato JSON string**: El API acepta `recurrence_rule` como string JSON (no como objeto)
- **Validación API**: Laravel valida correctamente los campos de recurrencia como `nullable|string`
- **Persistencia**: Los eventos se mantienen al cerrar y abrir la app

### Frontend - Recurrencia
- **Modal de recurrencia**: Funciona perfectamente para configurar diario/semanal/mensual
- **Persistencia temporal**: La configuración se mantiene mientras la app está abierta
- **Envío al API**: Los datos se envían correctamente al servidor
- **Generación de instancias**: Los eventos recurrentes se generan correctamente
- **Campos de recurrencia en instancias**: Las instancias generadas ahora tienen los campos de recurrencia
- **Configuración visible**: Los eventos generados muestran correctamente "REPETIR DIARIO - A CADA 1 DÍA"
- **Horarios correctos**: Sin diferencias de zona horaria (12:00 PM → 12:00 PM)

### Zona Horaria - ✅ RESUELTO
- **Problema anterior**: Los eventos se creaban con diferencias de zona horaria
- **Solución aplicada**: Usar `getUTCHours()` y ajustar con `START_HOUR` para mantener consistencia
- **Estado**: ✅ COMPLETAMENTE RESUELTO

## 🔧 **EN CORRECCIÓN:**
- [x] **Recarga automática**: ✅ RESUELTO - Eventos se recargan automáticamente al crear
- [x] **Duplicación de eventos**: ✅ RESUELTO - Filtro de duplicados implementado
- [x] **Date value out of bounds**: ✅ RESUELTO - Cambiado a `getTime()` y `Date.UTC()` para evitar fechas inválidas
- [x] **Fecha de fin de recurrencia**: ✅ RESUELTO - Corregida la lógica de generación de instancias
- [ ] **Cargar configuración al editar**: Al hacer clic en un evento recurrente, debe mostrar su configuración
- [ ] **Probar flujo completo**: crear → salir → entrar → editar → verificar configuración

## ✅ **NUEVOS ARREGLOS IMPLEMENTADOS:**

### Recurrencia con Fecha de Fin - ✅ RESUELTO
- **Problema**: Error `Date value out of bounds` al crear eventos recurrentes con fecha de fin
- **Causa**: La base de datos devuelve fechas en formato ISO (`2025-10-30T00:00:00.000000Z`) pero el código esperaba formato YYYY-MM-DD
- **Solución aplicada**: 
  - Parsing robusto que maneja tanto formato ISO como YYYY-MM-DD
  - Detección automática del formato y conversión a YYYY-MM-DD
  - Validación de componentes de fecha antes de crear objeto Date
  - Logs mejorados para debugging
- **Estado**: ✅ COMPLETAMENTE FUNCIONAL

## ✅ **DUPLICACIÓN DE EVENTOS RECURRENTES - RESUELTO**

### Problema Identificado:
- **Síntoma**: Eventos recurrentes aparecían duplicados con horarios incorrectos (ej: evento a las 12:00 PM se duplicaba a las 9:00 AM)
- **Causa raíz**: En `fetchEventsForRange`, se incluían tanto las instancias generadas como el evento maestro
- **Resultado**: Dos eventos visibles: el maestro (día de creación) + las instancias (días de repetición)

### Solución Implementada:
- **Eliminación del evento maestro**: En eventos recurrentes, solo se incluyen las instancias generadas
- **Lógica corregida**: Las instancias ya representan las ocurrencias del evento, no se necesita el maestro
- **Resultado**: Solo aparecen las instancias en los días correctos con horarios correctos

### Código Corregido:
```typescript
// ANTES (causaba duplicados):
if (item.is_recurring) {
  const recurrentInstances = generateRecurrentInstances(item, rangeStart, rangeEnd);
  allEvents.push(...recurrentInstances);
  
  // ❌ PROBLEMA: También incluía el evento maestro
  const masterEvent = normalizeApiEvent(item);
  if (masterEvent) {
    const masterDate = new Date(masterEvent.date);
    if (masterDate >= rangeStart && masterDate <= rangeEnd) {
      allEvents.push(masterEvent);
    }
  }
}

// DESPUÉS (sin duplicados):
if (item.is_recurring) {
  const recurrentInstances = generateRecurrentInstances(item, rangeStart, rangeEnd);
  allEvents.push(...recurrentInstances);
  
  // ✅ SOLUCIÓN: NO incluir el evento maestro para evitar duplicados
  // Las instancias generadas ya representan las ocurrencias del evento
}
```

### Estado: ✅ COMPLETAMENTE RESUELTO
- **Verificación**: Eventos recurrentes aparecen solo en los días correctos
- **Horarios correctos**: Sin duplicados con horarios incorrectos
- **Persistencia**: Funciona correctamente al cerrar y abrir la app

## ✅ **DRAG & DROP - COMPLETAMENTE FUNCIONAL**

### Problema Resuelto:
- **Síntoma**: Al hacer click en un evento existente, ya no se abría el modal de edición
- **Causa**: El `PanResponder` estaba capturando inmediatamente el touch, impidiendo que el `TouchableOpacity` padre recibiera el `onPress`
- **Solución implementada**: 
  - **Click corto (< 1 segundo)**: Abre modal de edición del evento
  - **Long press (≥ 1 segundo)**: Activa modo drag & drop para mover el evento
  - **Timer manual**: Implementado con `setTimeout` para detectar long press
  - **Lógica diferenciada**: `onPanResponderRelease` detecta si fue click o drag basado en `allowDragRef`

### Código de la Solución:
```typescript
// PanResponder que maneja tanto click como drag
const moveResponder = useRef(PanResponder.create({
  onStartShouldSetPanResponder: () => true, // Siempre capturar
  onPanResponderGrant: () => {
    // Iniciar timer de long press (1 segundo)
    longPressTimer.current = setTimeout(() => {
      allowDragRef.current = true; // Activar drag mode
      setShowGhost(true);
      setIsMoving(true);
    }, 1000);
  },
  onPanResponderRelease: (_, gesture) => {
    // Si no se activó drag mode, es click corto - abrir modal
    if (!allowDragRef.current) {
      onQuickPress(ev); // Abrir modal
      return;
    }
    // Si está en drag mode, procesar movimiento
    // ... lógica de drag
  }
}));
```

### Estado: ✅ COMPLETAMENTE FUNCIONAL
- **Click rápido**: Abre modal de edición correctamente
- **Long press**: Activa drag & drop con ghost visual
- **Drag & drop**: Funciona perfectamente en todas las vistas
- **Resize**: Los handles superior/inferior siguen funcionando
- **Cross-platform**: Funciona en Android e iOS

## ✅ **PROBLEMA DE TIMEZONE EN EVENTOS ÚNICOS - RESUELTO**

### Problema Identificado:
- **Síntoma**: Eventos únicos se movían 3 horas al cerrar/abrir la app (ej: 8:00 AM → 5:00 AM)
- **Causa**: En `normalizeApiEvent`, se usaba `startDate.getHours()` en lugar de `startDate.getUTCHours()`
- **Resultado**: Las fechas UTC se interpretaban en zona horaria local, causando desfase

### Solución Implementada:
```typescript
// ANTES (causaba desfase de 3 horas):
const totalStartMinutes = startDate.getHours() * 60 + startDate.getMinutes();

// DESPUÉS (funciona correctamente):
const totalStartMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
```

### Estado: ✅ COMPLETAMENTE RESUELTO
- **Eventos únicos**: Mantienen horario correcto al cerrar/abrir app
- **Eventos recurrentes**: No se ven afectados (ya funcionaban correctamente)
- **Consistencia**: Todos los eventos mantienen horarios correctos

## ✅ **LIBERACIÓN DE EVENTOS DE SERIE - RESUELTO**

### Problema Identificado:
- **Síntoma**: Al editar la recurrencia de un evento que viene de una serie (override), no se puede aplicar nueva recurrencia
- **Causa**: El evento liberado no tenía `series_id` local, por lo que no se detectaba como evento de serie
- **Estado**: ✅ **COMPLETAMENTE FUNCIONAL**

### Solución Implementada:
- **Detección correcta**: Eventos liberados (sin `series_id` local) que se les aplica recurrencia crean nueva serie independiente
- **Lógica diferenciada**: 
  - Evento liberado + recurrencia → Crear nueva serie independiente
  - Evento de serie + recurrencia → Liberar de serie original
  - Evento único + recurrencia → Actualizar normal
- **Limpieza automática**: El evento liberado original se elimina automáticamente
- **Resultado**: ✅ **FUNCIONA PERFECTAMENTE** - Se crean series independientes correctamente

## ✅ **SISTEMA DE CLASIFICACIÓN DE EVENTOS - DESCUBIERTO**

### Arquitectura de Eventos:
El sistema clasifica automáticamente los eventos en **3 categorías**:

1. **REGULAR** (`allEvents`):
   - Eventos únicos sin recurrencia
   - Sin `series_id` ni `original_start_utc`
   - Se muestran directamente en la interfaz

2. **SERIE** (`series`):
   - Eventos maestros con recurrencia (`is_recurring: true`)
   - Sin `series_id` (son la serie original)
   - Se procesan para generar instancias recurrentes

3. **OVERRIDE** (`overrides`):
   - Eventos liberados de una serie (`series_id` existe)
   - Tienen `original_start_utc` (horario original)
   - Se procesan como excepciones de la serie

### Lógica de Clasificación:
```typescript
if (item.series_id && item.original_start_utc) {
  // Es un override (evento liberado)
  overrides.push(item);
} else if (item.is_recurring) {
  // Es una serie recurrente (evento maestro)
  series.push(item);
} else {
  // Evento regular (único)
  allEvents.push(normalizedEvent);
}
```

### Implicaciones para Desarrolladores:
- **Consultas DB**: Los eventos con `series_id` son overrides, no eventos independientes
- **Procesamiento**: Los overrides requieren lógica especial de mapeo con sus series
- **UI**: Los overrides deben mostrarse como eventos independientes pero mantener relación con la serie

## ✅ **PROCESAMIENTO DE OVERRIDES INDEPENDIENTES - RESUELTO**

### Problema Identificado:
- **Síntoma**: Eventos liberados de una serie (overrides) no aparecían en la interfaz con `series_id` correcto
- **Causa**: El bucle de "overrides independientes" no procesaba todos los overrides, solo los que no tenían serie activa
- **Resultado**: Los overrides se clasificaban correctamente pero no se normalizaban ni agregaban a `allEvents`

### Solución Implementada:
- **Doble procesamiento**: Se agregó un segundo bucle que procesa **TODOS los overrides**, no solo los independientes
- **Normalización completa**: Cada override se normaliza con `normalizeApiEvent` incluyendo `series_id` y `original_start_utc`
- **Agregado a interfaz**: Los overrides normalizados se agregan a `allEvents` para aparecer en la UI

### Código de la Solución:
```typescript
// 🔥 NUEVO: Procesar TODOS los overrides, no solo los independientes
console.log('🎯 DEBUG RECURRENCIA - Procesando TODOS los overrides:', overrides.length);
for (const override of overrides) {
  console.log('🎯 DEBUG RECURRENCIA - Procesando override:', {
    id: override.id,
    title: override.title,
    series_id: override.series_id,
    original_start_utc: override.original_start_utc
  });
  
  const normalizedOverride = normalizeApiEvent(override);
  if (normalizedOverride) {
    console.log('🎯 DEBUG RECURRENCIA - Override normalizado (TODOS):', {
      id: normalizedOverride.id,
      title: normalizedOverride.title,
      series_id: normalizedOverride.series_id,
      original_start_utc: normalizedOverride.original_start_utc
    });
    allEvents.push(normalizedOverride);
  }
}
```

### Estado: ✅ COMPLETAMENTE FUNCIONAL
- **Overrides visibles**: Los eventos liberados aparecen correctamente en la interfaz
- **Campos correctos**: `series_id` y `original_start_utc` se mantienen en el estado local
- **Modal de borrado**: Funciona correctamente detectando eventos de serie vs eventos únicos
- **Clasificación**: El sistema de 3 categorías (REGULAR, SERIE, OVERRIDE) funciona perfectamente

## 🐛 **BUGS CONOCIDOS (NO CRÍTICOS):**
- **Datos legacy**: Eventos creados con código anterior pueden tener horarios incorrectos
- **Solución**: Eliminar eventos antiguos y crear nuevos (funcionan perfectamente)

## ✅ **PROTECCIÓN CONTRA ERRORES DE ELIMINACIÓN - IMPLEMENTADO**

### Problema Identificado:
- **Eliminación de series ya eliminadas**: Si se elimina una serie madre y luego se intenta eliminar un override de esa serie, podría causar errores
- **IDs inválidos**: Instancias generadas tienen formato `"ID_fecha"` que al convertirse a número resulta en `NaN`

### Soluciones Implementadas:
1. **Extracción correcta de ID**: Para instancias generadas (`"205_2025-09-30"`), extraer solo el ID real (`205`)
2. **Filtrado de valores inválidos**: Eliminar `NaN` y valores negativos de la lista de eventos a eliminar
3. **Validación de existencia**: Verificar que hay eventos válidos antes de proceder
4. **Logging de protección**: Mostrar advertencias cuando no se encuentran eventos válidos

### Código de Protección:
```typescript
// Extraer ID real de instancias generadas
if (typeof event.id === 'string' && event.id.includes('_')) {
  seriesId = Number(event.id.split('_')[0]);
}

// Filtrar valores inválidos
const validEvents = eventsToDelete.filter(id => !isNaN(id) && id > 0);

// Validación final
if (uniqueEvents.length === 0) {
  console.log('⚠️ No hay eventos válidos para eliminar');
  return [];
}
```

### Estado: ✅ **COMPLETAMENTE PROTEGIDO**
- **Sin crashes**: La app no se crashea al intentar eliminar series inexistentes
- **IDs correctos**: Se extraen correctamente los IDs reales de las instancias
- **Validación robusta**: Se filtran todos los valores inválidos antes de proceder

## ⚠️ **IMPLEMENTACIÓN DE ELIMINACIÓN - REVERTIDA POR CONFLICTO**

### **Problema Identificado:**
La implementación de eliminación funcionó perfectamente, pero **rompió la funcionalidad de movimiento de eventos recurrentes**. El conflicto ocurrió porque se cambió el formato de IDs de instancias generadas sin actualizar toda la lógica relacionada.

### **🔧 Funcionalidad de Eliminación Implementada (FUNCIONABA):**

#### **1. Logging y Detección de Eventos:**
```typescript
// Función para analizar qué eventos eliminar
const analyzeEventsToDelete = useCallback((event: Event | MonthEvent, deleteType: 'single' | 'series', allEvents: Event[]): number[] => {
  const eventsToDelete: number[] = [];
  
  // Clasificación correcta de eventos
  const isRecurring = 'is_recurring' in event && event.is_recurring;
  const hasSeriesId = 'series_id' in event && event.series_id;
  const isOverride = hasSeriesId && event.series_id !== event.id;
  const isSeriesOriginal = isRecurring && !isOverride;
  
  // Lógica de eliminación basada en tipo
  if (deleteType === 'single') {
    eventsToDelete.push(Number(event.id));
  } else if (deleteType === 'series') {
    if (isOverride) {
      // Eliminar serie original + todos sus overrides
      eventsToDelete.push(Number(event.series_id));
      // Buscar y agregar todos los overrides
    } else if (isSeriesOriginal) {
      // Eliminar serie + todos sus overrides
      eventsToDelete.push(Number(event.id));
      // Buscar y agregar todos los overrides
    }
  }
  
  return eventsToDelete;
}, []);
```

#### **2. Eliminación de Eventos Únicos:**
```typescript
const handleDeleteSingleEvent = useCallback(async (eventId: string) => {
  try {
    const deleteRes = await apiDeleteEvent(String(eventId));
    if (deleteRes.ok) {
      // Cerrar modales automáticamente
      setModalVisible(false);
      setDeleteModalVisible(false);
      // Limpiar estados
      setSelectedEvent(null);
      // Refrescar interfaz
      await refreshEvents();
    }
  } catch (error) {
    console.log('Error durante eliminación:', error);
  }
}, [refreshEvents]);
```

#### **3. Eliminación de Series Completas:**
```typescript
const handleDeleteConfirm = useCallback(async (deleteType: 'single' | 'series') => {
  const eventsToDelete = analyzeEventsToDelete(selectedEvent, deleteType, events);
  
  try {
    // Eliminar cada evento usando soft delete
    for (const eventId of eventsToDelete) {
      const deleteRes = await apiDeleteEvent(String(eventId));
      if (deleteRes.ok) {
        console.log(`✅ Evento ${eventId} eliminado exitosamente`);
      }
    }
    
    // Cerrar modales y refrescar
    setModalVisible(false);
    setDeleteModalVisible(false);
    await refreshEvents();
  } catch (error) {
    console.log('Error durante eliminación:', error);
  }
}, [selectedEvent, events, refreshEvents]);
```

### **🚨 CONFLICTO IDENTIFICADO - MOVIMIENTO DE EVENTOS:**

#### **Problema Raíz:**
Cuando se cambió el formato de IDs de instancias generadas de `"205_2025-09-30"` a `"205"`, **NO se actualizó la función `onMoveCommit`** que maneja el movimiento de eventos.

#### **Código Roto:**
```typescript
// En onMoveCommit (línea ~2524):
const match = String(eventToUpdate.id).match(/^(\d+)_(\d{4}-\d{2}-\d{2})$/);
const isGeneratedInstance = !!match; // ❌ SIEMPRE FALSE

if (isGeneratedInstance) {
  // Crear override para instancia generada
  const seriesId = parseInt(match[1], 10); // ❌ match[1] undefined
}
```

#### **Corrección Necesaria:**
```typescript
// CORRECCIÓN APLICADA:
const isGeneratedInstance = eventToUpdate.is_recurring === true;
const seriesId = parseInt(String(eventToUpdate.id), 10);
```

### **📋 PARA EL PRÓXIMO DESARROLLADOR:**

#### **✅ Lo que SÍ funciona (mantener):**
1. **Sistema de soft delete**: Laravel ya está configurado con `SoftDeletes`
2. **API endpoints**: `apiDeleteEvent()` funciona correctamente
3. **Lógica de clasificación**: `analyzeEventsToDelete()` es correcta
4. **Cierre automático de modales**: Funciona perfectamente

#### **⚠️ Lo que hay que tener cuidado:**
1. **NO cambiar formato de IDs** de instancias generadas sin actualizar `onMoveCommit`
2. **NO mover funciones grandes** como `fetchEventsForRange` o `refreshEvents`
3. **Mantener dependencias correctas** en `useCallback`

#### **🔧 Pasos para re-implementar eliminación:**
1. **Agregar solo las funciones nuevas** sin mover las existentes
2. **Mantener `refreshEvents` donde está** (después de `fetchEventsForRange`)
3. **Verificar que `onMoveCommit` funcione** antes de implementar eliminación
4. **Probar movimiento de eventos recurrentes** después de cada cambio

#### **🎯 Funciones que se pueden agregar sin problemas:**
- `handleDeleteSingleEvent`
- `handleDeleteConfirm` (versión async)
- `analyzeEventsToDelete`
- Logging de eliminación

#### **🚫 Funciones que NO tocar:**
- `onMoveCommit` (línea ~2507)
- `fetchEventsForRange` (línea ~1596)
- `refreshEvents` (línea ~1708)
- Lógica de generación de instancias en `generateRecurrentInstances`

### **💡 Lección Aprendida:**
**Siempre verificar que el movimiento de eventos recurrentes funcione después de cualquier cambio en la generación de instancias o IDs.** La funcionalidad de movimiento es crítica y debe probarse en cada modificación.

## ✅ **SISTEMA DE ELIMINACIÓN DE EVENTOS - COMPLETAMENTE FUNCIONAL**

### **Problema Resuelto:**
- **Modal de confirmación**: Ahora aparece correctamente para eventos de serie e instancias generadas
- **Eliminación completa**: "Toda la secuencia" elimina serie madre + todos los hijos + todas las instancias generadas
- **Detección correcta**: Las instancias generadas (formato `"ID_fecha"`) se detectan correctamente

### **Soluciones Implementadas:**

#### **1. Detección de Instancias Generadas:**
```typescript
// En handleDeleteEvent
const isGeneratedInstance = typeof selectedEvent.id === 'string' && selectedEvent.id.includes('_');
const isFromSeries = hasRecurrenceFields && selectedEvent.is_recurring && !isGeneratedInstance;

if (hasRecurrence || belongsToSeries || isGeneratedInstance || isFromSeries) {
  setDeleteModalVisible(true); // Mostrar modal de confirmación
}
```

#### **2. Series ID en Instancias Generadas:**
```typescript
// En generateRecurrentInstances
const instance: Event = {
  id: `${masterEvent.id}_${currentDate.toISOString().split('T')[0]}`,
  // ... otros campos
  series_id: masterEvent.id, // 🔥 NUEVO: Agregar series_id
  original_start_utc: masterEvent.start_utc,
};
```

#### **3. Eliminación Completa de Series:**
```typescript
// En analyzeEventsToDelete - Buscar todos los overrides (incluyendo instancias generadas)
const overrides = allEvents.filter(ev => {
  // Overrides reales con series_id
  if ('series_id' in ev && ev.series_id === seriesId) return true;
  // Instancias generadas con formato "ID_fecha"
  if (typeof ev.id === 'string' && ev.id.includes('_')) {
    const instanceSeriesId = Number(ev.id.split('_')[0]);
    return instanceSeriesId === seriesId;
  }
  return false;
});
```

### **Estado: ✅ COMPLETAMENTE FUNCIONAL**
- **Modal de confirmación**: Aparece para eventos de serie e instancias generadas
- **Eliminación individual**: Funciona para eventos únicos
- **Eliminación de serie completa**: Elimina serie madre + todos los hijos + todas las instancias
- **Sin conflictos**: No afecta el movimiento de eventos recurrentes

---

## 🎯 **SOLUCIÓN DE EXCEPCIONES DE RECURRENCIA - OCTUBRE 2025**

### **Problema Identificado:**
1. **Regeneración de secuencias**: Al eliminar un override, la secuencia original se regeneraba, recreando el espacio vacío
2. **Eliminación de instancias**: No se podían eliminar cuadraditos individuales de series recurrentes

### **🔧 Solución Implementada:**

#### **Backend (Laravel):**
```php
// EventController::destroy() - Crear excepción de recurrencia para overrides
if ($event->series_id && $event->original_start_utc) {
    DB::table('recurrence_exceptions')->insert([
        'event_id' => $event->series_id,
        'exception_date' => \Carbon\Carbon::parse($event->original_start_utc)->toDateString(),
        'is_deleted' => true,
        'reason' => 'Override deleted',
        'created_at' => now()
    ]);
}
```

#### **Frontend (React Native):**
```typescript
// generateRecurrentInstances() - Excluir instancias con excepciones
const isExcluded = masterEvent.recurrence_exceptions && 
  masterEvent.recurrence_exceptions.some((exception: any) => {
    const exceptionDate = new Date(exception.exception_date).toISOString().split('T')[0];
    return exceptionDate === instanceDateString && exception.is_deleted;
  });

// handleDeleteConfirm() - Convertir instancias en overrides para eliminación
if (isInstance) {
  // Crear override con datos de la instancia
  const overridePayload = { /* datos de la instancia */ };
  const createRes = await apiPostEvent(overridePayload);
  // Eliminar el override recién creado
  await apiDeleteEvent(overrideData.data.id);
}
```

### **✅ Resultados:**
- **Huecos persistentes**: Los espacios vacíos se mantienen después de eliminar overrides
- **Eliminación individual**: Se pueden eliminar cuadraditos específicos de series
- **Compatibilidad total**: No afecta la funcionalidad existente de recurrencia
- **Base de datos**: Tabla `recurrence_exceptions` maneja las excepciones correctamente

### **Estado: ✅ COMPLETAMENTE FUNCIONAL**
- **Eliminación de overrides**: Mantiene huecos sin regeneración
- **Eliminación de instancias**: Funciona para cualquier cuadradito de serie
- **Sistema robusto**: Maneja correctamente fechas, horas y excepciones

## ✅ **PROBLEMA DE HITBOX EN EVENTOS EXPANDIDOS - RESUELTO**

### **Problema Identificado:**
- **Síntoma**: Eventos expandidos (redimensionados) no eran clickeables en toda su área visual
- **Causa**: El `EventResizableBlock` solo se renderizaba en la celda donde empezaba el evento, no en las celdas adicionales ocupadas
- **Resultado**: Al hacer clic en el área expandida, se creaban nuevos eventos en lugar de editar el existente

### **Solución Implementada:**
```typescript
// 🔧 FIX: Verificar si hay un evento que ocupa esta celda
let hasOccupyingEvent = !!event;
if (!event) {
  // Buscar eventos que empiezan antes y ocupan esta celda
  for (let i = 0; i < 48; i++) {
    const checkTime = startTime - (i * 30);
    if (checkTime < 0) break;
    
    const checkKey = `${dateKey}-${checkTime}`;
    const checkEvent = eventsByCell[checkKey];
    if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {
      hasOccupyingEvent = true;
      break;
    }
  }
}

// 🔧 FIX: Solo ejecutar handleCellPress si NO hay evento ocupando esta celda
if (!hasOccupyingEvent) {
  handleCellPress(dayIndex, timeIndex);
} else {
  // 🔧 FIX TEMPORAL: Si hay un evento ocupando la celda, abrir su modal
  const occupyingEvent = eventsByCell[lookupKey] || 
    Object.values(eventsByCell).find(ev => 
      ev.startTime <= startTime && (ev.startTime + ev.duration) > startTime
    );
  if (occupyingEvent) {
    onQuickPress(occupyingEvent);
  }
}
```

### **Estado: ✅ COMPLETAMENTE FUNCIONAL**
- **Eventos expandidos clickeables**: Ahora se puede hacer clic en cualquier parte del evento expandido
- **Modal de edición**: Se abre correctamente al hacer clic en el área expandida
- **Solución robusta**: Funciona tanto para eventos únicos como recurrentes
- **Sin duplicación**: No se crean eventos duplicados al hacer clic en el área expandida

## ✅ **BUG DE EVENTOS "PEGADOS" EN MISMA FILA - RESUELTO**

### **Problema Identificado:**
- **Síntoma**: Múltiples eventos en la misma fila horizontal abrían el modal del primer evento encontrado
- **Causa**: La lógica de búsqueda de eventos ocupantes encontraba el primer evento que cumplía la condición, no el evento correcto
- **Resultado**: Al hacer clic en "Test 2" se abría el modal de "Test 1"

### **Solución Implementada:**
```typescript
// 🔧 FIX: Capturar el evento correcto específico
let hasOccupyingEvent = !!event;
let occupyingEvent = event;

if (!event) {
  // Buscar eventos que empiezan antes y ocupan esta celda
  for (let i = 0; i < 48; i++) {
    const checkTime = startTime - (i * 30);
    if (checkTime < 0) break;
    
    const checkKey = `${dateKey}-${checkTime}`;
    const checkEvent = eventsByCell[checkKey];
    if (checkEvent && checkEvent.startTime <= startTime && (checkEvent.startTime + checkEvent.duration) > startTime) {
      hasOccupyingEvent = true;
      occupyingEvent = checkEvent; // 🔥 NUEVO: Capturar el evento específico
      break;
    }
  }
}

// 🔧 FIX: Usar el evento correcto sin búsqueda duplicada
if (occupyingEvent) {
  onQuickPress(occupyingEvent);
}
```

### **Estado: ✅ COMPLETAMENTE FUNCIONAL**
- **Eventos independientes**: Cada evento abre su modal correcto independientemente de la posición
- **Sin "pegado"**: Los eventos no se interfieren entre sí en la misma fila
- **Funcionamiento robusto**: Funciona correctamente al mover y reorganizar eventos
- **Detección precisa**: El sistema identifica correctamente qué evento está siendo clickeado

## ✅ **MEJORAS DE INTERFAZ - DICIEMBRE 2025**

### **Problema Resuelto: Accesibilidad del Botón de Borrar**
- **Síntoma**: El botón de borrar evento quedaba oculto detrás de los botones de navegación del celular
- **Causa**: Falta de padding inferior en el modal de eventos
- **Solución**: Agregado padding de 100px en la parte inferior del modal

### **Opciones de Configuración Comentadas**
- **Data**: Comentada temporalmente (TODO: implementar)
- **Tempo**: Comentada temporalmente (TODO: implementar) 
- **Lembrete**: Comentada temporalmente (TODO: implementar)
- **Tag**: Comentada temporalmente (TODO: implementar)
- **Repetir**: Mantenida activa (funcional)

### **Código Implementado:**
```typescript
// Padding adicional para evitar que el botón de borrar quede oculto
<View style={styles.bottomPadding} />

// Estilo del padding
bottomPadding: {
  height: 100, // Espacio suficiente para los botones de navegación del celular
  backgroundColor: 'transparent'
},

// Opciones comentadas con TODO
{/* TODO: Implementar opciones de configuración - comentado temporalmente */}
{/* <TouchableOpacity style={styles.configRow}>
  <Ionicons name="calendar-outline" size={20} color={Colors.light.tint} />
  <Text style={styles.configLabel}>Data</Text>
  <Text style={styles.configValue}>Hoje</Text>
  <Ionicons name="chevron-forward" size={16} color="#ccc" />
</TouchableOpacity> */}
```

### **Estado: ✅ COMPLETAMENTE FUNCIONAL**
- **Botón de borrar accesible**: Ahora se puede hacer clic sin problemas
- **Opciones organizadas**: Solo se muestran las opciones implementadas
- **Código preparado**: Las opciones comentadas están listas para implementar
- **UX mejorada**: Interfaz más limpia y funcional

---

## ✅ **SISTEMA DE SUBTAREAS EN EVENTOS RECURRENTES - COMPLETADO (Octubre 27, 2025)**

### **Problema Resuelto:**
Las subtareas en eventos recurrentes ahora funcionan correctamente con soporte completo para instancias virtuales y modificaciones por día específico.

### **Funcionalidades Implementadas:**

#### **1. Modal de Confirmación:**
- **"Solo este día"**: Aplica cambios solo a la instancia específica (agrega/elimina subtareas)
- **"Toda la serie"**: Aplica cambios a todos los días de la recurrencia

#### **2. Subtareas Master vs Custom:**
- **Master Subtasks**: Subtareas del evento maestro que se heredan en todas las instancias
- **Custom Subtasks**: Subtareas específicas de una instancia particular
- **Subtask Instances**: Estado de completado por instancia (overridden para ocultar master subtasks)

#### **3. Arquitectura de Base de Datos:**
```sql
-- Subtareas del evento maestro
subtasks (id, event_id, text, sort_order, deleted_at)

-- Estado de completado por instancia + ocultamiento
subtask_instances (id, subtask_id, event_instance_id VARCHAR(255), completed, overridden)

-- Subtareas únicas de una instancia específica
custom_subtasks (id, event_instance_id VARCHAR(255), text, completed, sort_order)
```

#### **4. IDs Virtuales:**
- Instancias recurrentes usan formato `"MASTER_ID_FECHA"` (ej: `"692_2025-10-29"`)
- `event_instance_id` soporta tanto IDs numéricos como virtuales mediante `VARCHAR(255)`
- Validación en backend extrae `series_id` de IDs virtuales para permisos

#### **5. Backend (Laravel):**
- `SubtaskInstanceController::hideSubtaskForInstance`: Oculta subtareas master en instancias específicas usando `overridden=true`
- `SubtaskInstanceController::getSubtasksForInstance`: Filtra subtareas ocultas y combina master + custom
- `SubtaskInstanceController::storeCustomSubtask`: Crea subtareas únicas para instancias específicas
- Migraciones para cambiar `event_instance_id` a `VARCHAR(255)` con `onDelete('SET NULL')`

#### **6. Frontend (React Native):**
- `handleApplySubtaskChangesToThisDay`: Crea custom subtasks y oculta master subtasks solo para la instancia
- `handleApplySubtaskChangesToSeries`: Modifica el evento maestro afectando toda la serie
- `handleDeleteSubtask`: NO elimina del servidor inmediatamente para instancias recurrentes (espera confirmación del modal)
- `detectSubtaskStructuralChanges`: Detecta cambios en estructura (agregar/eliminar/modificar) vs cambios de estado (checkbox)

### **Flujo de Uso:**
1. Usuario edita subtareas en una instancia recurrente (ej: miércoles)
2. Al guardar, aparece modal: "Solo este día" vs "Toda la serie"
3. **Solo este día**: 
   - Subtareas agregadas → se crean como `custom_subtasks` para esa instancia
   - Subtareas eliminadas → se marcan con `overridden=true` en `subtask_instances`
   - Otras instancias (jueves, viernes, etc.) NO se afectan
4. **Toda la serie**:
   - Subtareas agregadas → se agregan al evento maestro
   - Subtareas eliminadas → se eliminan del evento maestro (soft delete)
   - Todas las instancias reflejan los cambios

### **Estado: ✅ 100% FUNCIONAL**
- ✅ Subtareas en eventos únicos
- ✅ Subtareas en eventos recurrentes
- ✅ Modal de confirmación funcional
- ✅ "Solo este día" funciona correctamente
- ✅ "Toda la serie" funciona correctamente
- ✅ Sin duplicación de subtareas
- ✅ Estado de completado se preserva correctamente
- ✅ IDs virtuales soportados en backend y frontend