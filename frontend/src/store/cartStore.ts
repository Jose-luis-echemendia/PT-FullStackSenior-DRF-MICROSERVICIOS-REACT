import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as cartApi from "../api/cart";
import { parseApiError } from "../api/errors";
import type { Cart } from "../types";

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  itemCount: () => number;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
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
    }),
    { name: "cart-storage", partialize: (s) => ({ cart: s.cart }) }
  )
);
