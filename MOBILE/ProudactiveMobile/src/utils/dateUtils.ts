import { START_HOUR, WEEK_DAY_ITEMS } from './dateConstants';

// Utilidades fecha/UTC mínimas para API
export const dateKeyToLocalDate = (dateKey: string, minutesFromStart: number) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Crear fecha directamente en UTC para evitar problemas de zona horaria
  const dt = new Date(Date.UTC(y, (m - 1), d, START_HOUR, 0, 0, 0));
  dt.setUTCMinutes(dt.getUTCMinutes() + minutesFromStart);
  return dt; // UTC Date
};

export const dateKeyToDate = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

export const formatDateKey = (dateKey: string) => {
  const d = dateKeyToDate(dateKey);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDisplayMonthYear = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const getWeekDayCode = (date: Date) => WEEK_DAY_ITEMS[date.getDay()]?.code ?? 'MO';

export const buildMonthMatrix = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rows: (number | null)[][] = [];
  let currentDay = 1;
  for (let week = 0; week < 6; week++) {
    const row: (number | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (week === 0 && dow < startOffset) {
        row.push(null);
      } else if (currentDay > daysInMonth) {
        row.push(null);
      } else {
        row.push(currentDay);
        currentDay++;
      }
    }
    rows.push(row);
  }
  return rows;
};
