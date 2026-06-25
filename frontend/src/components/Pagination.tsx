const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

interface Props {
  /** Total de items (Paginated.count del backend). */
  count: number;
  /** Página actual (base 1). */
  page: number;
  /** Elementos por página. */
  pageSize: number;
  /** Callback al cambiar de página. */
  onPageChange: (page: number) => void;
  /** Callback al cambiar el tamaño de página. */
  onPageSizeChange: (size: number) => void;
}

export function Pagination({ count, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  if (count === 0) return null;

  const totalPages = Math.ceil(count / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Anterior
        </button>

        <div className="flex items-center gap-1">
          {buildPageRange(page, totalPages).map((item, i) =>
            item === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item as number)}
                className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                  item === page
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente →
        </button>
      </div>

      {/* Right side: results info + page size selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">
          {from}–{to} de <span className="font-medium text-slate-700">{count}</span>
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-slate-500 whitespace-nowrap">
            Por página:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("…");
  pages.push(total);

  return pages;
}
