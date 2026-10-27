'use client';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/forms';
import { login } from './actions';

export default function LoginForm({ noAccess }) {
  const [state, action] = useActionState(login, null);
  const message = state?.message ?? (noAccess ? 'Esta cuenta no tiene acceso al panel.' : null);
  return (
    <form action={action} className="card space-y-4 p-5">
      {message && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{message}</p>
      )}
      <div>
        <label className="label" htmlFor="email">Correo</label>
        {/* key: al fallar, React limpia el formulario; así se mantiene el correo escrito */}
        <input key={state?.email ?? ''} id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email ?? ''} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <SubmitButton className="btn-primary w-full" pendingText="Entrando…">Entrar</SubmitButton>
    </form>
  );
}
