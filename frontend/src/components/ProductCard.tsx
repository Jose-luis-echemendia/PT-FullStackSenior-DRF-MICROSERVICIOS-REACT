import { useState } from "react";
import { useCartStore } from "../store/cartStore";
import type { CategoryOption, Product } from "../types";

interface Props {
  product: Product;
  /** Lista de categorías para resolver el label desde el value. */
  categories: CategoryOption[];
  /** Si se pasa, muestra el botón de editar (visible al hacer hover). */
  onEdit?: () => void;
  /** Si se pasa, muestra el botón de eliminar (visible al hacer hover). */
  onDelete?: () => void;
}

export function ProductCard({ product, categories, onEdit, onDelete }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const outOfStock = product.stock === 0;

  const handleAdd = async () => {
    setAdding(true);
    await addItem(product.id, 1);
    setAdding(false);
  };

  const categoryLabel = product.category
    ? (categories.find((c) => c.value === product.category)?.label ?? product.category)
    : null;

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative group">
      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar"
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path
                  d="M11.854 1.146a.5.5 0 00-.707 0L2 10.293V13h2.707l9.147-9.146a.5.5 0 000-.708l-2-2zM1 10l9.5-9.5 2 2L3 12H1v-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar"
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path
                  d="M5.5 1a.5.5 0 000 1h4a.5.5 0 000-1h-4zM2 3.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H12v8.5a1 1 0 01-1 1H4a1 1 0 01-1-1V4H2.5a.5.5 0 01-.5-.5zM4 4v8.5h7V4H4z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Category badge */}
      {categoryLabel && (
        <span className="self-start text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {categoryLabel}
        </span>
      )}

      <h3 className="m-0 pr-12 text-slate-800 font-semibold leading-snug">{product.name}</h3>
      <p className="text-slate-500 text-sm flex-1 leading-relaxed">{product.description}</p>
      <div className="flex justify-between items-center mt-1">
        <strong className="text-xl text-blue-800">${product.price}</strong>
        <span className="text-xs text-slate-500">Stock: {product.stock}</span>
      </div>
      <button
        className="bg-blue-600 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={outOfStock || adding}
        onClick={handleAdd}
      >
        {outOfStock ? "Agotado" : adding ? "Agregando..." : "Agregar al carrito"}
      </button>
    </article>
  );
}
