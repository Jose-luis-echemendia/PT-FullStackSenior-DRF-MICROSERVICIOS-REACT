export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  subtotal: string;
  updated_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  total: string;
  items: OrderItem[];
  created_at: string;
}
