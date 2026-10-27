'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { rulesFromForm } from '@/lib/rules';

const PRESETS = ['ventas', 'trabajos', 'servicios'];

export async function saveGroupSetup(prev, formData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id'));
  const preset = String(formData.get('preset') ?? '');
  const enabled = formData.get('enabled') === 'on';
  if (preset && !PRESETS.includes(preset)) return { ok: false, message: 'Plantilla no válida.' };
  if (enabled && !preset) return { ok: false, message: 'Elige una plantilla antes de activar la moderación.' };
  // Al cambiar la plantilla, la base de datos copia sus reglas al grupo automáticamente.
  const { error } = await supabase.from('groups').update({ preset: preset || null, enabled }).eq('id', id);
  if (error) return { ok: false, message: `No se pudo guardar: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, message: enabled ? 'Guardado ✓ El bot ya está moderando este grupo.' : 'Guardado ✓ Moderación desactivada.' };
}

export async function saveGroupRules(prev, formData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id'));
  const { data: group } = await supabase.from('groups').select('rules').eq('id', id).single();
  if (!group) return { ok: false, message: 'Grupo no encontrado.' };
  const rules = rulesFromForm(formData, group.rules ?? {});
  const { error } = await supabase.from('groups').update({ rules }).eq('id', id);
  if (error) return { ok: false, message: `No se pudo guardar: ${error.message}` };
  revalidatePath('/reglas');
  return { ok: true, message: 'Reglas guardadas ✓ El bot las aplica en segundos.' };
}

export async function resetGroupRules(formData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id'));
  const { data: group } = await supabase.from('groups').select('preset').eq('id', id).single();
  if (!group?.preset) return;
  const { data: preset } = await supabase.from('rule_presets').select('rules').eq('key', group.preset).single();
  if (preset) await supabase.from('groups').update({ rules: preset.rules }).eq('id', id);
  revalidatePath('/reglas');
}
