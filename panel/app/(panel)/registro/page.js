import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { PageHeader, Empty, ChipLink } from '@/components/ui';
import LogItem from '@/components/LogItem';
import AutoRefresh from '@/components/AutoRefresh';

export const metadata = { title: 'Registro' };

const TYPES = [
  { key: '', label: 'Todo' },
  { key: 'delete', label: 'Borrados' },
  { key: 'warn', label: 'Advertencias' },
  { key: 'kick', label: 'Expulsiones' },
  { key: 'review', label: 'A revisar' },
  { key: 'blacklist', label: 'Lista negra' },
];
const TYPE_FILTER = {
  delete: ['delete'],
  warn: ['warn', 'final_warn'],
  kick: ['kick'],
  review: ['review'],
  blacklist: ['blacklist_add', 'blacklist_remove'],
};

export default async function RegistroPage({ searchParams }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const grupo = sp.grupo ?? '';
  const tipo = TYPE_FILTER[sp.tipo] ? sp.tipo : '';
  const limit = Math.min(500, Math.max(50, Number(sp.limite) || 50));

  let q = supabase.from('action_log').select('*').order('created_at', { ascending: false }).limit(limit + 1);
  if (grupo) q = q.eq('group_id', grupo);
  if (tipo) q = q.in('action', TYPE_FILTER[tipo]);
  else q = q.or('rule.is.null,rule.neq.system');

  const [{ data: rows }, { data: groups }] = await Promise.all([
    q,
    supabase.from('groups').select('id, wa_name').eq('enabled', true).order('wa_name'),
  ]);
  const list = (rows ?? []).slice(0, limit);
  const hasMore = (rows ?? []).length > limit;

  const href = (patch) => {
    const p = new URLSearchParams({ ...(grupo && { grupo }), ...(tipo && { tipo }), ...patch });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    const s = p.toString();
    return `/registro${s ? `?${s}` : ''}`;
  };

  return (
    <>
      <AutoRefresh seconds={60} />
      <PageHeader title="Registro" subtitle="Todo lo que hizo (o habría hecho) el bot" />

      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {TYPES.map((t) => (
          <ChipLink key={t.key} href={href({ tipo: t.key, limite: '' })} active={tipo === t.key}>
            {t.label}
          </ChipLink>
        ))}
      </div>
      {groups?.length > 1 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <ChipLink href={href({ grupo: '', limite: '' })} active={!grupo}>Todos los grupos</ChipLink>
          {groups.map((g) => (
            <ChipLink key={g.id} href={href({ grupo: g.id, limite: '' })} active={grupo === g.id}>
              {g.wa_name}
            </ChipLink>
          ))}
        </div>
      )}

      {!list.length ? (
        <Empty icon={ScrollText} title="Sin registros" text="Aquí aparecerá cada acción del bot." />
      ) : (
        <ul className="card divider overflow-hidden">
          {list.map((row) => (
            <LogItem key={row.id} row={row} />
          ))}
        </ul>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <Link href={href({ limite: String(limit + 50) })} scroll={false} className="btn-ghost">
            Ver más
          </Link>
        </div>
      )}
    </>
  );
}
