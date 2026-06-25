import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../api/orders";
import { parseApiError } from "../api/errors";
import { useCartStore } from "../store/cartStore";

export function useCreateOrder() {
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const navigate = useNavigate();
  const fetchCart = useCartStore((s) => s.fetchCart);

  async function handleCreateOrder() {
    setPlacing(true);
    setOrderError(null);
    try {
      const order = await createOrder();
      await fetchCart();
      navigate(`/order/success/${order.order_number}`);
    } catch (err) {
      setOrderError(parseApiError(err, "No se pudo crear la orden"));
    } finally {
      setPlacing(false);
    }
  }

  function clearOrderError() {
    setOrderError(null);
  }

  return { placing, orderError, handleCreateOrder, clearOrderError };
}
