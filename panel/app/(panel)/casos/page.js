import { Inbox, UserX, Check } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { fmtDateTime, fmtPhone } from '@/lib/format';
import { PageHeader, Section, Empty, Badge } from '@/components/ui';
import { SubmitButton } from '@/components/forms';
import AutoRefresh from '@/components/AutoRefresh';
import { decideCase } from './actions';

export const metadata = { title: 'Casos para revisar' };

const STATUS = {
  kick_requested: { label: 'Expulsión pedida…', tone: 'amber' },
  ignored: { label: 'Ignorado', tone: 'gray' },
  done: { label: 'Resuelto', tone: 'green' },
  failed: { label: 'Falló', tone: 'red' },
};

function who(c) {
  if (c.phone) return fmtPhone(c.phone);
  const id = c.participant_jid?.split('@')[0] ?? '?';
  return `Número oculto (ID ${id})`;
}

export default async function CasosPage() {
  const { supabase } = await requireAdmin();
  const [{ data: open }, { data: closed }, { data: groups }] = await Promise.all([
    supabase.from('review_cases').select('*').in('status', ['pending', 'kick_requested']).order('created_at', { ascending: false }),
    supabase.from('review_cases').select('*').in('status', ['ignored', 'done', 'failed']).order('created_at', { ascending: false }).limit(20),
    supabase.from('groups').select('id, wa_name'),
  ]);
  const groupName = Object.fromEntries((groups ?? []).map((g) => [g.id, g.wa_name]));

  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader title="Casos para revisar" subtitle="Situaciones que el bot no pudo decidir solo" />

      <Section title="Pendientes">
        {!open?.length ? (
          <Empty icon={Inbox} title="Nada pendiente" text="Cuando el bot tenga una duda, aparecerá aquí." />
        ) : (
          <div className="space-y-3">
            {open.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{who(c)}</div>
                    <div className="muted text-sm">{groupName[c.group_id] ?? 'Grupo'} · {fmtDateTime(c.created_at)}</div>
                  </div>
                  {c.status !== 'pending' && <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>}
                </div>
                <p className="mt-2 text-sm">{c.reason}</p>
                {c.status === 'pending' ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={decideCase}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value="kick" />
                      <SubmitButton className="btn-danger w-full" pendingText="Enviando…" confirm="¿Expulsar a esta persona del grupo?">
                        <UserX className="size-4" /> Expulsar
                      </SubmitButton>
                    </form>
                    <form action={decideCase}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value="ignore" />
                      <SubmitButton className="btn-ghost w-full" pendingText="…">
                        <Check className="size-4" /> Ignorar
                      </SubmitButton>
                    </form>
                  </div>
                ) : (
                  <p className="muted mt-2 text-xs">El bot la ejecutará en unos segundos.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {closed?.length > 0 && (
        <Section title="Resueltos recientemente">
          <ul className="card divider overflow-hidden">
            {closed.map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{who(c)}</span>
                  <Badge tone={STATUS[c.status]?.tone}>{STATUS[c.status]?.label ?? c.status}</Badge>
                </div>
                <div className="muted">{groupName[c.group_id] ?? 'Grupo'} · {fmtDateTime(c.resolved_at ?? c.created_at)}</div>
                {c.result && <div className="mt-0.5">{c.result}</div>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
