import { api } from "./client";
import type { Order } from "../types";

export async function createOrder(): Promise<Order> {
  const { data } = await api.post<Order>("/orders/", {});
  return data;
}

export async function listOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>("/orders/");
  return data;
}
