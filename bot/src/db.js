// Acceso a la base de datos (Supabase). El bot usa la clave secreta, que nunca sale de este equipo.
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { log } from './logger.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Ejecuta una consulta y avisa en la consola si falla, sin detener el bot. */
async function run(label, promise) {
  const { data, error } = await promise;
  if (error) {
    log.error(`Base de datos (${label}):`, error.message);
    return null;
  }
  return data;
}

// ---------- Lectura de configuración ----------
export const fetchSettings = () =>
  run('ajustes', supabase.from('settings').select('*').eq('id', 1).single());

export const fetchGroups = () => run('grupos', supabase.from('groups').select('*'));

export const fetchBlacklist = () => run('lista negra', supabase.from('blacklist').select('*'));

export const updateSettings = (patch) =>
  run('ajustes', supabase.from('settings').update(patch).eq('id', 1));

// ---------- Estado del bot ----------
export const updateBotStatus = (patch) =>
  run('estado', supabase.from('bot_status').update(patch).eq('id', 1));

// ---------- Grupos ----------
export async function upsertGroups(rows) {
  if (!rows.length) return [];
  return run('grupos', supabase.from('groups').upsert(rows, { onConflict: 'wa_jid' }).select('*'));
}

export const markGroupsAbsent = (presentJids) => {
  let q = supabase.from('groups').update({ present: false }).eq('present', true);
  if (presentJids.length) q = q.not('wa_jid', 'in', `(${presentJids.map((j) => `"${j}"`).join(',')})`);
  return run('grupos', q);
};

export const updateGroup = (id, patch) =>
  run('grupos', supabase.from('groups').update(patch).eq('id', id));

// ---------- Registro ----------
export const logAction = (row) => run('registro', supabase.from('action_log').insert(row));

// ---------- Advertencias ----------
export async function countActiveWarnings(groupId, who, testMode) {
  const { count, error } = await supabase
    .from('active_warnings')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('phone', who)
    .eq('test_mode', testMode);
  if (error) {
    log.error('Base de datos (contar advertencias):', error.message);
    return 0;
  }
  return count ?? 0;
}

export const addWarning = (row) => run('advertencias', supabase.from('warnings').insert(row));

export const activeWarningsFor = (who) =>
  run('advertencias', supabase.from('active_warnings').select('*').eq('phone', who).eq('test_mode', false));

export const clearWarnings = (who) =>
  run('advertencias', supabase.from('warnings').update({ cleared_at: new Date().toISOString() })
    .eq('phone', who).is('cleared_at', null));

// ---------- Publicaciones ----------
export async function recentPosts(groupId, who, sinceIso) {
  return (await run('publicaciones', supabase.from('posts').select('id, created_at, local_day')
    .eq('group_id', groupId).eq('phone', who).gte('created_at', sinceIso)
    .order('created_at', { ascending: false }))) ?? [];
}

export const addPost = (row) => run('publicaciones', supabase.from('posts').insert(row).select('id').single());

export const updatePost = (id, patch) => run('publicaciones', supabase.from('posts').update(patch).eq('id', id));

// ---------- Lista negra ----------
export const addToBlacklist = (phone, reason, source) =>
  run('lista negra', supabase.from('blacklist').upsert({ phone, reason, source }, { onConflict: 'phone' }));

export const removeFromBlacklist = (phone) =>
  run('lista negra', supabase.from('blacklist').delete().eq('phone', phone).select('phone'));

// ---------- Casos para revisar ----------
export async function openReviewCase(row) {
  // Evita duplicar un caso pendiente para la misma persona en el mismo grupo.
  const existing = await run('casos', supabase.from('review_cases').select('id')
    .eq('participant_jid', row.participant_jid).eq('group_id', row.group_id)
    .eq('status', 'pending').limit(1));
  if (existing?.length) return null;
  return run('casos', supabase.from('review_cases').insert(row).select('id').single());
}

export const fetchReviewCases = (statuses) =>
  run('casos', supabase.from('review_cases').select('*').in('status', statuses).order('created_at'));

export const updateReviewCase = (id, patch) =>
  run('casos', supabase.from('review_cases').update(patch).eq('id', id));

// ---------- LID → número ----------
export const saveLidMappings = (rows) =>
  rows.length ? run('lid', supabase.from('lid_map').upsert(rows, { onConflict: 'lid' })) : null;

export async function lookupLid(lid) {
  const data = await run('lid', supabase.from('lid_map').select('phone').eq('lid', lid).maybeSingle());
  return data?.phone ?? null;
}

// ---------- Contadores y resumen ----------
export const incrementChecked = (groupId, count) =>
  run('contador', supabase.rpc('increment_messages_checked', { p_group_id: groupId, p_count: count }));

export const dailySummary = (day) => run('resumen', supabase.rpc('daily_summary', { p_day: day }));

export async function summarySentOn(day) {
  const data = await run('resumen', supabase.from('action_log').select('id')
    .eq('rule', 'system').eq('action', 'info').contains('details', { type: 'daily_summary', day }).limit(1));
  return Boolean(data?.length);
}

export async function countPendingReviews() {
  const { count } = await supabase.from('review_cases').select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count ?? 0;
}
