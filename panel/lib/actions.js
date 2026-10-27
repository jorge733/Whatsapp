'use server';
// Acciones compartidas: lista negra y advertencias (desde Personas y Lista negra).
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { normalizePhone, fmtPhone } from '@/lib/format';

export async function addToBlacklist(prev, formData) {
  const { supabase } = await requireAdmin();
  const phone = normalizePhone(formData.get('phone'));
  if (!phone) return { ok: false, message: 'Número no válido. Ejemplo: +56 9 1234 5678' };
  const reason = String(formData.get('reason') ?? '').trim() || null;
  const { error } = await supabase.from('blacklist').upsert({ phone, reason, source: 'panel' }, { onConflict: 'phone' });
  if (error) return { ok: false, message: `No se pudo guardar: ${error.message}` };
  await supabase.from('action_log').insert({
    phone, rule: 'blacklist', action: 'blacklist_add', details: { motivo: reason, origen: 'panel' },
  });
  revalidatePath('/', 'layout');
  return { ok: true, message: `${fmtPhone(phone)} agregado. Si está en algún grupo moderado, el bot lo expulsará.` };
}

export async function removeFromBlacklist(formData) {
  const { supabase } = await requireAdmin();
  const phone = normalizePhone(formData.get('phone'));
  if (!phone) return;
  await supabase.from('blacklist').delete().eq('phone', phone);
  await supabase.from('action_log').insert({ phone, rule: 'blacklist', action: 'blacklist_remove', details: { origen: 'panel' } });
  revalidatePath('/', 'layout');
}

export async function resetWarnings(formData) {
  const { supabase } = await requireAdmin();
  const phone = String(formData.get('phone') ?? '');
  if (!phone) return;
  const groupId = formData.get('group_id');
  let q = supabase.from('warnings').update({ cleared_at: new Date().toISOString() }).eq('phone', phone).is('cleared_at', null);
  if (groupId) q = q.eq('group_id', groupId);
  await q;
  await supabase.from('action_log').insert({
    phone, group_id: groupId || null, rule: 'manual', action: 'reset', details: { origen: 'panel' },
  });
  revalidatePath('/', 'layout');
}
