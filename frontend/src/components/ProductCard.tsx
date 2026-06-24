import { useState } from "react";
import { useCartStore } from "../store/cartStore";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const outOfStock = product.stock === 0;

  const handleAdd = async () => {
    setAdding(true);
    await addItem(product.id, 1);
    setAdding(false);
  };

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
      <h3 className="m-0">{product.name}</h3>
      <p className="text-slate-500 text-sm flex-1">{product.description}</p>
      <div className="flex justify-between items-center">
        <strong className="text-xl text-blue-800">${product.price}</strong>
        <span className="text-xs text-slate-500">Stock: {product.stock}</span>
      </div>
      <button
        className="bg-blue-600 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={outOfStock || adding}
        onClick={handleAdd}
      >
        {outOfStock ? "Agotado" : adding ? "Agregando..." : "Agregar al carrito"}
      </button>
    </article>
  );
}
