import { api } from "./client";
import type { CategoryOption, Paginated, Product, ProductFormData } from "../types";

/** Parámetros de consulta para GET /products/. Todos opcionales. */
export interface ProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  price_min?: string;
  price_max?: string;
  in_stock?: string;
  is_active?: string;
  /** Ej: "price" para ascendente, "-price" para descendente. */
  ordering?: string;
}

/**
 * Lista productos del catálogo con paginación y filtros opcionales.
 * @returns Página paginada de productos.
 */
export async function listProducts(params?: ProductListParams): Promise<Paginated<Product>> {
  const { data } = await api.get<Paginated<Product>>("/products/", { params });
  return data;
}

/**
 * Crea un nuevo producto en el catálogo.
 * @param payload - Datos del producto a crear.
 * @returns El producto creado con todos sus campos.
 * @throws AxiosError con detalle de validación si el payload es inválido.
 */
export async function createProduct(payload: ProductFormData): Promise<Product> {
  const { data } = await api.post<Product>("/products/", payload);
  return data;
}

/**
 * Actualiza parcialmente un producto existente.
 * @param id - UUID del producto.
 * @param payload - Campos a actualizar.
 * @returns El producto actualizado.
 * @throws AxiosError 404 si el producto no existe.
 */
export async function updateProduct(
  id: string,
  payload: Partial<ProductFormData>,
): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}/`, payload);
  return data;
}

/**
 * Elimina un producto del catálogo.
 * @param id - UUID del producto a eliminar.
 * @throws AxiosError 404 si el producto no existe.
 */
export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}/`);
}

/**
 * Obtiene las categorías disponibles del catálogo.
 * @returns Lista de pares value/label de Product.Category.
 */
export async function getCategories(): Promise<CategoryOption[]> {
  const { data } = await api.get<CategoryOption[]>("/products/categories/");
  return data;
}
