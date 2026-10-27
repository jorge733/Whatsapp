import Form from 'next/form';
import { Search, UserRound, Ban, RotateCcw } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { normalizePhone, fmtPhone, fmtDate, fmtDateTime, RULE_LABELS } from '@/lib/format';
import { PageHeader, Section, Empty, Badge } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/forms';
import LogItem from '@/components/LogItem';
import { addToBlacklist, removeFromBlacklist, resetWarnings } from '@/lib/actions';

export const metadata = { title: 'Personas' };

export default async function PersonasPage({ searchParams }) {
  const { supabase } = await requireAdmin();
  const { q = '' } = await searchParams;
  const raw = String(q).trim();
  const phone = raw.startsWith('lid:') ? raw : normalizePhone(raw);

  let content = null;
  if (raw && !phone) {
    content = <Empty icon={UserRound} title="Número no válido" text="Escribe un número como +56 9 1234 5678." />;
  } else if (phone) {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: warnings }, { data: posts }, { data: log }, { data: black }, { data: groups }] = await Promise.all([
      supabase.from('active_warnings').select('*').eq('phone', phone).order('created_at', { ascending: false }),
      supabase.from('posts').select('*').eq('phone', phone).gte('created_at', since).order('created_at', { ascending: false }).limit(30),
      supabase.from('action_log').select('*').eq('phone', phone).order('created_at', { ascending: false }).limit(20),
      supabase.from('blacklist').select('*').eq('phone', phone).maybeSingle(),
      supabase.from('groups').select('id, wa_name'),
    ]);
    const groupName = Object.fromEntries((groups ?? []).map((g) => [g.id, g.wa_name]));
    const real = (warnings ?? []).filter((w) => !w.test_mode);
    const test = (warnings ?? []).filter((w) => w.test_mode);
    const byGroup = new Map();
    for (const w of real) byGroup.set(w.group_id, [...(byGroup.get(w.group_id) ?? []), w]);

    content = (
      <>
        <div className="card mb-6 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-brand-600/10 text-brand-700 dark:text-brand-500">
              <UserRound className="size-6" />
            </span>
            <div className="flex-1">
              <div className="text-lg font-bold">{fmtPhone(phone)}</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {black ? <Badge tone="red">⛔ En lista negra</Badge> : <Badge tone="green">No está en lista negra</Badge>}
                <Badge tone={real.length ? 'amber' : 'gray'}>{real.length} advertencia(s) vigentes</Badge>
              </div>
            </div>
          </div>
          {black?.reason && <p className="muted mt-3 text-sm">Motivo lista negra: {black.reason}</p>}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <form action={resetWarnings}>
              <input type="hidden" name="phone" value={phone} />
              <SubmitButton className="btn-ghost w-full" pendingText="Borrando…" confirm="¿Borrar todas sus advertencias en todos los grupos?">
                <RotateCcw className="size-4" /> Resetear advertencias
              </SubmitButton>
            </form>
            {black ? (
              <form action={removeFromBlacklist}>
                <input type="hidden" name="phone" value={phone} />
                <SubmitButton className="btn-ghost w-full" pendingText="Quitando…">Quitar de lista negra</SubmitButton>
              </form>
            ) : null}
          </div>
          {!black && !phone.startsWith('lid:') && (
            <ActionForm action={addToBlacklist} className="mt-2 flex gap-2">
              <input type="hidden" name="phone" value={phone} />
              <input name="reason" placeholder="Motivo (opcional)" className="field" />
              <SubmitButton className="btn-danger shrink-0" pendingText="…" confirm="¿Enviar a la lista negra? Será expulsado de todos los grupos moderados.">
                <Ban className="size-4" /> Lista negra
              </SubmitButton>
            </ActionForm>
          )}
        </div>

        <Section title="Advertencias vigentes por grupo">
          {!byGroup.size ? (
            <p className="card muted p-4 text-sm">Sin advertencias vigentes.</p>
          ) : (
            <div className="space-y-3">
              {[...byGroup].map(([gid, ws]) => (
                <div key={gid} className="card p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{groupName[gid] ?? 'Grupo'}</h3>
                    <Badge tone="amber">{ws.length}</Badge>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {ws.map((w) => (
                      <li key={w.id} className="flex justify-between gap-2">
                        <span>{RULE_LABELS[w.rule] ?? w.rule}</span>
                        <span className="muted tabular-nums">{fmtDate(w.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                  <form action={resetWarnings} className="mt-3">
                    <input type="hidden" name="phone" value={phone} />
                    <input type="hidden" name="group_id" value={gid} />
                    <SubmitButton className="btn-ghost w-full" pendingText="Borrando…">Resetear en este grupo</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
          {test.length > 0 && <p className="muted mt-2 px-1 text-xs">Además tiene {test.length} advertencia(s) simuladas del modo prueba.</p>}
        </Section>

        <Section title="Publicaciones (últimos 30 días)">
          {!posts?.length ? (
            <p className="card muted p-4 text-sm">Sin publicaciones registradas.</p>
          ) : (
            <ul className="card divider overflow-hidden">
              {posts.map((p) => (
                <li key={p.id} className="px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{groupName[p.group_id] ?? 'Grupo'}</span>
                    <span className="muted tabular-nums">{fmtDateTime(p.created_at)}</span>
                  </div>
                  <div className="muted">
                    {p.kind}{p.photo_count ? ` · ${p.photo_count} foto(s)` : ''}{p.excerpt ? ` · “${p.excerpt}”` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Historial">
          {!log?.length ? (
            <p className="card muted p-4 text-sm">Sin acciones registradas.</p>
          ) : (
            <ul className="card divider overflow-hidden">
              {log.map((row) => <LogItem key={row.id} row={row} />)}
            </ul>
          )}
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Personas" subtitle="Busca un número para ver su historial" />
      <Form action="/personas" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={raw}
          inputMode="tel"
          placeholder="+56 9 1234 5678"
          className="field"
          aria-label="Número a buscar"
        />
        <button type="submit" className="btn-primary shrink-0" aria-label="Buscar">
          <Search className="size-5" />
        </button>
      </Form>
      {content ?? <Empty icon={Search} title="Busca un número" text="Puedes escribirlo con o sin +56, espacios o guiones." />}
    </>
  );
}
