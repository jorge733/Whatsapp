'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { normalizePhone } from '@/lib/format';

const int = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export async function saveSettings(prev, formData) {
  const { supabase } = await requireAdmin();
  const ownerRaw = String(formData.get('owner_phone') ?? '').trim();
  const owner = ownerRaw ? normalizePhone(ownerRaw) : null;
  if (ownerRaw && !owner) return { ok: false, message: 'El número del dueño no es válido.' };

  const delayMin = int(formData.get('delay_min'), 0, 60, 1.5) * 1000;
  const delayMax = Math.max(delayMin, int(formData.get('delay_max'), 0, 120, 4) * 1000);
  const time = String(formData.get('daily_summary_time') ?? '21:30');

  const patch = {
    test_mode: formData.get('test_mode') === 'on',
    warning_expiry_days: int(formData.get('warning_expiry_days'), 1, 365, 30),
    strikes_to_kick: int(formData.get('strikes_to_kick'), 1, 10, 3),
    auto_blacklist_on_kick: formData.get('auto_blacklist_on_kick') === 'on',
    owner_phone: owner,
    daily_summary_enabled: formData.get('daily_summary_enabled') === 'on',
    daily_summary_time: /^\d{2}:\d{2}$/.test(time) ? time : '21:30',
    action_delay_min_ms: delayMin,
    action_delay_max_ms: delayMax,
  };
  for (const k of ['msg_warning', 'msg_final_warning', 'msg_kick']) {
    const v = String(formData.get(k) ?? '').trim();
    if (v) patch[k] = v.slice(0, 1000);
  }

  const { error } = await supabase.from('settings').update(patch).eq('id', 1);
  if (error) return { ok: false, message: `No se pudo guardar: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ajustes guardados ✓ El bot los aplica en segundos.' };
}
