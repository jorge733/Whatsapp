import Link from 'next/link';
import QRCode from 'qrcode';
import { Bot, ChevronRight, FlaskConical, Inbox, MessageSquare } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { botHealth, fmtDateTime, todaySantiago, fmtPhone } from '@/lib/format';
import { PageHeader, Section, Stat, Empty } from '@/components/ui';
import { SwitchSubmit } from '@/components/forms';
import AutoRefresh from '@/components/AutoRefresh';
import { setTestMode } from './actions';

export const metadata = { title: 'Inicio' };

const DOT = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };

export default async function HomePage() {
  const { supabase } = await requireAdmin();
  const today = todaySantiago();
  const [{ data: status }, { data: settings }, { data: summary }, { count: pending }] = await Promise.all([
    supabase.from('bot_status').select('*').eq('id', 1).single(),
    supabase.from('settings').select('test_mode').eq('id', 1).single(),
    supabase.rpc('daily_summary', { p_day: today }),
    supabase.from('review_cases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const health = botHealth(status);
  const qrSvg = health.key === 'qr' && status?.qr_code
    ? await QRCode.toString(status.qr_code, { type: 'svg', margin: 1, width: 260 })
    : null;
  const [y, m, d] = today.split('-');
  const totals = (summary ?? []).reduce(
    (t, r) => ({
      checked: t.checked + r.messages_checked, deleted: t.deleted + r.deleted,
      warnings: t.warnings + r.warnings, kicks: t.kicks + r.kicks,
    }),
    { checked: 0, deleted: 0, warnings: 0, kicks: 0 },
  );

  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader title="Inicio" subtitle={`Hoy, ${d}-${m}-${y}`} />

      {/* Estado del bot */}
      <div
        className={`card mb-4 p-4 ${health.tone === 'red' ? 'border-red-500/60 bg-red-500/[.06]' : ''} ${
          health.tone === 'amber' ? 'border-amber-500/60' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="relative grid size-11 place-items-center rounded-xl bg-black/[.04] dark:bg-white/[.06]">
            <Bot className="size-6" />
            <span className={`absolute -top-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-[var(--card)] ${DOT[health.tone]}`}>
              {health.tone === 'green' && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className={`text-lg font-bold ${health.tone === 'red' ? 'text-red-600 dark:text-red-400' : ''}`}>
              {health.label}
            </div>
            <div className="muted truncate text-sm">{health.detail}</div>
          </div>
        </div>
        {status?.wa_number && (
          <p className="muted mt-3 text-xs">
            Número del bot: {fmtPhone(status.wa_number)} · Encendido desde {fmtDateTime(status.started_at)}
          </p>
        )}
        {health.key === 'apagado' && (
          <p className="mt-3 text-sm">
            El bot no está enviando señales. Revisa que el programa esté encendido (en tu computador o en el servidor).
          </p>
        )}
        {qrSvg && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-white p-4 text-center text-slate-900">
            <div className="w-64 max-w-full [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="text-sm">
              En el celular del bot: WhatsApp → <b>Dispositivos vinculados</b> → <b>Vincular un dispositivo</b>.
              El código cambia cada ~20 segundos; esta página se actualiza sola.
            </p>
          </div>
        )}
      </div>

      {/* Modo prueba */}
      <form action={setTestMode} className="card mb-6 flex items-center gap-3 p-4">
        <input type="hidden" name="value" value={settings?.test_mode ? 'off' : 'on'} />
        <span className="grid size-11 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <FlaskConical className="size-6" />
        </span>
        <div className="flex-1">
          <div className="font-semibold">Modo prueba</div>
          <div className="muted text-sm">
            {settings?.test_mode ? 'Activado: solo registra y te avisa' : 'Desactivado: borra y expulsa de verdad'}
          </div>
        </div>
        <SwitchSubmit
          on={Boolean(settings?.test_mode)}
          label="Modo prueba"
          confirmOff="¿Desactivar el modo prueba? Desde ahora el bot borrará mensajes y expulsará de verdad."
        />
      </form>

      {pending > 0 && (
        <Link href="/casos" className="card mb-6 flex items-center gap-3 border-violet-500/50 p-4">
          <span className="grid size-11 place-items-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <Inbox className="size-6" />
          </span>
          <div className="flex-1">
            <div className="font-semibold">{pending} caso(s) para revisar</div>
            <div className="muted text-sm">Situaciones que el bot no pudo resolver solo</div>
          </div>
          <ChevronRight className="muted size-5" />
        </Link>
      )}

      <Section title="Resumen de hoy">
        <div className="card mb-3 grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          <Stat label="Revisados" value={totals.checked} />
          <Stat label="Borrados" value={totals.deleted} />
          <Stat label="Advertencias" value={totals.warnings} tone={totals.warnings ? 'amber' : undefined} />
          <Stat label="Expulsiones" value={totals.kicks} tone={totals.kicks ? 'red' : undefined} />
        </div>
        {!summary?.length ? (
          <Empty icon={MessageSquare} title="No hay grupos moderados" text="Ve a Reglas para activar la moderación en tus grupos." />
        ) : (
          <div className="space-y-3">
            {summary.map((g) => (
              <div key={g.group_id} className="card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{g.group_name}</h3>
                  {g.simulated > 0 && <span className="muted text-xs">🧪 {g.simulated} simuladas</span>}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="Revisados" value={g.messages_checked} />
                  <Stat label="Borrados" value={g.deleted} />
                  <Stat label="Advert." value={g.warnings} tone={g.warnings ? 'amber' : undefined} />
                  <Stat label="Expuls." value={g.kicks} tone={g.kicks ? 'red' : undefined} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
