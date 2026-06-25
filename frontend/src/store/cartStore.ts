import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as cartApi from "../api/cart";
import { parseApiError } from "../api/errors";
import type { Cart } from "../types";

/** Estado global del carrito. Persistido en localStorage (solo `cart`). */
interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  /** Suma de las cantidades de todos los ítems del carrito. */
  itemCount: () => number;
  /** Carga el carrito del usuario desde el servidor. */
  fetchCart: () => Promise<void>;
  /**
   * Agrega un producto al carrito.
   * @returns true si la operación fue exitosa, false si hubo error.
   */
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  /** Actualiza la cantidad de un ítem existente. */
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  /** Elimina un ítem del carrito. */
  removeItem: (itemId: string) => Promise<void>;
  /** Vacía el carrito completo. */
  clearCart: () => Promise<void>;
  /** Limpia el mensaje de error actual. */
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      loading: false,
      error: null,

      itemCount: () =>
        get().cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0,

      clearError: () => set({ error: null }),

      fetchCart: async () => {
        set({ loading: true, error: null });
        try {
          set({ cart: await cartApi.getCart(), loading: false });
        } catch (err) {
          set({ error: parseApiError(err, "No se pudo cargar el carrito"), loading: false });
        }
      },

      addItem: async (productId, quantity = 1) => {
        set({ loading: true, error: null });
        try {
          const cart = await cartApi.addItem(productId, quantity);
          set({ cart, loading: false });
          return true;
        } catch (err) {
          set({ error: parseApiError(err, "No se pudo agregar el producto"), loading: false });
          return false;
        }
      },

      updateQty: async (itemId, quantity) => {
        set({ loading: true, error: null });
        try {
          set({ cart: await cartApi.updateItem(itemId, quantity), loading: false });
        } catch (err) {
          set({ error: parseApiError(err, "No se pudo actualizar la cantidad"), loading: false });
        }
      },

      removeItem: async (itemId) => {
        set({ loading: true, error: null });
        try {
          set({ cart: await cartApi.removeItem(itemId), loading: false });
        } catch (err) {
          set({ error: parseApiError(err, "No se pudo eliminar el producto"), loading: false });
        }
      },

      clearCart: async () => {
        set({ loading: true, error: null });
        try {
          await cartApi.clearCart();
          set({ cart: null, loading: false });
        } catch (err) {
          set({ error: parseApiError(err, "No se pudo vaciar el carrito"), loading: false });
        }
      },
    }),
    { name: "cart-storage", partialize: (s) => ({ cart: s.cart }) }
  )
);
