// Punto de inicio del bot de moderación.
import { config } from './config.js';
import { state } from './state.js';
import { connect } from './whatsapp.js';
import { startHeartbeat, setConnectionState, getConnectionInfo } from './status.js';
import { startCounterFlush } from './moderator.js';
import { sweepBlacklist } from './joins.js';
import { processReviewCases } from './reviews.js';
import { maybeSendDailySummary } from './summary.js';
import { syncGroups } from './groups.js';
import { log } from './logger.js';

// La librería de cifrado de WhatsApp escribe detalles técnicos en la consola ("Closing session…").
// Son normales; se ocultan para que la ventana sea fácil de leer.
const NOISY = /^(Closing session|Opening session|Removing old closed session|Closing open session|Migrating session|Session already|Decrypted message with closed session)/;
for (const level of ['log', 'info', 'warn']) {
  const original = console[level].bind(console);
  console[level] = (first, ...rest) => (typeof first === 'string' && NOISY.test(first) ? undefined : original(first, ...rest));
}

process.on('unhandledRejection', (e) => log.error('Error inesperado:', e?.message ?? e));
process.on('uncaughtException', (e) => log.error('Error inesperado:', e?.message ?? e));

async function shutdown() {
  log.info('Apagando el bot…');
  await setConnectionState('desconectado', { last_error: 'Bot detenido' }).catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

log.info(`Iniciando bot de moderación v${config.version}…`);
try {
  await state.start();
} catch (e) {
  log.error('No se pudo conectar con Supabase:', e.message);
  log.error('Revisa SUPABASE_URL y SUPABASE_SECRET_KEY en el archivo .env.');
  process.exit(1);
}
log.ok(`Conectado a Supabase. Modo prueba: ${state.testMode ? 'ACTIVADO 🧪' : 'desactivado'}`);

const whenConnected = (fn) => () => getConnectionInfo().state === 'conectado' && fn();

state.on('blacklistAdded', whenConnected(() => sweepBlacklist()));
state.on('reviewCasesChanged', whenConnected(processReviewCases));
state.on('poll', whenConnected(processReviewCases));
state.on('testModeChanged', (on) => log.info(`Modo prueba ${on ? 'ACTIVADO 🧪' : 'desactivado'}.`));

await startHeartbeat();
startCounterFlush();
setInterval(whenConnected(maybeSendDailySummary), 30_000).unref();
setInterval(whenConnected(syncGroups), 10 * 60_000).unref();

await connect();
