// Piezas visuales reutilizables.
import Link from 'next/link';

const TONES = {
  green: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  red: 'bg-red-500/12 text-red-700 dark:text-red-300',
  amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  blue: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
  gray: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
};

export function Badge({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="muted mt-0.5 text-sm">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Section({ title, children, action, className = '' }) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="muted text-xs font-semibold tracking-wide uppercase">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon: Icon, title, text }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {Icon && <Icon className="muted mb-3 size-8" strokeWidth={1.5} />}
      <p className="font-semibold">{title}</p>
      {text && <p className="muted mt-1 max-w-xs text-sm">{text}</p>}
    </div>
  );
}

export function Stat({ label, value, tone }) {
  const color = tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : '';
  return (
    <div className="rounded-xl bg-black/[.03] px-3 py-2.5 dark:bg-white/[.04]">
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="muted text-xs">{label}</div>
    </div>
  );
}

export function ChipLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-[var(--border)] bg-[var(--card)]'
      }`}
    >
      {children}
    </Link>
  );
}

export const ACTION_TONE = {
  delete: 'gray', warn: 'amber', final_warn: 'amber', kick: 'red', review: 'violet',
  blacklist_add: 'red', blacklist_remove: 'green', reset: 'blue', info: 'blue', error: 'red',
};
