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

### Estructura del Repositorio

```
Proudactive/
├── API/                    # Pasta para desenvolvimento inicial (contém schema.sql)
│   ├── backend/            # Laravel instalado aqui (composer install executado)
│   └── schema_sql/         # Scripts SQL atuais do banco
├── APILaravel/             # Laravel limpo (backup/alternativo)
├── MOBILE/                 # App React Native (Expo) - PRIORIDADE 1
│   └── ProudactiveMobile/  # Projeto Expo configurado
├── WEB/                    # Frontend React - PRIORIDADE 2
└── project.md              # Este documento (fonte da verdade)
```

**Filosofía MOBILE-FIRST**: 
- El desarrollo prioriza la experiencia mobile
- Web es una extensión de la funcionalidad mobile
- Interfaz optimizada para pantallas pequeñas primero
- Progressive Web App (PWA) para web

**Requisito crítico**: Web y mobile utilizan la misma API REST y los datos deben permanecer sincronizados de forma consistente entre todas las plataformas.

## Requisitos Funcionales

### Módulos Principales

1. **Calendario** (Prioridad 1 - MVP)
   - Vista por Día/Semana/Mes/Año
   - Creación de bloques de 30 min arrastrables
   - Sistema de recurrencia avanzado
   - Múltiples alarmas por evento
   - Soporte completo a husos horarios

2. **Rastreador de Gimnasio** (Prioridad 2)
   - Registro de entrenamientos y actividades
   - Historial de progreso
   - Métricas básicas

3. **Biblioteca/Notas** (Prioridad 2)
   - Gestión de libros y lecturas
   - Sistema de notas
   - Categorización por etiquetas

4. **Sistema de Desafíos** (Prioridad 3)
   - Gamificación de productividad
   - Logros y recompensas
   - Progreso de metas

5. **Herramientas Auxiliares** (Prioridad 3)
   - Temporizador Pomodoro
   - Lista de tareas rápidas
   - Widgets personalizables

## Estado actual (Mobile)

- Vistas implementadas: día, semana y mes, con navegación por fechas y encabezado sincronizado en semana.
- Creación/edición básica de eventos:
  - Día/Semana: tap en celda de 30 minutos abre modal; un bloque por celda; duración inicial 30 min.
  - Mes: tap en día crea evento de 1 día (estructura `MonthEvent`).
  - Selector de color, título y descripción en modal. Validación mínima (título requerido).
- Sincronización de scroll: el header de días en semana se sincroniza con el contenido horizontal.
- Cambio de vista resetea scroll; en vista día se centra en el día actual.
- Indexación en memoria para lookup rápido (`eventsByCell`, `monthEventsByDay`).

Pendiente (Mobile):
- Estirar bloques (vertical y horizontal) en vista semanal.
- Mover bloques por arrastre (drag & drop) en día/semana.
- Recurrencia avanzada, excepciones y eliminación a nivel de serie.
- Alarmas locales/push y editor de múltiples alarmas.
- Husos horarios, eventos all-day y conversiones a/local.
- Sincronización con API real (persistencia remota) y soporte offline básico.
- Accesibilidad y rendimiento con muchos eventos.

## Plan para estirar bloques (vista semanal)

- Objetivo
  - **Vertical**: ajustar la duración del evento en pasos de 30 min al arrastrar el borde superior/inferior del bloque.
  - **Horizontal**: extender el evento a días contiguos arrastrando lateralmente (cada día añadido crea/ocupa su celda correspondiente).

- Modelo de datos (MVP)
  - Mantener `Event` acotado al día: `date` + `startTime` + `duration` (min).
  - Para extensión horizontal, crear "slices" por cada día adicional con el mismo `id` de grupo o un `parentId` común para agrupar visualmente.
  - Alternativa futura: campo `spanDays` o entidad de serie de bloque para semana.

- UX/Interacción
  - Mostrar "handles" de 6–8 px en borde superior/inferior para redimensionar verticalmente; todo el bloque actúa como handle horizontal.
  - Snap-to-grid de 30 min; duración mínima 30 min. Limitar entre `START_HOUR` y `END_HOUR`.
  - Permitir solapamientos; resaltar el bloque activo con mayor `zIndex` y borde.
  - Auto-scroll cuando el arrastre se acerca a bordes (vertical u horizontal).

- Detección de gestos
  - Usar `react-native-gesture-handler` (PanGestureHandler) para arrastre continuo sin jitter.
  - Calcular delta en píxeles y convertir a intervalos de 30 min (vertical) o a columnas de día (horizontal).

- Persistencia
  - Fase 1: actualizar estado en memoria (`setEvents`) y, para multi-día, crear/actualizar slices adyacentes.
  - Fase 2: normalizar en API (series/slices) y reconciliar con recurrencia.

- Casos límite
  - Extender más allá de la semana visible → navegación a semana siguiente previa confirmación.
  - Bloques al inicio/fin de la jornada (`START_HOUR`–`END_HOUR`).
  - Cambios de mes en vista semana (solo afecta visual).

- Checklist (estirar bloques)
  - [ ] Handles visibles y estados de interacción
  - [ ] Redimensionado vertical con snap a 30 min
  - [ ] Extensión horizontal día a día
  - [ ] Auto-scroll en bordes
  - [ ] Agrupación visual de slices multi-día
  - [ ] Persistencia temporal en memoria

## Arquitectura y Stack Tecnológico

### Frontend Web
- **Framework**: React 18+
- **Estándar ES**: ES2022+ con modules
- **Bundler**: Vite (ya configurado)
- **Gestión de Estado**: Context API + useReducer o Zustand
- **Estilos**: CSS Modules o Styled Components
- **Peticiones HTTP**: Axios o Fetch API

### Mobile
- **Framework**: React Native con Expo (managed workflow)
- **Ventajas de Expo**: Setup rápido, test fácil con Expo Go, sin configuración nativa inicial
- **Navegación**: React Navigation v6
- **Gestión de Estado**: Mismo patrón que web
- **Almacenamiento Local**: AsyncStorage + SQLite (Expo SQLite)

### API Backend
- **Framework**: Laravel 10+
- **Lenguaje**: PHP 8.1+
- **Servidor Web**: Nginx + PHP-FPM (producción)
- **Autenticación**: JWT (Laravel Sanctum + tymon/jwt-auth)
- **Validación**: Form Requests de Laravel
- **Documentación**: Swagger/OpenAPI automático

### Base de Datos
- **SGBD**: MySQL 8.0+
- **Charset**: utf8mb4_unicode_ci
- **Engine**: InnoDB
- **Migraciones**: Laravel Migrations
- **Seeds**: Laravel Seeders

### Autenticación
**Flujo JWT**:
1. Login → API retorna access_token + refresh_token
2. Requests autenticadas → Header: `Authorization: Bearer {token}`
3. Token expira → Usar refresh_token para renovar
4. Logout → Invalidar tokens en el servidor

### Internacionalización (i18n)
- **Idioma base**: Español
- **Estructura**: Archivos JSON por locale
- **Localización**: `/locales/pt-BR.json`, `/locales/en-US.json`, `/locales/es-ES.json`
- **Implementación**: 
  - Web: react-i18next
  - Mobile: react-i18next
  - API: Laravel Localization


### Sistema de Recurrencia Avanzado

#### Tipos de Repetición
1. **No repite** (por defecto)
2. **Diariamente**
3. **Semanalmente** (con selección de días)
4. **Mensualmente** (mismo día del mes)
5. **Anualmente** (misma fecha)
6. **Personalizado** (reglas customizadas)


#### Excepciones y Modificaciones
- **Excluir ocurrencia**: Remueve una instancia específica
- **Modificar ocurrencia**: Cambia solo una instancia (crea override)
- **Modificar serie**: Cambia todas las ocurrencias futuras

#### Eliminación de Eventos
- **Modal de confirmación** con opciones:
  1. "Eliminar solo este evento"
  2. "Eliminar este y todos los futuros"
  3. "Eliminar toda la serie"

### Conflictos y Solapamientos
- **Comportamiento**: Permitir solapamientos por defecto
- **Aviso visual**: Indicador cuando hay conflicto de horario
- **Resolución opcional**: Sugerir horarios alternativos

### Sistema de Alarmas

#### Tipos de Alarma
1. **Local**: Notificación en el dispositivo
2. **Push**: Notificación push (mobile)
3. **Email**: Envío de email (futuro)


## API - Contrato y Endpoints


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


### Diagrama de Relaciones (ASCII)

```

## Internacionalización y Contenido Traducible

### Estructura de Archivos

```
/locales/
├── pt-BR.json    # Português brasileiro (padrão)
├── en-US.json    # Inglês americano
└── es-ES.json    # Espanhol
```

### Ejemplo de Archivo de Traducción

```json
// /locales/pt-BR.json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "edit": "Editar",
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso"
  },
  "auth": {
    "login": "Entrar",
    "register": "Cadastrar",
    "email": "E-mail",
    "password": "Senha",
    "forgot_password": "Esqueci minha senha",
    "login_success": "Login realizado com sucesso",
    "invalid_credentials": "Credenciais inválidas"
  },
  "calendar": {
    "title": "Calendario",
    "create_event": "Crear Evento",
    "edit_event": "Editar Evento",
    "delete_event": "Eliminar Evento",
    "event_title": "Título del evento",
    "event_description": "Descripción",
    "start_time": "Hora de inicio",
    "end_time": "Hora de término",
    "all_day": "Todo el día",
    "repeat": "Repetir",
    "alarms": "Recordatorios",
    "delete_confirm": "¿Seguro que deseas eliminar este evento?",
    "delete_series_options": {
      "this_only": "Apenas este evento",
      "this_and_future": "Este e todos os futuros",
      "entire_series": "Toda a série"
    },
    "views": {
      "day": "Día",
      "week": "Semana", 
      "month": "Mes",
      "year": "Año"
    },
    "repeat_options": {
      "never": "Nunca",
      "daily": "Diariamente",
      "weekly": "Semanalmente",
      "monthly": "Mensualmente",
      "yearly": "Anualmente",
      "custom": "Personalizado"
    }
  },
  "gym": {
    "title": "Gimnasio",
    "add_workout": "Agregar Entrenamiento",
    "activity": "Actividad",
    "duration": "Duración (min)",
    "calories": "Calorías",
    "notes": "Notas"
  }
}
```

### Implementación


## Sincronización / Consistencia entre Mobile y Web

### Estrategia de Sincronización

#### 1. Autenticación Compartida
- **JWT único**: Mismo token funciona en web y mobile
- **Refresh automático**: Renovación transparente antes de la expiración
- **Logout global**: Invalidar token en todas las plataformas


#### 4. Soporte Offline Básico

**Mobile**:


### 2. Checklist de QA - Calendario

#### Funcionalidades Básicas
- [ ] Crear evento simple
- [ ] Editar evento existente
- [ ] Eliminar evento
- [ ] Visualizar en diferentes vistas (día/semana/mes)
- [ ] Navegación entre fechas
- [ ] Arrastrar para redimensionar evento
- [ ] Arrastrar para mover evento

#### Recurrencia
- [ ] Crear evento recurrente diario
- [ ] Crear evento recurrente semanal
- [ ] Crear evento recurrente mensual
- [ ] Modificar una instancia de la serie
- [ ] Eliminar una instancia de la serie
- [ ] Eliminar serie completa
- [ ] Reglas de recurrencia personalizadas

#### Alarmas
- [ ] Agregar alarma local
- [ ] Agregar alarma push (mobile)
- [ ] Múltiples alarmas por evento
- [ ] Editar/remover alarmas
- [ ] Probar disparo de notificaciones

#### Husos Horarios
- [ ] Crear evento en huso diferente
- [ ] Mostrar correctamente en huso local
- [ ] Viajar a otro huso (cambio temporal)
- [ ] Eventos all-day

#### Sincronización
- [ ] Crear evento en web, ver en mobile
- [ ] Crear evento en mobile, ver en web
- [ ] Editar evento en una plataforma, sincronizar
- [ ] Test offline básico (mobile)
- [ ] Resolución de conflictos

#### Performance
- [ ] Cargar calendario con 100+ eventos
- [ ] Navegación fluida entre meses
- [ ] Búsqueda rápida por eventos
- [ ] Scroll suave en la vista semanal