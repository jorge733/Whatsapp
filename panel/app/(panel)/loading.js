export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Cargando">
      <div className="h-8 w-40 rounded-lg bg-black/5 dark:bg-white/5" />
      <div className="card h-24" />
      <div className="card h-40" />
    </div>
  );
}
