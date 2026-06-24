export function Loader({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="p-8 text-slate-500" role="status" aria-live="polite">
      <span className="inline-block w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" /> {label}
    </div>
  );
}
