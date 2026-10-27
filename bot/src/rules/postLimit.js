// Regla: máximo de publicaciones por persona en X días (y opcionalmente no en días seguidos).
// Varios mensajes seguidos de la misma persona (ej: fotos + descripción) cuentan como UNA publicación.
// Las respuestas a otros mensajes (citando) no cuentan como publicación, salvo que count_replies = true.
import { recentPosts, addPost, updatePost } from '../db.js';
import { addDays } from '../time.js';
import { fill, ruleConfig } from './util.js';
import { excerpt } from '../content.js';

const POST_KINDS = new Set(['texto', 'imagen', 'video', 'documento', 'ubicacion', 'contacto', 'encuesta']);
const bursts = new Map(); // grupo|persona → { postId, lastAt, rejected, reason, photos }

export default {
  id: 'post_limit',
  label: 'Límite de publicaciones',
  async check({ group, who, info, at, now, msgId }) {
    const cfg = ruleConfig(group, 'post_limit');
    if (!cfg || !POST_KINDS.has(info.kind)) return null;
    if (info.isReply && !cfg.count_replies) return null;

    const key = `${group.id}|${who.key}`;
    const mergeMs = (Number(cfg.merge_window_seconds) || 120) * 1000;
    const prev = bursts.get(key);

    // Continúa una publicación que está en curso.
    if (prev && at - prev.lastAt <= mergeMs) {
      prev.lastAt = at;
      if (prev.rejected) return { reason: prev.reason, details: { continuacion: true } };
      if (info.isImage && prev.postId) {
        prev.photos += 1;
        updatePost(prev.postId, { photo_count: prev.photos });
      }
      return null;
    }

    const maxPosts = Number(cfg.max_posts) || 3;
    const days = Number(cfg.window_days) || 7;
    const since = new Date(at - days * 86_400_000).toISOString();
    const posts = await recentPosts(group.id, who.key, since);

    let reason = null;
    if (posts.length >= maxPosts) {
      reason = fill(cfg.reason || 'se permiten máximo {max_posts} publicaciones cada {window_days} días', cfg);
    } else if (cfg.no_consecutive_days) {
      const yesterday = addDays(now.day, -1);
      if (posts.some((p) => p.local_day === yesterday)) {
        reason = 'no se puede publicar en dos días seguidos';
      }
    }

    if (reason) {
      bursts.set(key, { lastAt: at, rejected: true, reason });
      return { reason, details: { publicaciones_recientes: posts.length } };
    }

    const row = await addPost({
      group_id: group.id,
      phone: who.key,
      wa_message_id: msgId,
      kind: info.kind,
      photo_count: info.isImage ? 1 : 0,
      excerpt: excerpt(info.text, 120),
      local_day: now.day,
      created_at: new Date(at).toISOString(),
    });
    bursts.set(key, { postId: row?.id ?? null, lastAt: at, rejected: false, photos: info.isImage ? 1 : 0 });
    return null;
  },
};

// Limpieza de memoria cada hora.
setInterval(() => {
  const limit = Date.now() - 3_600_000;
  for (const [k, v] of bursts) if (v.lastAt < limit) bursts.delete(k);
}, 3_600_000).unref();
