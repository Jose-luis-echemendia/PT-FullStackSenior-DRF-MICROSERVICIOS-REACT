import { api } from "./client";
import type { Cart } from "../types";

/**
 * Obtiene el carrito del usuario (se crea automáticamente si no existe).
 * @returns El carrito con sus ítems y subtotal.
 */
export async function getCart(): Promise<Cart> {
  const { data } = await api.get<Cart>("/cart/");
  return data;
}

/**
 * Agrega un producto al carrito. Si ya existe, incrementa la cantidad.
 * @param productId - UUID del producto a agregar.
 * @param quantity - Cantidad a agregar (mínimo 1).
 * @returns El carrito actualizado.
 * @throws AxiosError 404 si el producto no existe en el catálogo.
 * @throws AxiosError 409 si no hay stock suficiente.
 */
export async function addItem(productId: string, quantity: number): Promise<Cart> {
  const { data } = await api.post<Cart>("/cart/items/", {
    product_id: productId,
    quantity,
  });
  return data;
}

/**
 * Actualiza la cantidad de un ítem del carrito.
 * @param itemId - UUID del ítem (CartItem.id).
 * @param quantity - Nueva cantidad (mínimo 1).
 * @returns El carrito actualizado.
 * @throws AxiosError 404 si el ítem no pertenece al carrito del usuario.
 */
export async function updateItem(itemId: string, quantity: number): Promise<Cart> {
  const { data } = await api.patch<Cart>(`/cart/items/${itemId}/`, { quantity });
  return data;
}

/**
 * Elimina un ítem del carrito.
 * @param itemId - UUID del ítem a eliminar.
 * @returns El carrito actualizado sin el ítem.
 * @throws AxiosError 404 si el ítem no pertenece al carrito del usuario.
 */
export async function removeItem(itemId: string): Promise<Cart> {
  const { data } = await api.delete<Cart>(`/cart/items/${itemId}/`);
  return data;
}

/**
 * Vacía el carrito del usuario eliminando todos sus ítems.
 */
export async function clearCart(): Promise<void> {
  await api.delete("/cart/");
}
