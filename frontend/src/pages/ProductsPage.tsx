import { useEffect, useState } from "react";
import { listProducts } from "../api/products";
import { parseApiError } from "../api/errors";
import { ErrorBanner } from "../components/ErrorBanner";
import { Loader } from "../components/Loader";
import { ProductCard } from "../components/ProductCard";
import { useCartStore } from "../store/cartStore";
import type { Product } from "../types";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cartError = useCartStore((s) => s.error);
  const clearError = useCartStore((s) => s.clearError);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listProducts();
        if (active) setProducts(data);
      } catch (err) {
        if (active) setError(parseApiError(err, "No se pudieron cargar los productos"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loader label="Cargando productos..." />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <section>
      <h1>Productos</h1>
      {cartError && <ErrorBanner message={cartError} onClose={clearError} />}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
