import { useCartStore } from "../store/cartStore";
import type { CartItem } from "../types";

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <tr>
      <td className="px-4 py-3 text-left border-b border-slate-200">{item.product_name}</td>
      <td className="px-4 py-3 text-left border-b border-slate-200">${item.unit_price}</td>
      <td className="px-4 py-3 text-left border-b border-slate-200">
        <div className="inline-flex items-center gap-2">
          <button
            className="w-7 h-7 border border-slate-200 bg-slate-50 rounded-md cursor-pointer text-base disabled:opacity-50"
            aria-label="Disminuir"
            disabled={item.quantity <= 1}
            onClick={() => updateQty(item.id, item.quantity - 1)}
          >
            −
          </button>
          <span>{item.quantity}</span>
          <button
            className="w-7 h-7 border border-slate-200 bg-slate-50 rounded-md cursor-pointer text-base"
            aria-label="Aumentar"
            onClick={() => updateQty(item.id, item.quantity + 1)}
          >
            +
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-left border-b border-slate-200">${item.line_total}</td>
      <td className="px-4 py-3 text-left border-b border-slate-200">
        <button
          className="bg-transparent text-red-600 border border-red-600 rounded-md px-3 py-1.5 cursor-pointer hover:bg-red-50"
          onClick={() => removeItem(item.id)}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
