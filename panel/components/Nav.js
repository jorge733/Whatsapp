'use client';
// Menú: barra inferior en el celular y barra lateral en pantallas grandes.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, ScrollText, Inbox, Users, Ban, SlidersHorizontal, Settings, Menu, ShieldCheck } from 'lucide-react';

const ALL = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/registro', label: 'Registro', icon: ScrollText },
  { href: '/casos', label: 'Casos', icon: Inbox, badge: true },
  { href: '/personas', label: 'Personas', icon: Users },
  { href: '/lista-negra', label: 'Lista negra', icon: Ban },
  { href: '/reglas', label: 'Reglas', icon: SlidersHorizontal },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];
const MOBILE = [...ALL.slice(0, 4), { href: '/mas', label: 'Más', icon: Menu, also: ['/lista-negra', '/reglas', '/ajustes'] }];

function isActive(pathname, item) {
  if (item.href === '/') return pathname === '/';
  return pathname.startsWith(item.href) || item.also?.some((p) => pathname.startsWith(p));
}

function Count({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1 left-1/2 ml-1.5 min-w-4.5 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4.5 font-bold text-white">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function Nav({ pendingCases = 0, testMode }) {
  const pathname = usePathname();
  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--card)] p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="font-bold leading-tight">Moderación</div>
            <div className="muted text-xs">Comunidad WhatsApp</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {ALL.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-brand-600/10 text-brand-700 dark:text-brand-500' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="size-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCases > 0 && (
                  <span className="rounded-full bg-red-600 px-2 text-xs font-bold text-white">{pendingCases}</span>
                )}
              </Link>
            );
          })}
        </nav>
        {testMode && (
          <div className="mt-auto rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            🧪 Modo prueba activado
          </div>
        )}
      </aside>

      {/* Celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium ${
                    active ? 'text-brand-600 dark:text-brand-500' : 'muted'
                  }`}
                >
                  <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} />
                  {item.label}
                  {item.badge && <Count n={pendingCases} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
