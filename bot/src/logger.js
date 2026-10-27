// Mensajes en la consola con la hora de Chile.
import { formatSantiago } from './time.js';

function out(fn, icon, args) {
  fn(`[${formatSantiago()}] ${icon}`, ...args);
}

export const log = {
  info: (...a) => out(console.log, 'ℹ️ ', a),
  ok: (...a) => out(console.log, '✅', a),
  warn: (...a) => out(console.warn, '⚠️ ', a),
  error: (...a) => out(console.error, '❌', a),
  action: (...a) => out(console.log, '🛡️ ', a),
};
