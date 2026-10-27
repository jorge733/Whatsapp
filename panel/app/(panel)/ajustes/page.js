import { LogOut } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { fmtPhone } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton, Checkbox } from '@/components/forms';
import { logout } from '@/app/login/actions';
import { saveSettings } from './actions';

export const metadata = { title: 'Ajustes' };

function Num({ name, label, value, min, max, step, suffix }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={name} name={name} type="number" min={min} max={max} step={step} defaultValue={value} className="field" />
        {suffix && <span className="muted shrink-0 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

export default async function AjustesPage() {
  const { supabase, user } = await requireAdmin();
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Configuración general del bot" />
      <ActionForm action={saveSettings}>
        <Section title="Funcionamiento">
          <div className="card divider px-4">
            <Checkbox name="test_mode" defaultChecked={s.test_mode} label="Modo prueba" hint="No borra ni expulsa: solo registra y te avisa." />
            <Checkbox
              name="auto_blacklist_on_kick"
              defaultChecked={s.auto_blacklist_on_kick}
              label="Lista negra automática"
              hint="Quien sea expulsado por acumular faltas queda en la lista negra."
            />
          </div>
        </Section>

        <Section title="Sanciones">
          <div className="card grid grid-cols-2 gap-3 p-4">
            <Num name="strikes_to_kick" label="Faltas para expulsar" value={s.strikes_to_kick} min={1} max={10} />
            <Num name="warning_expiry_days" label="Las faltas vencen en" value={s.warning_expiry_days} min={1} max={365} suffix="días" />
            <p className="muted col-span-2 text-xs">
              Con {s.strikes_to_kick} faltas: la penúltima recibe la "última advertencia" y la última es expulsión.
              Las faltas se cuentan por separado en cada grupo.
            </p>
          </div>
        </Section>

        <Section title="Mensajes del bot">
          <div className="card space-y-3 p-4">
            <p className="muted text-xs">
              Puedes usar: <code>{'{usuario}'}</code> (menciona a la persona), <code>{'{motivo}'}</code>, <code>{'{grupo}'}</code>,{' '}
              <code>{'{faltas}'}</code>, <code>{'{max_faltas}'}</code>.
            </p>
            <div>
              <label className="label" htmlFor="msg_warning">Advertencia</label>
              <textarea id="msg_warning" name="msg_warning" rows={3} defaultValue={s.msg_warning} className="field text-sm" />
            </div>
            <div>
              <label className="label" htmlFor="msg_final_warning">Última advertencia</label>
              <textarea id="msg_final_warning" name="msg_final_warning" rows={3} defaultValue={s.msg_final_warning} className="field text-sm" />
            </div>
            <div>
              <label className="label" htmlFor="msg_kick">Al expulsar</label>
              <textarea id="msg_kick" name="msg_kick" rows={2} defaultValue={s.msg_kick} className="field text-sm" />
            </div>
          </div>
        </Section>

        <Section title="Avisos por WhatsApp">
          <div className="card space-y-3 p-4">
            <div>
              <label className="label" htmlFor="owner_phone">Número del dueño</label>
              <input id="owner_phone" name="owner_phone" inputMode="tel" defaultValue={s.owner_phone ? fmtPhone(s.owner_phone) : ''} className="field" />
              <p className="muted mt-1 text-xs">Recibe los avisos y el resumen, y puede dar comandos. Debe ser distinto al número del bot.</p>
            </div>
            <div className="divider">
              <Checkbox name="daily_summary_enabled" defaultChecked={s.daily_summary_enabled} label="Resumen diario" />
            </div>
            <div>
              <label className="label" htmlFor="daily_summary_time">Hora del resumen</label>
              <input id="daily_summary_time" name="daily_summary_time" type="time" defaultValue={String(s.daily_summary_time).slice(0, 5)} className="field" />
            </div>
          </div>
        </Section>

        <Section title="Protección del número del bot">
          <div className="card grid grid-cols-2 gap-3 p-4">
            <Num name="delay_min" label="Pausa mínima" value={s.action_delay_min_ms / 1000} min={0} max={60} step={0.5} suffix="seg" />
            <Num name="delay_max" label="Pausa máxima" value={s.action_delay_max_ms / 1000} min={0} max={120} step={0.5} suffix="seg" />
            <p className="muted col-span-2 text-xs">Tiempo de espera entre acciones seguidas, para que WhatsApp no bloquee el número.</p>
          </div>
        </Section>

        <div className="sticky bottom-20 z-10 lg:bottom-4">
          <SubmitButton className="btn-primary w-full shadow-lg">Guardar ajustes</SubmitButton>
        </div>
      </ActionForm>

      <Section title="Cuenta" className="mt-8">
        <form action={logout} className="card flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="muted text-xs">Sesión iniciada como</div>
            <div className="truncate text-sm font-medium">{user.email}</div>
          </div>
          <SubmitButton className="btn-ghost shrink-0" pendingText="Saliendo…">
            <LogOut className="size-4" /> Salir
          </SubmitButton>
        </form>
      </Section>
    </>
  );
}
