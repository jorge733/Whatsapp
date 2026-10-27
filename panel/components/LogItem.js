import Link from 'next/link';
import { Badge, ACTION_TONE } from '@/components/ui';
import { ACTION_LABELS, RULE_LABELS, fmtDateTime, fmtPhone } from '@/lib/format';

/** Una fila del registro de acciones. */
export default function LogItem({ row, showGroup = true }) {
  const motivo = row.details?.motivo;
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={row.success === false ? 'red' : ACTION_TONE[row.action] ?? 'gray'}>
          {ACTION_LABELS[row.action] ?? row.action}
          {row.success === false && ' (falló)'}
        </Badge>
        {row.rule && <Badge>{RULE_LABELS[row.rule] ?? row.rule}</Badge>}
        {row.test_mode && <Badge tone="amber">🧪 prueba</Badge>}
        <span className="muted ml-auto text-xs tabular-nums">{fmtDateTime(row.created_at)}</span>
      </div>
      <div className="mt-1.5 text-sm">
        {row.phone ? (
          <Link href={`/personas?q=${encodeURIComponent(row.phone)}`} className="font-semibold hover:underline">
            {fmtPhone(row.phone)}
          </Link>
        ) : (
          <span className="font-semibold">Sistema</span>
        )}
        {showGroup && row.group_name && <span className="muted"> · {row.group_name}</span>}
      </div>
      {motivo && <p className="muted mt-0.5 text-sm">Motivo: {motivo}</p>}
      {row.excerpt && (
        <p className="mt-1.5 line-clamp-3 rounded-lg bg-black/[.04] px-2.5 py-1.5 text-sm break-words dark:bg-white/[.05]">
          “{row.excerpt}”
        </p>
      )}
    </li>
  );
}
