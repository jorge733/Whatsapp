// Comandos que el dueño puede enviar al bot por mensaje privado.
import { state } from './state.js';
import {
  addToBlacklist, removeFromBlacklist, activeWarningsFor, clearWarnings, updateSettings, updateGroup,
  logAction,
} from './db.js';
import { sendText, getSocket } from './actions.js';
import { resolvePerson, rememberLid } from './identity.js';
import { syncGroups, botIsAdmin } from './groups.js';
import { buildSummary } from './summary.js';
import { normalizePhone, formatPhone, isLidJid, jidUser, pnJid } from './phone.js';
import { describeMessage } from './content.js';
import { RULE_LABELS } from './rules/index.js';
import { getConnectionInfo } from './status.js';
import { log } from './logger.js';

const HELP = [
  '🤖 *Comandos disponibles*',
  '',
  '/estado — estado del bot y resumen de hoy',
  '/grupos — grupos donde estoy',
  '/activar 2 ventas — moderar el grupo 2 con las reglas de Ventas (también: trabajos, servicios)',
  '/desactivar 2 — dejar de moderar el grupo 2',
  '/listanegra +569... motivo — agregar a la lista negra',
  '/quitar +569... — quitar de la lista negra',
  '/advertencias +569... — ver advertencias vigentes',
  '/reset +569... — borrar sus advertencias',
  '/prueba on | /prueba off — activar o desactivar el modo prueba',
].join('\n');

function sortedGroups() {
  return [...state.groupsByJid.values()].filter((g) => g.present)
    .sort((a, b) => (a.wa_name ?? '').localeCompare(b.wa_name ?? ''));
}

function groupName(id) {
  for (const g of state.groupsByJid.values()) if (g.id === id) return g.wa_name;
  return 'grupo';
}

async function run(cmd, args) {
  const phoneArg = () => normalizePhone(args[0]);

  switch (cmd) {
    case '/ayuda':
    case '/help':
    case '/comandos':
      return HELP;

    case '/estado': {
      const c = getConnectionInfo();
      return `🤖 Bot ${c.state === 'conectado' ? '🟢 conectado' : `🔴 ${c.state}`}\n\n${await buildSummary()}`;
    }

    case '/grupos': {
      await syncGroups();
      const list = sortedGroups();
      if (!list.length) return 'No estoy en ningún grupo todavía.';
      return ['📋 *Mis grupos*', '', ...list.map((g, i) =>
        `${i + 1}. *${g.wa_name}*\n    ${g.enabled && g.preset ? `✅ moderado (${g.preset})` : '⏸️ sin moderar'}` +
        `${botIsAdmin(g.wa_jid) ? '' : ' — ⚠️ no soy admin'}`),
      '', 'Para activar: /activar <número> ventas|trabajos|servicios'].join('\n');
    }

    case '/activar': {
      const g = sortedGroups()[Number(args[0]) - 1];
      const preset = (args[1] ?? '').toLowerCase();
      if (!g || !['ventas', 'trabajos', 'servicios'].includes(preset))
        return 'Uso: /activar <número de /grupos> ventas|trabajos|servicios';
      // Al cambiar la plantilla, la base de datos copia sus reglas al grupo.
      await updateGroup(g.id, { preset, enabled: true });
      await state.reload(['groups']);
      return `✅ Ahora modero *${g.wa_name}* con las reglas de "${preset}".`;
    }

    case '/desactivar': {
      const g = sortedGroups()[Number(args[0]) - 1];
      if (!g) return 'Uso: /desactivar <número de /grupos>';
      await updateGroup(g.id, { enabled: false });
      await state.reload(['groups']);
      return `⏸️ Dejé de moderar *${g.wa_name}*.`;
    }

    case '/listanegra': {
      const phone = phoneArg();
      if (!phone) return 'Uso: /listanegra +56912345678 motivo';
      const reason = args.slice(1).join(' ') || 'Agregado por WhatsApp';
      await addToBlacklist(phone, reason, 'whatsapp');
      await logAction({ phone, rule: 'blacklist', action: 'blacklist_add', test_mode: state.testMode, details: { motivo: reason, origen: 'whatsapp' } });
      await state.reload(['blacklist']); // dispara la expulsión de los grupos
      return `⛔ ${formatPhone(phone)} quedó en la lista negra. Si está en algún grupo moderado, lo expulsaré.`;
    }

    case '/quitar': {
      const phone = phoneArg();
      if (!phone) return 'Uso: /quitar +56912345678';
      const removed = await removeFromBlacklist(phone);
      await state.reload(['blacklist']);
      if (!removed?.length) return `${formatPhone(phone)} no estaba en la lista negra.`;
      await logAction({ phone, rule: 'blacklist', action: 'blacklist_remove', test_mode: state.testMode, details: { origen: 'whatsapp' } });
      return `✅ ${formatPhone(phone)} salió de la lista negra.`;
    }

    case '/advertencias': {
      const phone = phoneArg();
      if (!phone) return 'Uso: /advertencias +56912345678';
      const list = (await activeWarningsFor(phone)) ?? [];
      const lines = [`📋 *${formatPhone(phone)}*`, state.blacklist.has(phone) ? '⛔ Está en la lista negra' : ''];
      if (!list.length) lines.push('Sin advertencias vigentes.');
      const byGroup = new Map();
      for (const w of list) byGroup.set(w.group_id, [...(byGroup.get(w.group_id) ?? []), w]);
      for (const [gid, ws] of byGroup) {
        lines.push(`*${groupName(gid)}*: ${ws.length} advertencia(s)`);
        for (const w of ws) lines.push(`  • ${RULE_LABELS[w.rule] ?? w.rule} — ${new Date(w.created_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}`);
      }
      return lines.filter(Boolean).join('\n');
    }

    case '/reset': {
      const phone = phoneArg();
      if (!phone) return 'Uso: /reset +56912345678';
      await clearWarnings(phone);
      await logAction({ phone, rule: 'manual', action: 'reset', test_mode: state.testMode, details: { origen: 'whatsapp' } });
      return `🧹 Borré las advertencias de ${formatPhone(phone)} en todos los grupos.`;
    }

    case '/prueba': {
      const v = (args[0] ?? '').toLowerCase();
      if (!['on', 'off'].includes(v)) return `Modo prueba: ${state.testMode ? 'ACTIVADO 🧪' : 'desactivado ✅'}\nUso: /prueba on | /prueba off`;
      await updateSettings({ test_mode: v === 'on' });
      await state.reload(['settings']);
      return v === 'on'
        ? '🧪 Modo prueba ACTIVADO: no borraré ni expulsaré, solo te avisaré lo que habría hecho.'
        : '✅ Modo prueba DESACTIVADO: desde ahora borro, advierto y expulso de verdad.';
    }

    default:
      return null;
  }
}

/**
 * ¿El mensaje privado viene del dueño? WhatsApp a veces muestra un identificador oculto (LID)
 * en vez del número; en ese caso se le pregunta a WhatsApp cuál es el LID del número del dueño.
 */
async function isOwner(msg, who) {
  const owner = state.settings?.owner_phone;
  if (!owner) return false;
  if (who.phone) return who.phone === owner;
  const jid = msg.key.remoteJid;
  if (!isLidJid(jid)) return false;
  try {
    const ownerLid = await getSocket()?.signalRepository?.lidMapping?.getLIDForPN(pnJid(owner));
    if (ownerLid && jidUser(ownerLid) === jidUser(jid)) {
      rememberLid(jid, owner);
      return true;
    }
  } catch (e) {
    log.warn('No se pudo verificar el identificador oculto del dueño:', e?.message ?? e);
  }
  return false;
}

/** Mensaje privado recibido. Solo responde al dueño. */
export async function handlePrivateMessage(msg) {
  if (msg.key.fromMe) return;
  const text = describeMessage(msg.message).text.trim();
  if (!text.startsWith('/')) return;

  const who = await resolvePerson([msg.key.remoteJid, msg.key.remoteJidAlt, msg.key.senderPn].filter(Boolean));
  log.info(`Mensaje privado de ${formatPhone(who.phone ?? who.key)}: ${text}`);
  if (!state.settings?.owner_phone) {
    log.warn('No hay número de dueño configurado (owner_phone en la tabla settings). Se ignoró el comando.');
    return;
  }
  if (!(await isOwner(msg, who))) {
    log.info(`Comando ignorado: no viene del dueño (${formatPhone(state.settings.owner_phone)}).`);
    return;
  }

  const [cmd, ...args] = text.split(/\s+/);
  let reply;
  try {
    reply = await run(cmd.toLowerCase(), args);
  } catch (e) {
    log.error('Comando:', e?.message ?? e);
    reply = '❌ Ocurrió un error al ejecutar el comando.';
  }
  await sendText(msg.key.remoteJid, reply ?? `No conozco ese comando.\n\n${HELP}`);
}
