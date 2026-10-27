// Formatos y textos en español (hora de Chile).
export const TZ = 'America/Santiago';

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}

export function fmtDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(value));
}

export function fmtTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(value));
}

/** "hace 3 min" */
export function timeAgo(value) {
  if (!value) return 'nunca';
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'hace unos segundos';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

export function todaySantiago() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
}

/** Mismas reglas que el bot: "+56 9 1234 5678" o "912345678" → "56912345678". */
export function normalizePhone(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('9')) d = `56${d}`;
  if (d.length === 8) d = `569${d}`;
  if (d.length < 8 || d.length > 15) return null;
  return d;
}

export function fmtPhone(phone) {
  if (!phone) return 'Desconocido';
  if (phone.startsWith('lid:')) return `ID oculto ${phone.slice(4)}`;
  const m = /^56(9)(\d{4})(\d{4})$/.exec(phone);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : `+${phone}`;
}

export const RULE_LABELS = {
  only_chile: 'Número no chileno',
  no_links: 'Enlace',
  schedule: 'Fuera de horario',
  max_photos: 'Demasiadas fotos',
  post_limit: 'Límite de publicaciones',
  blacklist: 'Lista negra',
  manual: 'Decisión manual',
  system: 'Sistema',
};

export const ACTION_LABELS = {
  delete: 'Mensaje borrado',
  warn: 'Advertencia',
  final_warn: 'Última advertencia',
  kick: 'Expulsión',
  review: 'Enviado a revisar',
  blacklist_add: 'Agregado a lista negra',
  blacklist_remove: 'Quitado de lista negra',
  reset: 'Advertencias borradas',
  info: 'Información',
  error: 'Error',
};

export const PRESET_LABELS = {
  ventas: 'Ventas',
  trabajos: 'Trabajos',
  servicios: 'Servicios',
};

/** Estado del bot a partir del latido. */
export function botHealth(status) {
  const beat = status?.last_heartbeat ? new Date(status.last_heartbeat).getTime() : 0;
  const alive = Date.now() - beat < 3 * 60_000;
  if (!alive) return { key: 'apagado', label: 'Bot apagado', tone: 'red', detail: `Último latido ${timeAgo(status?.last_heartbeat)}` };
  switch (status.wa_state) {
    case 'conectado':
      return { key: 'ok', label: 'Conectado', tone: 'green', detail: `Latido ${timeAgo(status.last_heartbeat)}` };
    case 'esperando_qr':
      return { key: 'qr', label: 'Esperando QR', tone: 'amber', detail: 'Escanea el código con el WhatsApp del bot' };
    case 'sesion_cerrada':
      return { key: 'qr', label: 'Sesión cerrada', tone: 'red', detail: 'Hay que vincular WhatsApp de nuevo' };
    default:
      return { key: 'desconectado', label: 'Desconectado de WhatsApp', tone: 'red', detail: status.last_error ?? 'Reintentando…' };
  }
}
