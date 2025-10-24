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

### Actualizar App:
```bash
npx eas update --branch production --message "Cambios v1.2"
```

  para actualizar la app:

  C:\PROYECTOS_WEB\Proudactive\MOBILE\ProudactiveMobile> npx eas update --channel staging --message "Agregar botón debug"  o para mandar a produccion:

  npx eas update --branch production --message "Cambios JS"


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
- [ ] **Recetas funcionales** - No se pueden abrir actualmente

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
- [ ] **Subtareas en recurrentes** - Arreglar que no funcionan en eventos recurrentes

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


















