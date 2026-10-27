// Utilidades de fecha y hora en la zona horaria de Chile.
export const TZ = 'America/Santiago';

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

/** Descompone una fecha en sus partes según la hora de Santiago. */
export function santiagoParts(date = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return {
    day: `${p.year}-${p.month}-${p.day}`, // YYYY-MM-DD
    hour,
    minute,
    second: Number(p.second),
    minutes: hour * 60 + minute, // minutos desde medianoche
    hhmm: `${p.hour}:${p.minute}`,
  };
}

/** "08:30" → 510. Devuelve null si el formato no es válido. */
export function parseHHMM(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/**
 * ¿Está "minutes" dentro del horario [start, end)? Soporta horarios que cruzan la medianoche.
 * Si el horario es inválido, se considera permitido (no castigar por un error de configuración).
 */
export function isWithinSchedule(minutes, start, end) {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (s === null || e === null || s === e) return true;
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e;
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Fecha y hora legible en Chile, ej: "27-10-2026 14:05". */
export function formatSantiago(date = new Date()) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}
