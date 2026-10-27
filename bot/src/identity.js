// Averigua el número real de una persona. WhatsApp a veces lo oculta y muestra un
// identificador "LID" (ej: 123456789@lid). Se intenta en este orden:
//   1) el propio identificador ya es un número
//   2) el identificador alternativo que trae el mensaje
//   3) la tabla interna de WhatsApp (LID → número)
//   4) nuestra tabla lid_map en Supabase
import { isLidJid, isPnJid, jidUser, phoneFromPnJid } from './phone.js';
import { lookupLid, saveLidMappings } from './db.js';
import { getSocket } from './actions.js';

const cache = new Map(); // lid user → phone

export function rememberLid(lidJid, pnJidOrPhone) {
  const lid = jidUser(lidJid);
  const phone = isPnJid(pnJidOrPhone) ? jidUser(pnJidOrPhone) : String(pnJidOrPhone ?? '').replace(/\D/g, '');
  if (!lid || !phone || cache.get(lid) === phone) return;
  cache.set(lid, phone);
  saveLidMappings([{ lid, phone }]);
}

/**
 * @param {string[]} candidates identificadores conocidos de la persona (jid, alternativo, lid, phoneNumber)
 * @returns {Promise<{ phone: string|null, lid: string|null, jid: string, key: string }>}
 *   key = número si se conoce, si no "lid:<id>" (sirve para contar advertencias igual).
 */
export async function resolvePerson(candidates) {
  const list = candidates.filter((x) => typeof x === 'string' && x.includes('@'));
  const lidJid = list.find(isLidJid) ?? null;
  const mainJid = list[0] ?? null;
  let phone = list.map(phoneFromPnJid).find(Boolean) ?? null;

  if (!phone && lidJid) {
    const lid = jidUser(lidJid);
    phone = cache.get(lid) ?? null;
    if (!phone) {
      try {
        const pn = await getSocket()?.signalRepository?.lidMapping?.getPNForLID(lidJid);
        if (pn) phone = jidUser(pn);
      } catch {
        /* sin datos */
      }
    }
    if (!phone) phone = await lookupLid(lid);
    if (phone) cache.set(lid, phone);
  }
  if (phone && lidJid) rememberLid(lidJid, phone);

  const lid = lidJid ? jidUser(lidJid) : null;
  return { phone, lid, jid: mainJid, key: phone ?? `lid:${lid ?? jidUser(mainJid)}` };
}
