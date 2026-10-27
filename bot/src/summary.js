// Resumen del día: se usa en el comando /estado y en el mensaje automático de las 21:30.
import { state } from './state.js';
import { dailySummary, summarySentOn, logAction, countPendingReviews } from './db.js';
import { notifyOwner } from './actions.js';
import { santiagoParts, parseHHMM } from './time.js';
import { log } from './logger.js';

export async function buildSummary(day = santiagoParts().day) {
  const rows = (await dailySummary(day)) ?? [];
  const pending = await countPendingReviews();
  const [y, m, d] = day.split('-');
  const lines = [`📊 *Resumen del ${d}-${m}-${y}*`, `Modo prueba: ${state.testMode ? '🧪 ACTIVADO' : '✅ desactivado'}`];
  if (!rows.length) lines.push('', 'No hay grupos moderados todavía.');
  for (const r of rows) {
    lines.push(
      '',
      `*${r.group_name}*`,
      `• Mensajes revisados: ${r.messages_checked}`,
      `• Borrados: ${r.deleted}  • Advertencias: ${r.warnings}  • Expulsiones: ${r.kicks}`,
      ...(r.simulated ? [`• Acciones simuladas (modo prueba): ${r.simulated}`] : []),
    );
  }
  if (pending) lines.push('', `🔎 Casos para revisar pendientes: ${pending}`);
  return lines.join('\n');
}

let sending = false;
let sentDay = null;

/** Se llama cada 30 s: si ya pasó la hora del resumen y no se ha enviado hoy, lo envía. */
export async function maybeSendDailySummary() {
  const s = state.settings;
  if (!s?.daily_summary_enabled || !s.owner_phone || sending) return;
  const now = santiagoParts();
  const target = parseHHMM(String(s.daily_summary_time).slice(0, 5));
  if (target === null || now.minutes < target || sentDay === now.day) return;
  sending = true;
  try {
    if (await summarySentOn(now.day)) {
      sentDay = now.day;
      return;
    }
    const ok = await notifyOwner(await buildSummary(now.day));
    if (ok) {
      sentDay = now.day;
      await logAction({ rule: 'system', action: 'info', test_mode: state.testMode, details: { type: 'daily_summary', day: now.day } });
      log.ok('Resumen diario enviado.');
    }
  } finally {
    sending = false;
  }
}
