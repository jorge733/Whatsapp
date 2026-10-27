'use client';
// Formularios con mensaje de resultado ("Guardado ✓") y botón que muestra "Guardando…".
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pendingText = 'Guardando…', className = 'btn-primary', confirm, ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function ActionForm({ action, children, className = '', resetOnSuccess = false }) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.message && (
        <p
          role="status"
          className={`mt-2 text-sm font-medium ${state.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Interruptor que envía el formulario al tocarlo. */
export function SwitchSubmit({ on, label, confirmOn, confirmOff }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={pending}
      onClick={(e) => {
        const msg = on ? confirmOff : confirmOn;
        if (msg && !window.confirm(msg)) e.preventDefault();
      }}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
        on ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <span className={`inline-block size-6 rounded-full bg-white shadow transition ${on ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  );
}

/** Casilla tipo interruptor dentro de un formulario más grande. */
export function Checkbox({ name, defaultChecked, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="muted block text-xs">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 dark:bg-slate-600" />
        <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
