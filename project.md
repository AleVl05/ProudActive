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

## Resumen del Proyecto

**Proudactive** es una aplicación completa de productividad **MOBILE-FIRST** que combina calendario inteligente, seguimiento de actividad física, biblioteca personal de notas y sistema de desafíos gamificados. El objetivo es centralizar todas las herramientas de productividad en una plataforma unificada y sincronizada.


```

## 📋 Estado del Proyecto - CHECKLIST

### ✅ **CALENDARIO - COMPLETADO**
- [x] **Vistas implementadas**: Día, Semana, Mes con navegación
- [x] **Creación de eventos**: Modal con título, descripción, color
- [x] **Sistema de recurrencia**: Modal completo con modos diario/semanal/mensual
- [x] **Redimensionar bloques**: Arrastrar para cambiar duración (vertical)
- [x] **Sincronización API**: Crear/actualizar eventos en base de datos
- [x] **Generación de instancias**: Eventos recurrentes se generan bajo demanda
- [x] **Persistencia**: Eventos se guardan y cargan desde API
- [x] **Recurrencia funcional**: ✅ **COMPLETAMENTE FUNCIONAL** - Horarios correctos, persistencia, generación de instancias
- [x] **Zona horaria**: ✅ **RESUELTO** - Sin diferencias de horario

### ❌ **CALENDARIO - PENDIENTE**
- [ ] **Recarga automática**: Mejorar para que no requiera navegar para ver nuevos eventos
- [ ] **Cargar configuración al editar**: Mostrar configuración de recurrencia al editar eventos
- [ ] **Mover bloques**: Drag & drop para cambiar horario
- [ ] **Extensión horizontal**: Bloques multi-día en vista semanal
- [ ] **Alarmas**: Sistema de notificaciones locales/push
- [ ] **Excepciones de recurrencia**: Modificar/eliminar instancias específicas

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

### 🏋️ **MÓDULOS ADICIONALES - PENDIENTE**
- [ ] **Gimnasio**: Rastreador de entrenamientos
- [ ] **Biblioteca**: Gestión de libros y notas
- [ ] **Desafíos**: Sistema de gamificación
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




















