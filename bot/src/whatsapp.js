// Conexión con WhatsApp (librería Baileys). La sesión se guarda en la carpeta "auth"
// para no tener que escanear el QR cada vez.
import fs from 'node:fs/promises';
import path from 'node:path';
import makeWASocket, {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, isJidGroup,
} from 'baileys';
import pino from 'pino';
import qrTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { config } from './config.js';
import { setSocket, getSentMessage, notifyOwner } from './actions.js';
import { setConnectionState } from './status.js';
import { syncGroups, cachedMetadata } from './groups.js';
import { rememberLid } from './identity.js';
import { handleGroupMessage } from './moderator.js';
import { handlePrivateMessage } from './commands.js';
import { handleParticipantsUpdate, sweepBlacklist } from './joins.js';
import { processReviewCases } from './reviews.js';
import { jidUser } from './phone.js';
import { log } from './logger.js';

const QR_FILE = path.resolve(config.authFolder, '..', 'qr.png');
let retries = 0;
let announced = false;

function reconnect(ms) {
  setTimeout(() => connect().catch((e) => {
    log.error('No se pudo reconectar:', e?.message ?? e);
    reconnect(15_000);
  }), ms);
}

// Los mensajes de un mismo grupo se revisan de a uno, en orden de llegada.
const chains = new Map();
function inOrder(key, fn) {
  const next = (chains.get(key) ?? Promise.resolve()).then(fn).catch((e) => log.error('Procesando mensaje:', e?.message ?? e));
  chains.set(key, next);
  next.finally(() => chains.get(key) === next && chains.delete(key));
}

export async function connect() {
  await fs.mkdir(config.authFolder, { recursive: true });
  const { state: auth, saveCreds } = await useMultiFileAuthState(config.authFolder);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    /* se usa la versión incluida en la librería */
  }

  const sock = makeWASocket({
    auth,
    version,
    logger: pino({ level: config.baileysLogLevel }),
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false, // así sigues recibiendo notificaciones en el teléfono del bot
    syncFullHistory: false,
    cachedGroupMetadata: async (jid) => cachedMetadata(jid),
    getMessage: async (key) => getSentMessage(key.id),
  });
  setSocket(sock);
  let pairingRequested = false;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && config.pairingPhone && !sock.authState.creds.registered) {
      // Vinculación con código (útil cuando el bot corre en el mismo celular que tiene WhatsApp).
      if (!pairingRequested) {
        pairingRequested = true;
        try {
          const code = (await sock.requestPairingCode(config.pairingPhone)).match(/.{1,4}/g).join('-');
          log.info('════════════════════════════════════════');
          log.info(`   CÓDIGO PARA VINCULAR WHATSAPP:  ${code}`);
          log.info('════════════════════════════════════════');
          log.info('WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo →');
          log.info('"Vincular con el número de teléfono" → escribe el código.');
          await setConnectionState('esperando_qr', { qr_code: `codigo:${code}` });
        } catch (e) {
          log.error('No se pudo pedir el código de vinculación:', e?.message ?? e);
        }
      }
    } else if (qr) {
      log.info('Escanea este código QR con WhatsApp del número del bot:');
      log.info('(WhatsApp → ⋮ o Configuración → Dispositivos vinculados → Vincular un dispositivo)');
      qrTerminal.generate(qr, { small: true });
      await QRCode.toFile(QR_FILE, qr, { width: 400 }).catch(() => {});
      log.info(`Si el QR se ve mal aquí, abre la imagen: ${QR_FILE}`);
      await setConnectionState('esperando_qr', { qr_code: qr });
    }

    if (connection === 'open') {
      retries = 0;
      const number = jidUser(sock.user?.id);
      log.ok(`Conectado a WhatsApp como +${number}`);
      await fs.rm(QR_FILE, { force: true });
      await setConnectionState('conectado', { qr_code: null, wa_number: number, last_error: null });
      await syncGroups({ print: true });
      await sweepBlacklist();
      await processReviewCases();
      if (!announced) {
        announced = true;
        notifyOwner('🤖 Bot conectado. Escribe /ayuda para ver los comandos.');
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message ?? 'desconocido';
      setSocket(null);

      if (code === DisconnectReason.loggedOut) {
        log.error('La sesión de WhatsApp se cerró (se desvinculó el dispositivo). Hay que escanear el QR de nuevo.');
        await setConnectionState('sesion_cerrada', { last_error: 'Sesión cerrada: escanear QR de nuevo' });
        await fs.rm(config.authFolder, { recursive: true, force: true });
        reconnect(3000);
        return;
      }

      const delay = code === DisconnectReason.restartRequired ? 0 : Math.min(60_000, 2000 * 2 ** retries++);
      log.warn(`Desconectado de WhatsApp (${reason}). Reintentando en ${Math.round(delay / 1000)} s…`);
      await setConnectionState('desconectado', { last_error: `${reason} (código ${code ?? '?'})` });
      reconnect(delay);
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      const jid = msg.key?.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;
      if (!msg.message) {
        // Mensaje que WhatsApp todavía no entregó descifrado (pasa a veces justo después de vincular).
        if (!isJidGroup(jid) && !msg.key.fromMe) log.warn('Llegó un mensaje privado que no se pudo leer todavía. Si era un comando, envíalo de nuevo.');
        continue;
      }
      if (isJidGroup(jid)) inOrder(jid, () => handleGroupMessage(msg));
      else if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')) inOrder('privado', () => handlePrivateMessage(msg));
    }
  });

  sock.ev.on('group-participants.update', (ev) => inOrder(ev.id, () => handleParticipantsUpdate(ev)));
  sock.ev.on('groups.upsert', () => syncGroups());
  sock.ev.on('groups.update', () => syncGroups());
  sock.ev.on('lid-mapping.update', ({ lid, pn }) => rememberLid(lid, pn));

  return sock;
}
