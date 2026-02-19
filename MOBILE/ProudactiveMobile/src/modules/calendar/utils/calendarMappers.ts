import type { Event } from '@/types/calendarTypes';

export function normalizeApiEvent(
  apiEvent: any,
  toDateKey: (d: Date) => string,
  userStartHour: number,
  userEndHour: number
): Event | null {
  if (!apiEvent?.id || !apiEvent?.start_utc || !apiEvent?.end_utc) {
    return null;
  }

  const startDate = new Date(apiEvent.start_utc);
  const endDate = new Date(apiEvent.end_utc);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const eventStartHour = startDate.getUTCHours();
  const eventStartMinute = startDate.getUTCMinutes();
  const eventEndHour = endDate.getUTCHours();
  const eventEndMinute = endDate.getUTCMinutes();
  const effectiveEndHour = userEndHour === 24 ? 24 : userEndHour;

  const eventStartTotalMinutes = eventStartHour * 60 + eventStartMinute;
  let eventEndTotalMinutes = eventEndHour * 60 + eventEndMinute;
  const rangeStartTotalMinutes = userStartHour * 60;
  const rangeEndTotalMinutes = effectiveEndHour === 24 ? 24 * 60 : effectiveEndHour * 60;

  const crossesDay =
    startDate.getUTCFullYear() !== endDate.getUTCFullYear() ||
    startDate.getUTCMonth() !== endDate.getUTCMonth() ||
    startDate.getUTCDate() !== endDate.getUTCDate();
  if (crossesDay) {
    eventEndTotalMinutes += 24 * 60;
  }

  const isCompletelyBeforeRange = eventEndTotalMinutes < rangeStartTotalMinutes;
  const isCompletelyAfterRange = eventStartTotalMinutes >= rangeEndTotalMinutes;
  if (isCompletelyBeforeRange || isCompletelyAfterRange) {
    return null;
  }

  const totalStartMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
  const minutesFromCalendarStart = totalStartMinutes - userStartHour * 60;
  const snappedStart = Math.max(0, Math.floor(minutesFromCalendarStart / 30) * 30);

  const rawDuration = Math.max(30, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  const snappedDuration = Math.max(30, Math.round(rawDuration / 30) * 30);

  return {
    id: String(apiEvent.id),
    title: apiEvent.title ?? 'Sin título',
    description: apiEvent.description ?? undefined,
    color: apiEvent.color || '#6b53e2',
    category: apiEvent?.category?.name ?? 'General',
    date: toDateKey(startDate),
    startTime: snappedStart,
    duration: snappedDuration,
    is_recurring: apiEvent.is_recurring || false,
    recurrence_rule: apiEvent.recurrence_rule || null,
    recurrence_end_date: apiEvent.recurrence_end_date || null,
    series_id: apiEvent.series_id || null,
    original_start_utc: apiEvent.original_start_utc || null,
    subtasks_total: apiEvent.subtasks_total ?? apiEvent.subtasks_count ?? 0,
    subtasks_completed: apiEvent.subtasks_completed ?? apiEvent.subtasks_completed_count ?? 0,
    subtask_status: apiEvent.subtask_status || 'none',
    master_subtasks_total: apiEvent.master_subtasks_total ?? undefined,
    instance_statuses: apiEvent.instance_statuses ?? undefined
  };
}
