// Revisa cada mensaje que llega a un grupo moderado y aplica las reglas.
import { state } from './state.js';
import { incrementChecked } from './db.js';
import { describeMessage, describeEdit, excerpt } from './content.js';
import { resolvePerson } from './identity.js';
import { isGroupAdmin, findParticipant, participantIds } from './groups.js';
import { santiagoParts } from './time.js';
import { RULES } from './rules/index.js';
import noLinks from './rules/noLinks.js';
import { sanctionMessage, kickPerson } from './sanctions.js';
import { log } from './logger.js';

const MAX_AGE_MS = 60 * 60 * 1000; // no actuar sobre mensajes de hace más de 1 hora
const seen = new Set();
const checkedCounter = new Map(); // group_id → cantidad

function alreadySeen(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 5000) seen.delete(seen.values().next().value);
  return false;
}

/** Guarda en la base de datos cuántos mensajes se revisaron (cada 60 s, para no escribir por cada uno). */
export function startCounterFlush() {
  setInterval(async () => {
    const entries = [...checkedCounter.entries()];
    checkedCounter.clear();
    for (const [groupId, n] of entries) await incrementChecked(groupId, n);
  }, 60_000).unref();
}

function senderIdsOf(key, groupJid) {
  const base = [key.participant, key.participantAlt].filter(Boolean);
  const p = findParticipant(groupJid, base);
  return [...new Set([...base, ...(p ? participantIds(p) : [])])];
}

export async function handleGroupMessage(msg) {
  const key = msg.key;
  const groupJid = key.remoteJid;
  if (key.fromMe || alreadySeen(key.id)) return;

  const group = state.moderatedGroup(groupJid);
  if (!group) return;

  const at = Number(msg.messageTimestamp ?? 0) * 1000 || Date.now();
  if (Date.now() - at > MAX_AGE_MS) return;

  const senderJid = key.participant;
  if (!senderJid) return;
  const ids = senderIdsOf(key, groupJid);

  // Ediciones: si alguien edita un mensaje para agregarle un enlace, se borra.
  const edit = describeEdit(msg.message);
  let info;
  let targetKey = key;
  if (edit) {
    info = { type: 'edicion', kind: 'edicion', text: edit.text, isImage: false, isReply: false, ignored: false };
    targetKey = { ...edit.key, remoteJid: groupJid, participant: senderJid, fromMe: false };
  } else {
    info = describeMessage(msg.message);
    if (info.ignored || info.isAlbumHeader) return;
  }

  checkedCounter.set(group.id, (checkedCounter.get(group.id) ?? 0) + 1);

  // Los administradores del grupo están exentos de todas las reglas.
  if (isGroupAdmin(groupJid, ids)) return;

  const who = await resolvePerson(ids);
  const text = excerpt(info.text);

  // Alguien de la lista negra que sigue en el grupo (ej: el bot no era admin cuando entró).
  if (who.phone && state.blacklist.has(who.phone)) {
    await kickPerson({ group, who, participantJid: senderJid, rule: 'blacklist', reason: 'está en la lista negra', excerpt: text });
    return;
  }

  const ctx = { group, who, info, at, now: santiagoParts(new Date(at)), msgId: key.id };
  const rules = edit ? [noLinks] : RULES;
  for (const rule of rules) {
    let violation = null;
    try {
      violation = await rule.check(ctx);
    } catch (e) {
      log.error(`Regla ${rule.id}:`, e?.message ?? e);
    }
    if (violation) {
      await sanctionMessage({
        group, who, senderJid, msgKey: targetKey, rule: rule.id, reason: violation.reason,
        excerpt: text, details: violation.details, at,
      });
      return;
    }
  }
}
