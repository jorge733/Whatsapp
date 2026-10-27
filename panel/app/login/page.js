import { ShieldCheck } from 'lucide-react';
import LoginForm from './LoginForm';

export const metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <ShieldCheck className="size-8" />
          </span>
          <h1 className="text-2xl font-bold">Moderación</h1>
          <p className="muted text-sm">Panel de la comunidad de WhatsApp</p>
        </div>
        <LoginForm noAccess={error === 'sin-acceso'} />
      </div>
    </main>
  );
}
