// Manejo de números de teléfono y de identificadores de WhatsApp.
import { jidDecode } from 'baileys';

/**
 * Convierte lo que escriba una persona en un número solo con dígitos.
 * "+56 9 1234 5678" → "56912345678"; "912345678" → "56912345678".
 * Devuelve null si no parece un número válido.
 */
export function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith('9')) digits = `56${digits}`;
  if (digits.length === 8) digits = `569${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** ¿Es un número chileno (+56)? */
export function isChilean(phone) {
  return typeof phone === 'string' && phone.startsWith('56');
}

/** "56912345678" → "+56 9 1234 5678" (otros países: "+<dígitos>"). */
export function formatPhone(phone) {
  if (!phone) return 'número desconocido';
  if (phone.startsWith('lid:')) return `ID oculto ${phone.slice(4)}`;
  const m = /^56(9)(\d{4})(\d{4})$/.exec(phone);
  if (m) return `+56 ${m[1]} ${m[2]} ${m[3]}`;
  return `+${phone}`;
}

/** Parte "usuario" de un JID ("56912345678:3@s.whatsapp.net" → "56912345678"). */
export function jidUser(jid) {
  return jidDecode(jid ?? '')?.user ?? null;
}

export function isLidJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@lid');
}

export function isPnJid(jid) {
  return typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us'));
}

/** Número a partir de un JID de teléfono, o null. */
export function phoneFromPnJid(jid) {
  return isPnJid(jid) ? jidUser(jid) : null;
}

export function pnJid(phone) {
  return `${phone}@s.whatsapp.net`;
}
