# Proudactive - Aplicativo de Produtividade


## Codigos para terminal

 INICIAR:
  cd MOBILE/ProudactiveMobile // VE A LA CARPETA DE MOBILE
  npx expo start // INICIA EXPO

  Github


## Resumo do Projeto

**Proudactive** é um aplicativo completo de produtividade **MOBILE-FIRST** que combina calendário inteligente, rastreamento de atividades físicas, biblioteca pessoal de anotações e sistema de desafios gamificados. O objetivo é centralizar todas as ferramentas de produtividade em uma plataforma unificada e sincronizada.

### Estrutura do Repositório

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

**Filosofia MOBILE-FIRST**: 
- O desenvolvimento prioriza a experiência mobile
- Web é uma extensão da funcionalidade mobile
- Interface otimizada para telas pequenas primeiro
- Progressive Web App (PWA) para web

**Requisito crítico**: Web e mobile utilizam a mesma API REST e os dados devem permanecer sincronizados de forma consistente entre todas as plataformas.

## Requisitos Funcionais

### Módulos Principais

1. **Calendário** (Prioridade 1 - MVP)
   - Vista por Dia/Semana/Mês/Ano
   - Criação de blocos de 30 min arrastavéis
   - Sistema de recorrência avançado
   - Múltiplos alarmes por evento
   - Suporte completo a fusos horários

2. **Rastreador de Academia** (Prioridade 2)
   - Registro de treinos e atividades
   - Histórico de progresso
   - Métricas básicas

3. **Biblioteca/Anotações** (Prioridade 2)
   - Gerenciamento de livros e leituras
   - Sistema de anotações
   - Categorização por tags

4. **Sistema de Desafios** (Prioridade 3)
   - Gamificação de produtividade
   - Conquistas e recompensas
   - Progresso de metas

5. **Ferramentas Auxiliares** (Prioridade 3)
   - Timer Pomodoro
   - Lista de tarefas rápidas
   - Widgets personalizáveis

## Arquitetura & Stack Tecnológico

### Frontend Web
- **Framework**: React 18+
- **Padrão ES**: ES2022+ com modules
- **Bundler**: Vite (já configurado)
- **Gerenciamento de Estado**: Context API + useReducer ou Zustand
- **Estilização**: CSS Modules ou Styled Components
- **Requisições HTTP**: Axios ou Fetch API

### Mobile
- **Framework**: React Native com Expo (managed workflow)
- **Vantagens do Expo**: Setup rápido, teste fácil com Expo Go, sem configuração nativa inicial
- **Navegação**: React Navigation v6
- **Gerenciamento de Estado**: Mesmo padrão do web
- **Armazenamento Local**: AsyncStorage + SQLite (Expo SQLite)

### API Backend
- **Framework**: Laravel 10+
- **Linguagem**: PHP 8.1+
- **Servidor Web**: Nginx + PHP-FPM (produção)
- **Autenticação**: JWT (Laravel Sanctum + tymon/jwt-auth)
- **Validação**: Form Requests do Laravel
- **Documentação**: Swagger/OpenAPI automático

### Banco de Dados
- **SGBD**: MySQL 8.0+
- **Charset**: utf8mb4_unicode_ci
- **Engine**: InnoDB
- **Migrações**: Laravel Migrations
- **Seeds**: Laravel Seeders

### Autenticação
**Fluxo JWT**:
1. Login → API retorna access_token + refresh_token
2. Requests autenticados → Header: `Authorization: Bearer {token}`
3. Token expira → Usar refresh_token para renovar
4. Logout → Invalidar tokens no servidor

### Internacionalização (i18n)
- **Idioma base**: Español
- **Estrutura**: Arquivos JSON por locale
- **Localização**: `/locales/pt-BR.json`, `/locales/en-US.json`, `/locales/es-ES.json`
- **Implementação**: 
  - Web: react-i18next
  - Mobile: react-i18next
  - API: Laravel Localization


### Sistema de Recorrência Avançado

#### Tipos de Repetição
1. **Não repete** (padrão)
2. **Diariamente**
3. **Semanalmente** (com seleção de dias)
4. **Mensalmente** (mesmo dia do mês)
5. **Anualmente** (mesma data)
6. **Personalizado** (regras customizadas)


#### Exceções e Modificações
- **Excluir ocorrência**: Remove uma instância específica
- **Modificar ocorrência**: Altera apenas uma instância (cria override)
- **Modificar série**: Altera todas as ocorrências futuras

#### Eliminação de Eventos
- **Modal de confirmação** com opções:
  1. "Excluir apenas este evento"
  2. "Excluir esta e todas as futuras"
  3. "Excluir toda a série"

### Conflitos e Solapamentos
- **Comportamento**: Permitir solapamentos por padrão
- **Aviso visual**: Indicador quando há conflito de horário
- **Resolução opcional**: Sugerir horários alternativos

### Sistema de Alarmes

#### Tipos de Alarme
1. **Local**: Notificação no dispositivo
2. **Push**: Notificação push (mobile)
3. **Email**: Envio de email (futuro)


## API - Contrato e Endpoints


## Modelo de Dados MySQL

### Scripts de Criação

```sql
-- =============================================
-- PROUDACTIVE DATABASE SCHEMA
-- Versão: 1.0
-- Data: 2024-01-15
-- Charset: utf8mb4_unicode_ci
-- =============================================

-- Criar bancos para diferentes ambientes
CREATE DATABASE IF NOT EXISTS proudactive_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proudactive_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS proudactive_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar banco de desenvolvimento
USE proudactive_dev;

-- =============================================
-- TABELA: users
-- Armazena informações básicas dos usuários
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
-- TABELA: user_profiles
-- Informações estendidas e configurações do usuário
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
-- TABELA: calendars
-- Calendários dos usuários (permite múltiplos por usuário)
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
    UNIQUE KEY unique_user_default (user_id, is_default) -- Apenas um padrão por usuário
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABELA: events
-- Eventos do calendário (série master ou evento único)
-- =============================================
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    calendar_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'Redundante mas útil para queries rápidas',
    title VARCHAR(255) NOT NULL COMMENT 'Título do evento',
    description TEXT COMMENT 'Descrição detalhada do evento',
    location VARCHAR(255) COMMENT 'Local do evento',
    
    -- Datas e horários (sempre em UTC)
    start_utc DATETIME NOT NULL COMMENT 'Data/hora de início em UTC',
    end_utc DATETIME NOT NULL COMMENT 'Data/hora de fim em UTC',
    all_day TINYINT(1) DEFAULT 0 COMMENT 'Se é evento de dia inteiro',
    timezone VARCHAR(64) DEFAULT 'UTC' COMMENT 'Fuso horário original de criação',
    
    -- Aparência e categorização
    color VARCHAR(7) NULL COMMENT 'Cor personalizada (herda do calendário se NULL)',
    category VARCHAR(100) COMMENT 'Categoria/tag do evento',
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal' COMMENT 'Prioridade do evento',
    
    -- Recorrência
    is_recurring TINYINT(1) DEFAULT 0 COMMENT 'Se é um evento recorrente',
    recurrence_rule JSON COMMENT 'Regras de recorrência em formato JSON',
    recurrence_end_date DATE NULL COMMENT 'Data limite para recorrências',
    recurrence_count INT NULL COMMENT 'Número máximo de ocorrências',
    
    -- Referência para série (quando é uma instância modificada)
    series_id BIGINT UNSIGNED NULL COMMENT 'ID da série master se for override',
    original_start_utc DATETIME NULL COMMENT 'Horário original se foi modificado',
    
    -- Controle
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
-- TABELA: recurrence_exceptions
-- Exceções e modificações em séries recorrentes
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
-- TABELA: alarms
-- Alarmes e lembretes para eventos
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
-- TABELA: devices
-- Dispositivos registrados para notificações push
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
-- MÓDULOS ADICIONAIS
-- =============================================

-- TABELA: gym_entries (Rastreador de Academia)
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

-- TABELA: books (Biblioteca/Leituras)
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

-- TABELA: challenges (Sistema de Desafios/Gamificação)
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

-- TABELA: user_achievements (Conquistas dos usuários)
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

-- =============================================
-- DADOS INICIAIS (SEEDS)
-- =============================================

-- Usuário de exemplo
INSERT INTO users (email, password, name, timezone, locale) VALUES 
('admin@proudactive.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'America/Sao_Paulo', 'pt-BR'),
('usuario@exemplo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Usuário Teste', 'America/Sao_Paulo', 'pt-BR');

-- Calendários padrão
INSERT INTO calendars (user_id, name, color, is_default) VALUES 
(1, 'Pessoal', '#1976d2', 1),
(1, 'Trabalho', '#f44336', 0),
(2, 'Meu Calendário', '#4caf50', 1);

-- Eventos de exemplo
INSERT INTO events (calendar_id, user_id, title, description, start_utc, end_utc, timezone) VALUES 
(1, 1, 'Reunião de equipe', 'Discussão sobre projetos', '2024-01-15 17:00:00', '2024-01-15 18:00:00', 'America/Sao_Paulo'),
(1, 1, 'Academia', 'Treino de força', '2024-01-16 09:00:00', '2024-01-16 10:30:00', 'America/Sao_Paulo'),
(2, 1, 'Apresentação cliente', 'Demo do novo produto', '2024-01-17 19:00:00', '2024-01-17 20:00:00', 'America/Sao_Paulo');

-- Alarmes de exemplo
INSERT INTO alarms (event_id, trigger_minutes_before, method) VALUES 
(1, 15, 'local'),
(1, 60, 'push'),
(2, 30, 'local'),
(3, 1440, 'push'); -- 1 dia antes

-- Livros de exemplo
INSERT INTO books (user_id, title, author, status, pages_total) VALUES 
(1, 'Hábitos Atômicos', 'James Clear', 'reading', 320),
(1, 'O Poder do Agora', 'Eckhart Tolle', 'finished', 256),
(2, 'Mindset', 'Carol Dweck', 'to-read', 288);

-- Desafios de exemplo
INSERT INTO challenges (user_id, title, description, type, category, target_value, unit, start_date, end_date) VALUES 
(1, 'Ler 30 minutos por dia', 'Criar o hábito de leitura diária', 'daily', 'learning', 30, 'minutos', '2024-01-01', '2024-01-31'),
(1, 'Treinar 3x na semana', 'Manter regularidade nos exercícios', 'weekly', 'health', 3, 'treinos', '2024-01-01', '2024-03-31');
```


### Diagrama de Relacionamentos (ASCII)

```

## Internacionalização e Conteúdo Traduzível

### Estrutura de Arquivos

```
/locales/
├── pt-BR.json    # Português brasileiro (padrão)
├── en-US.json    # Inglês americano
└── es-ES.json    # Espanhol
```

### Exemplo de Arquivo de Tradução

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
    "title": "Calendário",
    "create_event": "Criar Evento",
    "edit_event": "Editar Evento",
    "delete_event": "Excluir Evento",
    "event_title": "Título do evento",
    "event_description": "Descrição",
    "start_time": "Horário de início",
    "end_time": "Horário de término",
    "all_day": "Dia inteiro",
    "repeat": "Repetir",
    "alarms": "Lembretes",
    "delete_confirm": "Tem certeza que deseja excluir este evento?",
    "delete_series_options": {
      "this_only": "Apenas este evento",
      "this_and_future": "Este e todos os futuros",
      "entire_series": "Toda a série"
    },
    "views": {
      "day": "Dia",
      "week": "Semana", 
      "month": "Mês",
      "year": "Ano"
    },
    "repeat_options": {
      "never": "Nunca",
      "daily": "Diariamente",
      "weekly": "Semanalmente",
      "monthly": "Mensalmente",
      "yearly": "Anualmente",
      "custom": "Personalizado"
    }
  },
  "gym": {
    "title": "Academia",
    "add_workout": "Adicionar Treino",
    "activity": "Atividade",
    "duration": "Duração (min)",
    "calories": "Calorias",
    "notes": "Observações"
  }
}
```

### Implementação


## Sincronização / Consistência entre Mobile e Web

### Estratégia de Sincronização

#### 1. Autenticação Compartilhada
- **JWT único**: Mesmo token funciona em web e mobile
- **Refresh automático**: Renovação transparente antes da expiração
- **Logout global**: Invalidar token em todas as plataformas


#### 4. Suporte Offline Básico

**Mobile**:


### 2. Checklist de QA - Calendário

#### Funcionalidades Básicas
- [ ] Criar evento simples
- [ ] Editar evento existente
- [ ] Excluir evento
- [ ] Visualizar em diferentes vistas (dia/semana/mês)
- [ ] Navegação entre datas
- [ ] Arrastar para redimensionar evento
- [ ] Arrastar para mover evento

#### Recorrência
- [ ] Criar evento recorrente diário
- [ ] Criar evento recorrente semanal
- [ ] Criar evento recorrente mensal
- [ ] Modificar uma instância da série
- [ ] Excluir uma instância da série
- [ ] Excluir série completa
- [ ] Regras de recorrência personalizadas

#### Alarmes
- [ ] Adicionar alarme local
- [ ] Adicionar alarme push (mobile)
- [ ] Múltiplos alarmes por evento
- [ ] Editar/remover alarmes
- [ ] Testar disparo de notificações

#### Fusos Horários
- [ ] Criar evento em fuso diferente
- [ ] Exibir corretamente em fuso local
- [ ] Viajar para outro fuso (mudança temporária)
- [ ] Eventos all-day

#### Sincronização
- [ ] Criar evento no web, ver no mobile
- [ ] Criar evento no mobile, ver no web
- [ ] Editar evento em uma plataforma, sincronizar
- [ ] Teste offline básico (mobile)
- [ ] Resolução de conflitos

#### Performance
- [ ] Carregar calendário com 100+ eventos
- [ ] Navegação fluida entre meses
- [ ] Busca rápida por eventos
- [ ] Scroll suave na vista semanal