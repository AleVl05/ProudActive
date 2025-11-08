// Constantes de fecha y calendario
export const WEEK_DAY_ITEMS = [
  { code: 'SU', short: 'D', label: 'Dom' },
  { code: 'MO', short: 'L', label: 'Lun' },
  { code: 'TU', short: 'M', label: 'Mar' },
  { code: 'WE', short: 'X', label: 'Mié' },
  { code: 'TH', short: 'J', label: 'Jue' },
  { code: 'FR', short: 'V', label: 'Vie' },
  { code: 'SA', short: 'S', label: 'Sáb' },
];

export const WEEK_DAY_CODES = WEEK_DAY_ITEMS.map(item => item.code);

export const WEEK_DAY_LABEL_BY_CODE = WEEK_DAY_ITEMS.reduce<Record<string, string>>((acc, item) => {
  acc[item.code] = item.label;
  return acc;
}, {});

export const WEEK_DAY_SHORT_BY_CODE = WEEK_DAY_ITEMS.reduce<Record<string, string>>((acc, item) => {
  acc[item.code] = item.short;
  return acc;
}, {});

export const MONTH_DAY_ITEMS = Array.from({ length: 31 }, (_, i) => i + 1);
export const MONTH_WEEKDAY_HEADERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// Constantes de tiempo
export const CELL_HEIGHT = 50; // 30 minutos = 50px
export const START_HOUR = 6;
export const END_HOUR = 24;
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
