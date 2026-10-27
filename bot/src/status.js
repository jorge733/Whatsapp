// Estado de la conexión y "latido" que se envía a la base de datos cada minuto.
// El panel muestra el bot como desconectado si deja de recibir latidos.
import { updateBotStatus } from './db.js';
import { config } from './config.js';

const info = { state: 'conectando', number: null };

export function getConnectionInfo() {
  return { ...info };
}

export async function setConnectionState(state, extra = {}) {
  info.state = state;
  if (extra.wa_number !== undefined) info.number = extra.wa_number;
  await updateBotStatus({ wa_state: state, last_heartbeat: new Date().toISOString(), ...extra });
}

export async function startHeartbeat() {
  await updateBotStatus({
    started_at: new Date().toISOString(),
    bot_version: config.version,
    last_heartbeat: new Date().toISOString(),
    wa_state: info.state,
    last_error: null,
  });
  setInterval(() => {
    updateBotStatus({ last_heartbeat: new Date().toISOString(), wa_state: info.state });
  }, 60_000).unref();
}
