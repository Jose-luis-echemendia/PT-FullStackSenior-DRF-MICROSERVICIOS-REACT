import { api } from "./client";
import type { Cart } from "../types";

export async function getCart(): Promise<Cart> {
  const { data } = await api.get<Cart>("/cart/");
  return data;
}

export async function addItem(productId: string, quantity: number): Promise<Cart> {
  const { data } = await api.post<Cart>("/cart/items/", {
    product_id: productId,
    quantity,
  });
  return data;
}

export async function updateItem(itemId: string, quantity: number): Promise<Cart> {
  const { data } = await api.patch<Cart>(`/cart/items/${itemId}/`, { quantity });
  return data;
}

export async function removeItem(itemId: string): Promise<Cart> {
  const { data } = await api.delete<Cart>(`/cart/items/${itemId}/`);
  return data;
}
