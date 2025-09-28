/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

DROP TABLE IF EXISTS `alarms`;
CREATE TABLE `alarms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `trigger_minutes_before` int NOT NULL,
  `method` enum('local','push','email') COLLATE utf8mb4_unicode_ci DEFAULT 'local',
  `custom_message` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `last_triggered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_enabled` (`is_enabled`),
  CONSTRAINT `alarms_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `calendars`;
CREATE TABLE `calendars` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Meu Calendário',
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#1976d2',
  `is_default` tinyint(1) DEFAULT '1',
  `is_visible` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_default` (`user_id`,`is_default`),
  CONSTRAINT `calendars_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform` enum('android','ios','web') COLLATE utf8mb4_unicode_ci NOT NULL,
  `push_token` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_platform` (`platform`),
  CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `event_categories`;
CREATE TABLE `event_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `event_categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `calendar_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `series_id` bigint unsigned DEFAULT NULL,
  `original_start_utc` datetime DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_utc` datetime NOT NULL,
  `end_utc` datetime NOT NULL,
  `all_day` tinyint(1) DEFAULT '0',
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'UTC',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `text_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#FFFFFF',
  `border_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT '0',
  `recurrence_rule` json DEFAULT NULL,
  `recurrence_end_date` date DEFAULT NULL,
  `version` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `category_id` (`category_id`),
  KEY `series_id` (`series_id`),
  KEY `idx_calendar_id` (`calendar_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_start_utc` (`start_utc`),
  KEY `idx_end_utc` (`end_utc`),
  KEY `idx_date_range` (`start_utc`,`end_utc`),
  KEY `idx_recurring` (`is_recurring`),
  KEY `idx_deleted` (`deleted_at`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`calendar_id`) REFERENCES `calendars` (`id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `events_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `event_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `events_ibfk_4` FOREIGN KEY (`series_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recurrence_exceptions`;
CREATE TABLE `recurrence_exceptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `exception_date` date NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `override_event_id` bigint unsigned DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_date` (`event_id`,`exception_date`),
  KEY `override_event_id` (`override_event_id`),
  KEY `idx_event_id` (`event_id`),
  KEY `idx_exception_date` (`exception_date`),
  CONSTRAINT `recurrence_exceptions_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recurrence_exceptions_ibfk_2` FOREIGN KEY (`override_event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_preferences`;
CREATE TABLE `user_preferences` (
  `user_id` bigint unsigned NOT NULL,
  `time_interval_minutes` int DEFAULT '30',
  `start_hour` int DEFAULT '6',
  `end_hour` int DEFAULT '22',
  `default_view` enum('day','week','month') COLLATE utf8mb4_unicode_ci DEFAULT 'week',
  `week_starts_on` enum('monday','sunday') COLLATE utf8mb4_unicode_ci DEFAULT 'monday',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Usuário',
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'America/Sao_Paulo',
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'pt-BR',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `uuid_2` (`uuid`),
  KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `alarms` (`id`, `event_id`, `trigger_minutes_before`, `method`, `custom_message`, `is_enabled`, `last_triggered_at`, `created_at`) VALUES
(1, 1, 15, 'local', NULL, 1, NULL, '2025-09-17 10:53:01'),
(2, 1, 60, 'push', NULL, 1, NULL, '2025-09-17 10:53:01');
INSERT INTO `calendars` (`id`, `user_id`, `name`, `description`, `color`, `is_default`, `is_visible`, `sort_order`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'Meu Calendário', NULL, '#1976d2', 1, 1, 0, '2025-09-17 10:53:01', '2025-09-17 10:53:01', NULL);

INSERT INTO `event_categories` (`id`, `user_id`, `name`, `color`, `icon`, `is_default`, `created_at`) VALUES
(1, 1, 'Trabalho', '#f44336', 'briefcase', 0, '2025-09-17 10:53:01'),
(2, 1, 'Pessoal', '#4caf50', 'user', 0, '2025-09-17 10:53:01'),
(3, 1, 'Saúde', '#ff9800', 'heart', 0, '2025-09-17 10:53:01'),
(4, 1, 'Estudo', '#9c27b0', 'book', 0, '2025-09-17 10:53:01'),
(5, 1, 'Outros', '#607d8b', 'circle', 1, '2025-09-17 10:53:01');
INSERT INTO `events` (`id`, `uuid`, `calendar_id`, `user_id`, `category_id`, `series_id`, `original_start_utc`, `title`, `description`, `location`, `start_utc`, `end_utc`, `all_day`, `timezone`, `color`, `text_color`, `border_color`, `is_recurring`, `recurrence_rule`, `recurrence_end_date`, `version`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '00000000-0000-0000-0000-000000000010', 1, 1, 1, NULL, NULL, 'Reunião de equipe', 'Discussão sobre projetos', NULL, '2024-01-15 14:00:00', '2024-01-15 15:00:00', 0, 'America/Sao_Paulo', NULL, '#FFFFFF', NULL, 0, NULL, NULL, 1, '2025-09-17 10:53:01', '2025-09-17 10:53:01', NULL);


INSERT INTO `user_preferences` (`user_id`, `time_interval_minutes`, `start_hour`, `end_hour`, `default_view`, `week_starts_on`, `created_at`, `updated_at`) VALUES
(1, 30, 6, 22, 'week', 'monday', '2025-09-17 10:53:01', '2025-09-17 10:53:01');
INSERT INTO `users` (`id`, `uuid`, `name`, `timezone`, `locale`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, '00000000-0000-0000-0000-000000000001', 'Usuario Demo', 'America/Sao_Paulo', 'pt-BR', '2025-09-17 10:53:01', '2025-09-17 17:41:47', NULL);


/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;