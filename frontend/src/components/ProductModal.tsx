import { useEffect, useRef, useState } from "react";
import { createProduct, updateProduct } from "../api/products";
import { parseApiError } from "../api/errors";
import type { CategoryOption, Product, ProductFormData } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se pasa, el modal opera en modo edición; si es null/undefined, en modo creación. */
  product?: Product | null;
  categories: CategoryOption[];
  /** Callback invocado con el producto creado o actualizado tras guardar con éxito. */
  onSuccess: (p: Product) => void;
}

type FormErrors = Partial<Record<keyof ProductFormData, string>>;

const EMPTY: ProductFormData = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category: "",
  is_active: true,
};

function validate(data: ProductFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  } else if (data.name.trim().length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  }

  const price = parseFloat(String(data.price));
  if (!String(data.price).trim()) {
    errors.price = "El precio es obligatorio.";
  } else if (isNaN(price) || price <= 0) {
    errors.price = "El precio debe ser un número mayor que 0.";
  } else if (!/^\d+(\.\d{1,2})?$/.test(String(data.price).trim())) {
    errors.price = "El precio admite máximo 2 decimales.";
  }

  const stock = Number(data.stock);
  if (String(data.stock) === "") {
    errors.stock = "El stock es obligatorio.";
  } else if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = "El stock debe ser un entero mayor o igual a 0.";
  }

  return errors;
}

export function ProductModal({ open, onClose, product, categories, onSuccess }: Props) {
  const [form, setForm] = useState<ProductFormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormData, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? "",
        price: product.price,
        stock: product.stock,
        category: product.category ?? "",
        is_active: product.is_active,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
    setApiError(null);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open, product]);

  useEffect(() => {
    if (submitAttempted) setErrors(validate(form));
  }, [form, submitAttempted]);

  if (!open) return null;

  function handleChange(field: keyof ProductFormData, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof ProductFormData) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, ...validate({ ...form }) }));
  }

  function fieldError(field: keyof ProductFormData) {
    return (touched[field] || submitAttempted) ? errors[field] : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const result = product
        ? await updateProduct(product.id, form)
        : await createProduct(form);
      onSuccess(result);
      onClose();
    } catch (err) {
      setApiError(parseApiError(err, "No se pudo guardar el producto."));
    } finally {
      setSubmitting(false);
    }
  }

  const hasErrors = Object.keys(validate(form)).length > 0;

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
              disabled={submitting || (submitAttempted && hasErrors)}
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
