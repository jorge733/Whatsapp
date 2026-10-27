import { MessageSquare, RotateCcw, Users, AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { PRESET_LABELS, fmtDateTime } from '@/lib/format';
import { RULE_DEFS } from '@/lib/rules';
import { PageHeader, Section, Empty, Badge } from '@/components/ui';
import { ActionForm, SubmitButton, Checkbox } from '@/components/forms';
import { saveGroupSetup, saveGroupRules, resetGroupRules } from './actions';

export const metadata = { title: 'Reglas' };

function RuleFields({ def, value = {} }) {
  return (
    <fieldset className="py-1">
      <Checkbox name={`${def.id}.enabled`} defaultChecked={Boolean(value.enabled)} label={def.title} hint={def.hint} />
      {def.fields.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl bg-black/[.03] p-3 dark:bg-white/[.04]">
          {def.fields.map((f) => {
            const name = `${def.id}.${f.key}`;
            const v = value[f.key] ?? f.default;
            if (f.type === 'checkbox') {
              return (
                <label key={f.key} className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" name={name} defaultChecked={Boolean(v)} className="size-4 accent-emerald-600" />
                  {f.label}
                </label>
              );
            }
            return (
              <div key={f.key} className={f.half ? '' : 'col-span-2'}>
                <label className="muted mb-1 block text-xs font-medium" htmlFor={name}>{f.label}</label>
                {f.type === 'text' ? (
                  <textarea id={name} name={name} defaultValue={v ?? ''} rows={2} className="field text-sm" />
                ) : (
                  <input id={name} name={name} type={f.type} min={f.min} max={f.max} defaultValue={v ?? ''} className="field" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function GroupCard({ g }) {
  const active = g.enabled && g.preset;
  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{g.wa_name ?? 'Grupo sin nombre'}</h3>
            <div className="muted mt-0.5 flex items-center gap-1 text-xs">
              <Users className="size-3.5" /> {g.participants_count ?? '?'} personas
            </div>
          </div>
          {active ? <Badge tone="green">Moderado · {PRESET_LABELS[g.preset]}</Badge> : <Badge>Sin moderar</Badge>}
        </div>
        {!g.bot_is_admin && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/12 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            El bot no es administrador de este grupo: no podrá borrar ni expulsar.
          </p>
        )}

        <ActionForm action={saveGroupSetup} className="mt-4">
          <input type="hidden" name="id" value={g.id} />
          <label className="label" htmlFor={`preset-${g.id}`}>Tipo de grupo (plantilla de reglas)</label>
          <select id={`preset-${g.id}`} name="preset" defaultValue={g.preset ?? ''} className="field">
            <option value="">— Elegir —</option>
            {Object.entries(PRESET_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <p className="muted mt-1 text-xs">Al cambiar la plantilla, las reglas del grupo se reemplazan por las de esa plantilla.</p>
          <Checkbox name="enabled" defaultChecked={g.enabled} label="Moderar este grupo" />
          <SubmitButton className="btn-primary w-full">Guardar</SubmitButton>
        </ActionForm>
      </div>

      {g.preset && (
        <details className="group border-t border-[var(--border)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
            Editar reglas de este grupo
            <span className="muted transition group-open:rotate-180">▾</span>
          </summary>
          <div className="px-4 pb-4">
            <ActionForm action={saveGroupRules}>
              <input type="hidden" name="id" value={g.id} />
              <div className="divider">
                {RULE_DEFS.map((def) => <RuleFields key={def.id} def={def} value={g.rules?.[def.id]} />)}
              </div>
              <SubmitButton className="btn-primary mt-2 w-full">Guardar reglas</SubmitButton>
            </ActionForm>
            <form action={resetGroupRules} className="mt-2">
              <input type="hidden" name="id" value={g.id} />
              <SubmitButton className="btn-ghost w-full" pendingText="Restableciendo…" confirm="¿Volver a las reglas originales de la plantilla?">
                <RotateCcw className="size-4" /> Restablecer reglas de la plantilla
              </SubmitButton>
            </form>
          </div>
        </details>
      )}
    </div>
  );
}

export default async function ReglasPage() {
  const { supabase } = await requireAdmin();
  const { data: groups } = await supabase.from('groups').select('*').order('wa_name');
  const present = (groups ?? []).filter((g) => g.present);
  const gone = (groups ?? []).filter((g) => !g.present);
  const pending = present.filter((g) => !g.enabled || !g.preset).length;

  return (
    <>
      <PageHeader title="Reglas" subtitle="Elige el tipo de cada grupo y ajusta sus reglas" />
      {!present.length && (
        <Empty icon={MessageSquare} title="El bot no está en ningún grupo" text="Agrega el número del bot a tus grupos y hazlo administrador. Aparecerán aquí en unos minutos." />
      )}
      {present.length > 0 && (
        <Section title={pending ? `Tus grupos · ${pending} sin configurar` : 'Tus grupos'}>
          <div className="space-y-4">{present.map((g) => <GroupCard key={g.id} g={g} />)}</div>
        </Section>
      )}
      {gone.length > 0 && (
        <Section title="Grupos donde el bot ya no está">
          <ul className="card divider overflow-hidden">
            {gone.map((g) => (
              <li key={g.id} className="muted px-4 py-3 text-sm">
                {g.wa_name} · visto por última vez {fmtDateTime(g.last_synced_at)}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
