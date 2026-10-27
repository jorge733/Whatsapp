// Sanciones: 1ª falta advertencia, penúltima "última advertencia", última expulsión.
// En modo prueba no se borra ni se expulsa: solo se registra y se avisa al dueño.
import { state } from './state.js';
import { countActiveWarnings, addWarning, logAction, addToBlacklist } from './db.js';
import { deleteMessage, kick, sendText, notifyOwner, testModeNotice } from './actions.js';
import { botIsAdmin } from './groups.js';
import { formatPhone, jidUser } from './phone.js';
import { fill } from './rules/util.js';
import { RULE_LABELS } from './rules/index.js';
import { log } from './logger.js';

const ACTION_LABEL = {
  delete: 'borrar mensaje',
  warn: 'borrar + advertencia',
  final_warn: 'borrar + última advertencia',
  kick: 'expulsar',
};

/** Decide la sanción según cuántas faltas lleva (contando esta). */
export function decideAction(faltaNumber, strikesToKick) {
  if (faltaNumber >= strikesToKick) return 'kick';
  if (faltaNumber === strikesToKick - 1) return 'final_warn';
  return 'warn';
}

// Faltas recientes: varios mensajes seguidos que rompen la misma regla (ej: un álbum de 5 fotos
// fuera de horario) cuentan como UNA sola falta; los demás solo se borran.
const recentFaults = new Map();
const FAULT_MERGE_MS = 120_000;

function isRepeatedFault(key, at) {
  const last = recentFaults.get(key);
  recentFaults.set(key, at);
  if (recentFaults.size > 5000) recentFaults.delete(recentFaults.keys().next().value);
  return last !== undefined && at - last <= FAULT_MERGE_MS;
}

// Aviso al dueño cuando el bot no es admin de un grupo (máximo una vez cada 6 horas por grupo).
const notAdminWarned = new Map();
function warnNotAdmin(group) {
  const last = notAdminWarned.get(group.id) ?? 0;
  if (Date.now() - last < 6 * 3_600_000) return;
  notAdminWarned.set(group.id, Date.now());
  notifyOwner(`⚠️ No puedo moderar *${group.wa_name}* porque no soy administrador. Hazme admin del grupo.`);
}

function mentionText(template, { who, senderJid, group, reason, falta, strikes }) {
  return fill(template, {
    usuario: `@${jidUser(senderJid)}`,
    motivo: reason,
    grupo: group.wa_name ?? '',
    faltas: falta,
    max_faltas: strikes,
    numero: formatPhone(who.phone),
  });
}

/**
 * Aplica la sanción por un mensaje que rompió una regla.
 * @param {{ group, who, senderJid, msgKey, rule, reason, excerpt, details, at }} v
 */
export async function sanctionMessage(v) {
  const { group, who, senderJid, msgKey, rule, reason, excerpt, details = {}, at = Date.now() } = v;
  const testMode = state.testMode;
  const settings = state.settings;
  const base = {
    group_id: group.id,
    group_name: group.wa_name,
    phone: who.phone ?? who.key,
    participant_jid: senderJid,
    rule,
    test_mode: testMode,
    excerpt,
  };

  // Mensajes extra de la misma falta: solo se borran.
  if (isRepeatedFault(`${group.id}|${who.key}|${rule}`, at)) {
    const ok = testMode ? true : await deleteMessage(group.wa_jid, msgKey);
    await logAction({ ...base, action: 'delete', success: ok, details: { ...details, motivo: reason, misma_falta: true } });
    return { action: 'delete' };
  }

  const strikes = settings.strikes_to_kick ?? 3;
  const falta = (await countActiveWarnings(group.id, who.key, testMode)) + 1;
  const action = decideAction(falta, strikes);
  await addWarning({ group_id: group.id, phone: who.key, rule, excerpt, test_mode: testMode });

  const info = { ...details, motivo: reason, falta, de: strikes };
  log.action(`${testMode ? '[PRUEBA] ' : ''}${group.wa_name}: ${formatPhone(who.phone ?? who.key)} — ` +
    `${RULE_LABELS[rule] ?? rule} → ${ACTION_LABEL[action]} (falta ${falta}/${strikes})`);

  if (testMode) {
    await logAction({ ...base, action: 'delete', details: info });
    await logAction({ ...base, action, details: info });
    testModeNotice(
      `• *${group.wa_name}* — ${formatPhone(who.phone ?? who.key)}\n` +
        `  Regla: ${RULE_LABELS[rule] ?? rule} (${reason})\n` +
        `  Habría hecho: ${ACTION_LABEL[action]} (falta ${falta} de ${strikes})` +
        (excerpt ? `\n  Mensaje: "${excerpt.slice(0, 80)}"` : ''),
    );
    return { action, falta };
  }

  if (!botIsAdmin(group.wa_jid)) warnNotAdmin(group);
  const deleted = await deleteMessage(group.wa_jid, msgKey);
  await logAction({ ...base, action: 'delete', success: deleted, details: info });

  const ctx = { who, senderJid, group, reason, falta, strikes };
  if (action === 'kick') {
    await sendText(group.wa_jid, mentionText(settings.msg_kick, ctx), [senderJid]);
    await kickPerson({ group, who, participantJid: senderJid, rule, reason, excerpt });
  } else {
    const template = action === 'final_warn' ? settings.msg_final_warning : settings.msg_warning;
    const sent = await sendText(group.wa_jid, mentionText(template, ctx), [senderJid]);
    await logAction({ ...base, action, success: sent, details: info });
  }
  return { action, falta };
}

/**
 * Expulsa a alguien de un grupo (respetando el modo prueba) y lo registra.
 * Si la expulsión es por acumular faltas y está activada la opción, lo agrega a la lista negra.
 */
export async function kickPerson({ group, who, participantJid, rule, reason, excerpt = null, details = {} }) {
  const testMode = state.testMode;
  const base = {
    group_id: group.id,
    group_name: group.wa_name,
    phone: who.phone ?? who.key,
    participant_jid: participantJid,
    rule,
    test_mode: testMode,
    excerpt,
  };
  log.action(`${testMode ? '[PRUEBA] ' : ''}${group.wa_name}: expulsar ${formatPhone(who.phone ?? who.key)} — ${reason}`);

  if (testMode) {
    await logAction({ ...base, action: 'kick', details: { ...details, motivo: reason } });
    testModeNotice(`• *${group.wa_name}* — ${formatPhone(who.phone ?? who.key)}\n  Habría hecho: expulsar (${reason})`);
    return true;
  }

  if (!botIsAdmin(group.wa_jid)) warnNotAdmin(group);
  const ok = await kick(group.wa_jid, participantJid);
  await logAction({ ...base, action: 'kick', success: ok, details: { ...details, motivo: reason } });

  const bySanctions = !['only_chile', 'blacklist', 'manual'].includes(rule);
  if (ok && bySanctions && state.settings.auto_blacklist_on_kick && who.phone && !state.blacklist.has(who.phone)) {
    await addToBlacklist(who.phone, `Automático: expulsado de ${group.wa_name} por acumular faltas`, 'auto');
    await logAction({ ...base, action: 'blacklist_add', details: { automatico: true } });
  }
  return ok;
}
