// Lista de reglas que se revisan en cada mensaje, en este orden. La primera que se rompe es la que cuenta.
//
// Para agregar una regla nueva (por ejemplo, revisión con IA usando Gemini):
//   1. Crear un archivo en esta carpeta, ej: aiReview.js, con { id, label, check(ctx) }.
//      check() devuelve null si el mensaje está bien, o { reason, details } si rompe la regla.
//   2. Agregarlo a la lista de abajo.
//   3. Agregar su configuración en "rules" de cada grupo, ej: "ai_review": { "enabled": true, ... }.
//
// ctx = { group, who, info, at, now, msgId }
//   group: fila de la tabla groups (incluye rules)
//   who:   { phone, lid, jid, key } de quien escribió
//   info:  { type, kind, text, isImage, isReply, ... } (ver content.js)
//   at:    hora del mensaje en milisegundos; now: partes de la hora en Chile (ver time.js)
import schedule from './schedule.js';
import noLinks from './noLinks.js';
import postLimit from './postLimit.js';
import maxPhotos from './maxPhotos.js';

export const RULES = [schedule, noLinks, postLimit, maxPhotos];

export const RULE_LABELS = {
  only_chile: 'Número no chileno',
  blacklist: 'Lista negra',
  manual: 'Decisión manual',
  system: 'Sistema',
  ...Object.fromEntries(RULES.map((r) => [r.id, r.label])),
};
