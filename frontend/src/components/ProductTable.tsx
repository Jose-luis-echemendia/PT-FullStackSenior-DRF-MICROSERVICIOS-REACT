import type { CategoryOption, Product } from "../types";

interface Props {
  products: Product[];
  /** Lista de categorías para resolver el label desde el value. */
  categories: CategoryOption[];
  /** Callback invocado cuando el usuario pulsa "Editar" en una fila. */
  onEdit: (p: Product) => void;
  /** Callback invocado cuando el usuario pulsa "Eliminar" en una fila. */
  onDelete: (p: Product) => void;
}

export function ProductTable({ products, categories, onEdit, onDelete }: Props) {
  function categoryLabel(value: string | null) {
    if (!value) return <span className="text-slate-400 text-xs">—</span>;
    return categories.find((c) => c.value === value)?.label ?? value;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {["Nombre", "Categoría", "Precio", "Stock", "Activo", "Acciones"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
              <td className="px-4 py-3 text-slate-600">{categoryLabel(p.category)}</td>
              <td className="px-4 py-3 font-semibold text-blue-700">${p.price}</td>
              <td className="px-4 py-3 text-slate-600">{p.stock}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.is_active ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(p)}
                    title="Editar"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    title="Eliminar"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <IconDelete />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                No hay productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11.854 1.146a.5.5 0 00-.707 0L2 10.293V13h2.707l9.147-9.146a.5.5 0 000-.708l-2-2zM1 10l9.5-9.5 2 2L3 12H1v-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.5 1a.5.5 0 000 1h4a.5.5 0 000-1h-4zM2 3.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H12v8.5a1 1 0 01-1 1H4a1 1 0 01-1-1V4H2.5a.5.5 0 01-.5-.5zM4 4v8.5h7V4H4z"
        fill="currentColor"
      />
    </svg>
  );
}
