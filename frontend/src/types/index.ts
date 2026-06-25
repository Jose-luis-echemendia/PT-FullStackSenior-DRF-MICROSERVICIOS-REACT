/** Producto del catálogo. Fuente de verdad: Products Service. */
export interface Product {
  id: string;
  name: string;
  description: string;
  /** Precio como string decimal devuelto por el backend. Nunca usar como float. */
  price: string;
  /** Unidades disponibles. Decrementado automáticamente al confirmar una orden. */
  stock: number;
  /** TECNOLOGIA | ELECTRODOMESTICO | ELECTROMOVILIDAD | ALIMENTOS | ENERGIA. null si sin categoría. */
  category: string | null;
  /** false oculta el producto del catálogo público. */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Par valor/etiqueta para el selector de categorías. */
export interface CategoryOption {
  value: string;
  label: string;
}

/** Datos del formulario de creación/edición de producto. */
export interface ProductFormData {
  name: string;
  description: string;
  /** Precio como string para evitar pérdida de precisión en el input numérico. */
  price: string;
  /** String o número según el estado del input; el backend espera entero. */
  stock: number | string;
  category: string;
  is_active: boolean;
}

/** Wrapper de paginación DRF estándar. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Ítem de línea dentro de un carrito. */
export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  /** Precio unitario en el momento de agregar al carrito (string decimal). */
  unit_price: string;
  quantity: number;
  /** unit_price × quantity (string decimal). */
  line_total: string;
}

/** Carrito de compras del usuario. Identificado por X-User-Id. */
export interface Cart {
  id: string;
  /** Identificador anónimo del usuario (valor de X-User-Id). */
  user_id: string;
  items: CartItem[];
  /** Suma de todos los line_total (string decimal). */
  subtotal: string;
  updated_at: string;
}

/** Snapshot de un producto dentro de una orden (inmutable tras la compra). */
export interface OrderItem {
  product_id: string;
  product_name: string;
  /** Precio unitario al momento de la compra (string decimal, no cambia). */
  unit_price: string;
  quantity: number;
  /** unit_price × quantity (string decimal). */
  line_total: string;
}

/** Orden de compra. Una vez creada, sus ítems son inmutables. */
export interface Order {
  id: string;
  /** Identificador legible en formato ORD-YYYYMMDD-NNNN. */
  order_number: string;
  user_id: string;
  /** Ciclo de vida: PENDING → creada | CONFIRMED → procesada | CANCELLED → cancelada. */
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  /** Total al momento de la creación (string decimal). */
  total: string;
  items: OrderItem[];
  created_at: string;
}
