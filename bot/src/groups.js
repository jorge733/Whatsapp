// Lista de grupos donde está el bot, su información y quién es administrador.
import { state } from './state.js';
import { upsertGroups, markGroupsAbsent } from './db.js';
import { getSocket } from './actions.js';
import { rememberLid } from './identity.js';
import { jidUser } from './phone.js';
import { log } from './logger.js';

const metadata = new Map(); // jid → GroupMetadata

export const cachedMetadata = (jid) => metadata.get(jid);

/** Todos los identificadores con que se puede conocer a un participante. */
export function participantIds(p) {
  return [p.id, p.lid, p.phoneNumber].filter(Boolean);
}

function remember(meta) {
  metadata.set(meta.id, meta);
  for (const p of meta.participants ?? []) {
    const lid = [p.id, p.lid].find((x) => x?.endsWith('@lid'));
    const pn = [p.id, p.phoneNumber].find((x) => x?.endsWith('@s.whatsapp.net'));
    if (lid && pn) rememberLid(lid, pn);
  }
}

/** Busca a una persona en el grupo por cualquiera de sus identificadores. */
export function findParticipant(groupJid, ids) {
  const users = new Set(ids.filter(Boolean).map(jidUser));
  return metadata.get(groupJid)?.participants?.find((p) => participantIds(p).some((x) => users.has(jidUser(x)))) ?? null;
}

export function isGroupAdmin(groupJid, ids) {
  const p = findParticipant(groupJid, ids);
  return Boolean(p && (p.admin === 'admin' || p.admin === 'superadmin' || p.isAdmin || p.isSuperAdmin));
}

function botIds() {
  const me = getSocket()?.user;
  return [me?.id, me?.lid, me?.phoneNumber].filter(Boolean);
}

export function botIsAdmin(groupJid) {
  return isGroupAdmin(groupJid, botIds());
}

export async function refreshGroup(jid) {
  try {
    const meta = await getSocket().groupMetadata(jid);
    remember(meta);
    return meta;
  } catch (e) {
    log.warn(`No se pudo leer el grupo ${jid}:`, e?.message ?? e);
    return metadata.get(jid) ?? null;
  }
}

/** Lee todos los grupos de WhatsApp y los guarda en la base de datos. */
export async function syncGroups({ print = false } = {}) {
  const sock = getSocket();
  if (!sock) return [];
  let all;
  try {
    all = Object.values(await sock.groupFetchAllParticipating());
  } catch (e) {
    log.warn('No se pudo obtener la lista de grupos:', e?.message ?? e);
    return [];
  }
  all.forEach(remember);
  const groups = all.filter((g) => !g.isCommunity && !g.isCommunityAnnounce);
  const now = new Date().toISOString();
  await upsertGroups(groups.map((g) => ({
    wa_jid: g.id,
    wa_name: g.subject,
    participants_count: g.participants?.length ?? g.size ?? null,
    bot_is_admin: botIsAdmin(g.id),
    present: true,
    last_synced_at: now,
  })));
  await markGroupsAbsent(groups.map((g) => g.id));
  await state.reload(['groups']);

  if (print) {
    log.info(`El bot está en ${groups.length} grupo(s):`);
    for (const g of groups) {
      const row = state.group(g.id);
      const status = row?.enabled && row?.preset ? `moderado (${row.preset})` : 'sin configurar';
      log.info(`   • ${g.subject} — ${g.participants?.length ?? '?'} personas — ` +
        `${botIsAdmin(g.id) ? 'bot es admin' : '⚠️ bot NO es admin'} — ${status}`);
    }
  }
  return groups;
}
