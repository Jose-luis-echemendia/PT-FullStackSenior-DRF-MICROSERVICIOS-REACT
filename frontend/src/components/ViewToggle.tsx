type View = "card" | "table";

interface Props {
  /** Vista activa actualmente. */
  view: View;
  /** Callback al cambiar de vista. */
  onChange: (v: View) => void;
}

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
      <button
        title="Vista tarjeta"
        onClick={() => onChange("card")}
        className={`p-2 transition-colors ${
          view === "card"
            ? "bg-blue-600 text-white"
            : "bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="6" height="7" rx="1.5" fill="currentColor" />
          <rect x="11" y="1" width="6" height="7" rx="1.5" fill="currentColor" />
          <rect x="1" y="10" width="6" height="7" rx="1.5" fill="currentColor" />
          <rect x="11" y="10" width="6" height="7" rx="1.5" fill="currentColor" />
        </svg>
      </button>
      <button
        title="Vista tabla"
        onClick={() => onChange("table")}
        className={`p-2 transition-colors ${
          view === "table"
            ? "bg-blue-600 text-white"
            : "bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="16" height="2.5" rx="1" fill="currentColor" />
          <rect x="1" y="7" width="16" height="2.5" rx="1" fill="currentColor" />
          <rect x="1" y="12" width="16" height="2.5" rx="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
