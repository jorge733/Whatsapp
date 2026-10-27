'use client';

export default function Error({ reset }) {
  return (
    <div className="card p-6 text-center">
      <h2 className="text-lg font-bold">Algo salió mal</h2>
      <p className="muted mt-1 text-sm">Revisa tu conexión e intenta de nuevo.</p>
      <button onClick={reset} className="btn-primary mt-4">Reintentar</button>
    </div>
  );
}
