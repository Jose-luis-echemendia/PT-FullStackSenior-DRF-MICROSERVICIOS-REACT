import { useEffect } from "react";
import { CartItemRow } from "../components/CartItemRow";
import { ErrorBanner } from "../components/ErrorBanner";
import { Loader } from "../components/Loader";
import { useCreateOrder } from "../hooks/useCreateOrder";
import { useCartStore } from "../store/cartStore";

export function CartPage() {
  const { cart, loading, error, fetchCart, clearError, clearCart } = useCartStore();
  const { placing, orderError, handleCreateOrder, clearOrderError } = useCreateOrder();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <section>
      <h1>Tu carrito</h1>
      {error && <ErrorBanner message={error} onClose={clearError} />}
      {orderError && <ErrorBanner message={orderError} onClose={clearOrderError} />}

      {loading && !cart ? (
        <Loader label="Cargando carrito..." />
      ) : isEmpty ? (
        <p className="text-slate-500 py-8">Tu carrito está vacío.</p>
      ) : (
        <>
          <table className="w-full border-collapse bg-white rounded-xl overflow-hidden">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left border-b border-slate-200">Producto</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Precio</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Cantidad</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Subtotal</th>
                <th className="px-4 py-3 text-left border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody>
              {cart!.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-4">
              <h2>Subtotal: ${cart!.subtotal}</h2>
              <button
                className="bg-transparent text-red-600 border border-red-400 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={placing || loading}
                onClick={clearCart}
              >
                Vaciar carrito
              </button>
            </div>
            <button
              className="bg-blue-600 text-white border-0 rounded-lg px-6 py-3 text-base font-semibold cursor-pointer hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={placing}
              onClick={handleCreateOrder}
            >
              {placing ? "Generando orden..." : "Crear orden"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
