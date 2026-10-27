// Control de quienes entran a los grupos: lista negra y "solo números chilenos".
// Si WhatsApp oculta el número (LID) y no se puede averiguar, NO se expulsa: se crea un caso para revisar.
import { state } from './state.js';
import { openReviewCase, logAction } from './db.js';
import { resolvePerson } from './identity.js';
import { refreshGroup, cachedMetadata, participantIds, isGroupAdmin, syncGroups, findParticipant } from './groups.js';
import { kickPerson } from './sanctions.js';
import { notifyOwner, getSocket } from './actions.js';
import { isChilean, formatPhone, jidUser } from './phone.js';
import { log } from './logger.js';

function idsOf(p) {
  return typeof p === 'string' ? [p] : participantIds(p);
}

function isMe(ids) {
  const me = getSocket()?.user;
  const mine = new Set([me?.id, me?.lid, me?.phoneNumber].filter(Boolean).map(jidUser));
  return ids.some((x) => mine.has(jidUser(x)));
}

/** Revisa a una persona que está en (o acaba de entrar a) un grupo moderado. */
export async function checkMember(group, eventIds, { onJoin }) {
  // Suma los identificadores que WhatsApp entregó en la información del grupo (a veces trae el número real).
  const p = findParticipant(group.wa_jid, eventIds);
  const ids = [...new Set([...eventIds, ...(p ? participantIds(p) : [])])];
  if (isMe(ids) || isGroupAdmin(group.wa_jid, ids)) return;
  const who = await resolvePerson(ids);
  const participantJid = ids[0];

  if (who.phone && state.blacklist.has(who.phone)) {
    await kickPerson({ group, who, participantJid, rule: 'blacklist', reason: 'está en la lista negra' });
    return;
  }
  if (!onJoin || !group.rules?.only_chile?.enabled) return;

  if (who.phone) {
    if (!isChilean(who.phone)) {
      await kickPerson({ group, who, participantJid, rule: 'only_chile', reason: 'el número no es chileno (+56)' });
    }
    return;
  }

  // No se pudo saber el número real.
  const created = await openReviewCase({
    group_id: group.id,
    participant_jid: participantJid,
    phone: null,
    reason: 'Número oculto (LID): no se pudo verificar si es chileno',
    details: { ids },
  });
  if (created) {
    await logAction({
      group_id: group.id, group_name: group.wa_name, phone: who.key, participant_jid: participantJid,
      rule: 'only_chile', action: 'review', test_mode: state.testMode,
      details: { motivo: 'número oculto, enviado a casos para revisar' },
    });
    log.warn(`${group.wa_name}: entró alguien con número oculto (${who.key}). Quedó en "casos para revisar".`);
    notifyOwner(`🔎 Entró alguien a *${group.wa_name}* con número oculto y no pude verificar si es chileno. ` +
      'Lo dejé en "Casos para revisar" en el panel.');
  }
}

/** Evento de WhatsApp: alguien entró, salió, fue ascendido, etc. */
export async function handleParticipantsUpdate({ id: groupJid, participants, action }) {
  const all = participants.map(idsOf);
  if (all.some(isMe)) {
    // El bot fue agregado/ascendido/eliminado: actualizar la lista de grupos.
    await syncGroups();
    return;
  }
  await refreshGroup(groupJid);
  if (action !== 'add') return;
  const group = state.moderatedGroup(groupJid);
  if (!group) return;
  for (const ids of all) await checkMember(group, ids, { onJoin: true });
}

/** Expulsa de todos los grupos moderados a quienes estén en la lista negra. */
export async function sweepBlacklist(phones = null) {
  const targets = phones ? new Set(phones) : null;
  for (const group of state.groupsByJid.values()) {
    if (!state.moderatedGroup(group.wa_jid)) continue;
    const meta = cachedMetadata(group.wa_jid) ?? (await refreshGroup(group.wa_jid));
    for (const p of meta?.participants ?? []) {
      const ids = participantIds(p);
      if (isMe(ids) || isGroupAdmin(group.wa_jid, ids)) continue;
      const who = await resolvePerson(ids);
      if (!who.phone || !state.blacklist.has(who.phone)) continue;
      if (targets && !targets.has(who.phone)) continue;
      log.action(`Lista negra: ${formatPhone(who.phone)} está en ${group.wa_name}.`);
      await kickPerson({ group, who, participantJid: ids[0], rule: 'blacklist', reason: 'está en la lista negra' });
    }
  }
}
