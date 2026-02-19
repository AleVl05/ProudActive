export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: number; // minutos desde las 6 AM
  duration: number; // minutos
  color: string;
  category: string;
  date: string; // 'YYYY-MM-DD' -> fecha absoluta del evento
  // Campos de recurrencia
  is_recurring?: boolean;
  recurrence_rule?: string | object | null;
  recurrence_end_date?: string | null;
  // Campos para detectar si viene de una serie
  series_id?: string | number | null;
  original_start_utc?: string | null;
  // Campos de información de subtareas
  subtasks_count?: number;
  subtasks_completed_count?: number;
  subtasks_total?: number;
  subtasks_completed?: number;
  subtask_status?: 'none' | 'partial' | 'done';
  master_subtasks_total?: number;
  instance_statuses?: Array<{
    instance_date: string;
    subtasks_total: number;
    subtasks_completed: number;
    status: 'none' | 'partial' | 'done';
  }>;
}

export type RecurrenceMode = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceConfig {
  enabled: boolean;
  mode: RecurrenceMode;
  interval: number;
  weekDays: string[]; // códigos ISO-8601: 'MO', 'TU'...
  monthDays: number[]; // 1-31
  hasEndDate: boolean;
  endDate: string | null; // YYYY-MM-DD
}

export interface RecurrenceRule {
  frequency: string;
  interval: number;
  byWeekDays?: string[];
  byMonthDays?: number[];
}

export interface SelectedCell {
  dayIndex: number;
  timeIndex: number;
  startTime: number;
}

export interface SelectedMonthCell {
  dayIndex: number;
  day: number;
}

export interface SubtaskItem {
  id: string;
  text: string;
  completed: boolean;
  type?: 'master' | 'custom';
  instance_id?: string | null;
  sort_order?: number;
}
