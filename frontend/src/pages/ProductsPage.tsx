import { useCallback, useEffect, useState } from "react";
import { deleteProduct, getCategories, listProducts } from "../api/products";
import { parseApiError } from "../api/errors";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { ErrorBanner } from "../components/ErrorBanner";
import { Loader } from "../components/Loader";
import { Pagination } from "../components/Pagination";
import { ProductCard } from "../components/ProductCard";
import { ProductFilters, EMPTY_FILTERS } from "../components/ProductFilters";
import type { FilterState } from "../components/ProductFilters";
import { ProductModal } from "../components/ProductModal";
import { ProductTable } from "../components/ProductTable";
import { ViewToggle } from "../components/ViewToggle";
import { useCartStore } from "../store/cartStore";
import type { CategoryOption, Product } from "../types";

type View = "card" | "table";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<View>("card");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const cartError = useCartStore((s) => s.error);
  const clearError = useCartStore((s) => s.clearError);

  const loadPage = useCallback(
    async (p: number, size: number, f: FilterState) => {
      setLoading(true);
      setError(null);
      try {
        // Strip empty strings so they don't reach the API as empty query params
        const cleanFilters = Object.fromEntries(
          Object.entries(f).filter(([, v]) => v !== ""),
        );
        const data = await listProducts({ page: p, page_size: size, ...cleanFilters });
        setProducts(data.results);
        setCount(data.count);
      } catch (err) {
        setError(parseApiError(err, "No se pudieron cargar los productos."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    loadPage(1, 12, EMPTY_FILTERS);
  }, [loadPage]);

  // Stock can change asynchronously (the order.created consumer decrements it),
  // so refetch the catalog whenever the tab regains focus — e.g. on returning
  // from checkout — to surface up-to-date stock without a full reload.
  useEffect(() => {
    function refetchOnVisible() {
      if (document.visibilityState === "visible") loadPage(page, pageSize, filters);
    }
    window.addEventListener("focus", refetchOnVisible);
    document.addEventListener("visibilitychange", refetchOnVisible);
    return () => {
      window.removeEventListener("focus", refetchOnVisible);
      document.removeEventListener("visibilitychange", refetchOnVisible);
    };
  }, [loadPage, page, pageSize, filters]);

  function handlePageChange(p: number) {
    setPage(p);
    loadPage(p, pageSize, filters);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
    loadPage(1, size, filters);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFilterChange(newFilters: FilterState) {
    setFilters(newFilters);
    setPage(1);
    loadPage(1, pageSize, newFilters);
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    loadPage(1, pageSize, EMPTY_FILTERS);
  }

  function openCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditTarget(product);
    setModalOpen(true);
  }

  function handleDelete(product: Product) {
    setDeleteTarget(product);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      loadPage(page, pageSize, filters);
    } catch (err) {
      setDeleteError(parseApiError(err, "No se pudo eliminar el producto."));
    } finally {
      setDeleting(false);
    }
  }

  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  function handleModalSuccess(saved: Product) {
    if (editTarget) {
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setPage(1);
      loadPage(1, pageSize, filters);
    }
  }

  return (
    <section className="pb-12">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Productos</h1>
          {!loading && (
            <p className="text-slate-500 text-sm mt-1">
              {count} {count === 1 ? "producto" : "productos"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <ProductFilters
        filters={filters}
        categories={categories}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {cartError && <ErrorBanner message={cartError} onClose={clearError} />}
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {loading ? (
        <Loader label="Cargando productos..." />
      ) : view === "card" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categories={categories}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
          {products.length === 0 && (
            <p className="text-slate-400 col-span-full text-center py-16">
              No hay productos con los filtros aplicados.
            </p>
          )}
        </div>
      ) : (
        <ProductTable
          products={products}
          categories={categories}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <Pagination
        count={count}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editTarget}
        categories={categories}
        onSuccess={handleModalSuccess}
      />

      <DeleteConfirmModal
        product={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={deleting}
        error={deleteError}
      />
    </section>
  );
}
