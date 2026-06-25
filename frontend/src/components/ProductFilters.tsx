import { useEffect, useRef, useState } from "react";
import type { CategoryOption } from "../types";

/**
 * Estado de los filtros del catálogo de productos.
 * Todos los campos son strings para facilitar el binding con inputs;
 * los vacíos ("") se eliminan antes de enviarse a la API.
 */
export interface FilterState {
  search: string;
  category: string;
  price_min: string;
  price_max: string;
  /** "true" → solo con stock | "false" → solo sin stock | "" → todos. */
  in_stock: string;
  /** "true" → solo activos | "false" → solo inactivos | "" → todos. */
  is_active: string;
  /** Valor de ordenamiento, ej: "price", "-price". "" → más recientes. */
  ordering: string;
}

/** Valor inicial de FilterState: todos los filtros vacíos (sin filtrar). */
export const EMPTY_FILTERS: FilterState = {
  search: "",
  category: "",
  price_min: "",
  price_max: "",
  in_stock: "",
  is_active: "",
  ordering: "",
};

const ORDERING_OPTIONS = [
  { value: "", label: "Más recientes" },
  { value: "name", label: "Nombre A → Z" },
  { value: "-name", label: "Nombre Z → A" },
  { value: "price", label: "Precio: menor a mayor" },
  { value: "-price", label: "Precio: mayor a menor" },
  { value: "stock", label: "Stock: menor a mayor" },
  { value: "-stock", label: "Stock: mayor a menor" },
];

interface Props {
  /** Estado actual de los filtros. */
  filters: FilterState;
  /** Categorías disponibles para el selector de categoría. */
  categories: CategoryOption[];
  /** Callback invocado al cambiar cualquier filtro (búsqueda con debounce de 400ms). */
  onChange: (filters: FilterState) => void;
  /** Callback para restablecer todos los filtros a EMPTY_FILTERS. */
  onClear: () => void;
}

export function ProductFilters({ filters, categories, onChange, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync localSearch when parent clears filters
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 400);
  }

  function set(field: keyof FilterState, value: string) {
    onChange({ ...filters, [field]: value });
  }

  const advancedActiveCount = [
    filters.category,
    filters.price_min,
    filters.price_max,
    filters.in_stock,
    filters.is_active,
  ].filter(Boolean).length;

  const hasAnyFilter =
    filters.search ||
    filters.ordering ||
    advancedActiveCount > 0;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Main row */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.72 3.72a4.5 4.5 0 111.06-1.06l2.75 2.74a.75.75 0 11-1.06 1.06l-2.75-2.74z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 transition-colors"
          />
        </div>

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
          className={selectCls(!!filters.category)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Ordering */}
        <select
          value={filters.ordering}
          onChange={(e) => set("ordering", e.target.value)}
          className={selectCls(!!filters.ordering)}
        >
          {ORDERING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Advanced toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            expanded || advancedActiveCount > 0
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 3h12M3 7h8M5 11h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Filtros
          {advancedActiveCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-blue-600 text-white">
              {advancedActiveCount}
            </span>
          )}
        </button>

        {/* Clear */}
        {hasAnyFilter && (
          <button
            onClick={() => {
              setLocalSearch("");
              onClear();
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
            title="Limpiar filtros"
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Advanced filters row */}
      {expanded && (
        <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          {/* Price range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              Precio
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.price_min}
              onChange={(e) => set("price_min", e.target.value)}
              placeholder="Mín."
              className={`${advInputCls} w-24`}
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.price_max}
              onChange={(e) => set("price_max", e.target.value)}
              placeholder="Máx."
              className={`${advInputCls} w-24`}
            />
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Stock
            </span>
            <select
              value={filters.in_stock}
              onChange={(e) => set("in_stock", e.target.value)}
              className={selectCls(!!filters.in_stock)}
            >
              <option value="">Todos</option>
              <option value="true">Con stock</option>
              <option value="false">Sin stock</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Estado
            </span>
            <select
              value={filters.is_active}
              onChange={(e) => set("is_active", e.target.value)}
              className={selectCls(!!filters.is_active)}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

const selectCls = (active: boolean) =>
  [
    "text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer",
    active
      ? "border-blue-400 text-blue-700 bg-blue-50"
      : "border-slate-200 text-slate-700 hover:border-slate-300",
  ].join(" ");

const advInputCls =
  "text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 transition-colors";
