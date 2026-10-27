import Link from 'next/link';
import { Ban, SlidersHorizontal, Settings, ChevronRight, LogOut } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { SubmitButton } from '@/components/forms';
import { logout } from '@/app/login/actions';

export const metadata = { title: 'Más' };

const ITEMS = [
  { href: '/lista-negra', label: 'Lista negra', text: 'Números bloqueados en toda la comunidad', icon: Ban },
  { href: '/reglas', label: 'Reglas', text: 'Grupos, horarios, límites y textos', icon: SlidersHorizontal },
  { href: '/ajustes', label: 'Ajustes', text: 'Modo prueba, sanciones y avisos', icon: Settings },
];

export default async function MasPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Más" />
      <ul className="card divider mb-6 overflow-hidden">
        {ITEMS.map(({ href, label, text, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-black/5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-500">
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="muted block text-sm">{text}</span>
              </span>
              <ChevronRight className="muted size-5" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={logout}>
        <SubmitButton className="btn-ghost w-full" pendingText="Saliendo…">
          <LogOut className="size-4" /> Cerrar sesión
        </SubmitButton>
      </form>
    </>
  );
}
