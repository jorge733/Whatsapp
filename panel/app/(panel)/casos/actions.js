'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';

export async function decideCase(formData) {
  const { supabase } = await requireAdmin();
  const id = Number(formData.get('id'));
  const decision = formData.get('decision');
  if (!id || !['kick', 'ignore'].includes(decision)) return;
  const patch = decision === 'kick'
    ? { status: 'kick_requested' }
    : { status: 'ignored', resolved_at: new Date().toISOString(), result: 'Ignorado desde el panel.' };
  await supabase.from('review_cases').update(patch).eq('id', id).eq('status', 'pending');
  revalidatePath('/', 'layout');
}
