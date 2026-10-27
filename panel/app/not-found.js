import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
        <Link href="/" className="btn-primary mt-4">Volver al inicio</Link>
      </div>
    </main>
  );
}
