// Acciones en WhatsApp (borrar, escribir, expulsar) con pausas entre una y otra,
// para no hacer demasiadas cosas seguidas y reducir el riesgo de bloqueo del número.
import { state } from './state.js';
import { log } from './logger.js';
import { pnJid } from './phone.js';

let sock = null;
let chain = Promise.resolve();
let lastActionAt = 0;
const recentSent = new Map(); // id → mensaje (WhatsApp puede pedir reenviarlo)

export function setSocket(s) {
  sock = s;
}

export function getSocket() {
  return sock;
}

export function getSentMessage(id) {
  return recentSent.get(id);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function randomDelay() {
  const min = state.settings?.action_delay_min_ms ?? 1500;
  const max = Math.max(min, state.settings?.action_delay_max_ms ?? 4000);
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Pone una acción en la fila; se ejecutan de a una con una pausa entre cada una. */
function enqueue(label, fn) {
  const task = chain.then(async () => {
    const wait = lastActionAt + randomDelay() - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      if (!sock) throw new Error('WhatsApp no está conectado');
      return await fn(sock);
    } finally {
      lastActionAt = Date.now();
    }
  });
  chain = task.catch((e) => log.error(`No se pudo ${label}:`, e?.message ?? e));
  return task;
}

/** Ejecuta y devuelve true/false sin lanzar errores. */
async function attempt(label, fn) {
  try {
    await enqueue(label, fn);
    return true;
  } catch {
    return false;
  }
}

export const deleteMessage = (groupJid, key) =>
  attempt('borrar un mensaje', (s) => s.sendMessage(groupJid, { delete: key }));

export const kick = (groupJid, participantJid) =>
  attempt('expulsar a un participante', async (s) => {
    const [res] = await s.groupParticipantsUpdate(groupJid, [participantJid], 'remove');
    if (res && res.status && String(res.status) !== '200') throw new Error(`WhatsApp respondió ${res.status}`);
  });

export const sendText = (jid, text, mentions = []) =>
  attempt('enviar un mensaje', async (s) => {
    const sent = await s.sendMessage(jid, { text, mentions });
    if (sent?.key?.id) {
      recentSent.set(sent.key.id, sent.message);
      if (recentSent.size > 200) recentSent.delete(recentSent.keys().next().value);
    }
  });

/** Mensaje privado al dueño (si configuró su número). */
export function notifyOwner(text) {
  const owner = state.settings?.owner_phone;
  if (!owner) return Promise.resolve(false);
  return sendText(pnJid(owner), text);
}

// ---------- Avisos del modo prueba (se agrupan para no mandar un mensaje por cada cosa) ----------
let testBuffer = [];
let testTimer = null;

export function testModeNotice(line) {
  testBuffer.push(line);
  if (!testTimer) {
    testTimer = setTimeout(() => {
      const lines = testBuffer.splice(0, 20);
      const extra = testBuffer.length;
      testBuffer = [];
      testTimer = null;
      notifyOwner(
        `🧪 *Modo prueba* — esto es lo que habría hecho:\n\n${lines.join('\n\n')}` +
          (extra ? `\n\n…y ${extra} más (ver el registro en el panel).` : ''),
      );
    }, 60_000);
  }
}
