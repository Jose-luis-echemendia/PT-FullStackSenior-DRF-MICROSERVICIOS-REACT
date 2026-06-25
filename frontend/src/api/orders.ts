import { api } from "./client";
import type { Order } from "../types";

/**
 * Crea una orden a partir del carrito actual del usuario.
 * No requiere body; el servidor lee el carrito via X-User-Id.
 * @returns La orden recién creada con su número y snapshot de ítems.
 * @throws AxiosError 400 si el carrito está vacío.
 * @throws AxiosError 409 si hay stock insuficiente para algún producto.
 * @throws AxiosError 503 si el Cart Service o Products Service no responden.
 */
export async function createOrder(): Promise<Order> {
  const { data } = await api.post<Order>("/orders/", {});
  return data;
}

/**
 * Lista todas las órdenes del usuario actual.
 * @returns Array de órdenes con sus ítems anidados, del más reciente al más antiguo.
 */
export async function listOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>("/orders/");
  return data;
}
