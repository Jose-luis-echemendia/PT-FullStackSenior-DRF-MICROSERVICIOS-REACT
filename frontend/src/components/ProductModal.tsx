import { useProductForm } from "../hooks/useProductForm";
import type { CategoryOption, Product } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: CategoryOption[];
  onSuccess: (p: Product) => void;
}

export function ProductModal({ open, onClose, product, categories, onSuccess }: Props) {
  const {
    form,
    submitting,
    submitDisabled,
    apiError,
    firstInputRef,
    handleChange,
    handleBlur,
    fieldError,
    handleSubmit,
  } = useProductForm({ open, product, onSuccess, onClose });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {product ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 flex flex-col gap-4">
          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Name */}
          <Field label="Nombre *" error={fieldError("name")}>
            <input
              ref={firstInputRef}
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder='Ej. Laptop Ultrabook 15"'
              className={inputCls(!!fieldError("name"))}
            />
          </Field>

          {/* Description */}
          <Field label="Descripción" error={fieldError("description")}>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              rows={3}
              placeholder="Descripción opcional del producto"
              className={`${inputCls(false)} resize-none`}
            />
          </Field>

          {/* Price + Stock (inline) */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (USD) *" error={fieldError("price")}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                onBlur={() => handleBlur("price")}
                placeholder="0.00"
                className={inputCls(!!fieldError("price"))}
              />
            </Field>
            <Field label="Stock *" error={fieldError("stock")}>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                onBlur={() => handleBlur("stock")}
                placeholder="0"
                className={inputCls(!!fieldError("stock"))}
              />
            </Field>
          </div>

          {/* Category */}
          <Field label="Categoría" error={fieldError("category")}>
            <select
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              onBlur={() => handleBlur("category")}
              className={inputCls(!!fieldError("category"))}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Is active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm font-medium text-slate-700">Producto activo</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition-colors",
    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400"
      : "border-slate-200 bg-white hover:border-slate-300",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
