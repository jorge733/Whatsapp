'use server';
// Acciones de la página de inicio.
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';

export async function setTestMode(formData) {
  const { supabase } = await requireAdmin();
  const on = formData.get('value') === 'on';
  await supabase.from('settings').update({ test_mode: on }).eq('id', 1);
  revalidatePath('/', 'layout');
}
