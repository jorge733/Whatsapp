// Regla: máximo de fotos por publicación.
// Un álbum llega como varias imágenes separadas; se agrupan por el álbum al que pertenecen
// o, si WhatsApp no lo indica, por imágenes de la misma persona enviadas con pocos segundos de diferencia.
import { fill, ruleConfig } from './util.js';

const bursts = new Map(); // clave → { count, lastAt }

export default {
  id: 'max_photos',
  label: 'Demasiadas fotos',
  async check({ group, who, info, at }) {
    const cfg = ruleConfig(group, 'max_photos');
    if (!cfg || !info.isImage) return null;

    const windowMs = (Number(cfg.album_window_seconds) || 20) * 1000;
    const key = info.albumParentId ? `album|${info.albumParentId}` : `${group.id}|${who.key}`;
    let burst = bursts.get(key);
    if (!burst || (!info.albumParentId && at - burst.lastAt > windowMs)) {
      burst = { count: 0, lastAt: at };
      bursts.set(key, burst);
    }
    burst.count += 1;
    burst.lastAt = at;

    const max = Number(cfg.max) || 3;
    if (burst.count <= max) return null;
    return {
      reason: fill(cfg.reason || 'se permiten máximo {max} fotos por publicación', cfg),
      details: { foto_numero: burst.count, maximo: max },
    };
  },
};

setInterval(() => {
  const limit = Date.now() - 3_600_000;
  for (const [k, v] of bursts) if (v.lastAt < limit) bursts.delete(k);
}, 3_600_000).unref();
