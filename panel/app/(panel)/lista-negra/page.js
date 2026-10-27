import Link from 'next/link';
import { Ban, Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { fmtPhone, fmtDate } from '@/lib/format';
import { PageHeader, Section, Empty, Badge } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/forms';
import { addToBlacklist, removeFromBlacklist } from '@/lib/actions';

export const metadata = { title: 'Lista negra' };

const SOURCE = { panel: 'Panel', whatsapp: 'WhatsApp', auto: 'Automático' };

export default async function ListaNegraPage() {
  const { supabase } = await requireAdmin();
  const { data: list } = await supabase.from('blacklist').select('*').order('created_at', { ascending: false });

  return (
    <>
      <PageHeader title="Lista negra" subtitle="Expulsados de todos los grupos moderados, siempre" />

      <Section title="Agregar número">
        <ActionForm action={addToBlacklist} resetOnSuccess className="card space-y-3 p-4">
          <div>
            <label className="label" htmlFor="bl-phone">Número</label>
            <input id="bl-phone" name="phone" inputMode="tel" required placeholder="+56 9 1234 5678" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="bl-reason">Motivo</label>
            <input id="bl-reason" name="reason" placeholder="Ej: estafa reportada" className="field" />
          </div>
          <SubmitButton className="btn-danger w-full" pendingText="Agregando…">
            <Plus className="size-4" /> Agregar a la lista negra
          </SubmitButton>
        </ActionForm>
      </Section>

      <Section title={`En la lista (${list?.length ?? 0})`}>
        {!list?.length ? (
          <Empty icon={Ban} title="La lista negra está vacía" />
        ) : (
          <ul className="card divider overflow-hidden">
            {list.map((b) => (
              <li key={b.phone} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/personas?q=${b.phone}`} className="font-semibold hover:underline">{fmtPhone(b.phone)}</Link>
                  <div className="muted truncate text-sm">{b.reason || 'Sin motivo'}</div>
                  <div className="mt-1 flex gap-1.5">
                    <Badge>{SOURCE[b.source] ?? b.source}</Badge>
                    <span className="muted text-xs">{fmtDate(b.created_at)}</span>
                  </div>
                </div>
                <form action={removeFromBlacklist}>
                  <input type="hidden" name="phone" value={b.phone} />
                  <SubmitButton className="btn-ghost" pendingText="…" confirm={`¿Quitar ${fmtPhone(b.phone)} de la lista negra?`}>
                    Quitar
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
