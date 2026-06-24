import { api } from "./client";
import type { Paginated, Product } from "../types";

export async function listProducts(): Promise<Product[]> {
  const { data } = await api.get<Paginated<Product>>("/products/");
  return data.results;
}
