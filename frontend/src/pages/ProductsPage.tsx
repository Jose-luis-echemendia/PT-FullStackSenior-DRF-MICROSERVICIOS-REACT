import { useProductCatalog } from "../hooks/useProductCatalog";
import { useDeleteProduct } from "../hooks/useDeleteProduct";
import { useProductModal } from "../hooks/useProductModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { ErrorBanner } from "../components/ErrorBanner";
import { Loader } from "../components/Loader";
import { Pagination } from "../components/Pagination";
import { ProductCard } from "../components/ProductCard";
import { ProductFilters } from "../components/ProductFilters";
import { ProductModal } from "../components/ProductModal";
import { ProductTable } from "../components/ProductTable";
import { ViewToggle } from "../components/ViewToggle";
import { useCartStore } from "../store/cartStore";
import { useState } from "react";

type View = "card" | "table";

export function ProductsPage() {
  const catalog = useProductCatalog();
  const deletion = useDeleteProduct(catalog.reload);
  const modal = useProductModal({
    setProducts: catalog.setProducts,
    onCreated: catalog.reload,
  });

  const cartError = useCartStore((s) => s.error);
  const clearError = useCartStore((s) => s.clearError);

  const [view, setView] = useState<View>("card");

  return (
    <section className="pb-12">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Productos</h1>
          {!catalog.loading && (
            <p className="text-slate-500 text-sm mt-1">
              {catalog.count} {catalog.count === 1 ? "producto" : "productos"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ViewToggle view={view} onChange={setView} />
          <button
            onClick={modal.openCreate}
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
        filters={catalog.filters}
        categories={catalog.categories}
        onChange={catalog.handleFilterChange}
        onClear={catalog.handleClearFilters}
      />

      {cartError && <ErrorBanner message={cartError} onClose={clearError} />}
      {catalog.error && <ErrorBanner message={catalog.error} onClose={() => catalog.setError(null)} />}

      {catalog.loading ? (
        <Loader label="Cargando productos..." />
      ) : view === "card" ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {catalog.products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categories={catalog.categories}
              onEdit={() => modal.openEdit(p)}
              onDelete={() => deletion.handleDelete(p)}
            />
          ))}
          {catalog.products.length === 0 && (
            <p className="text-slate-400 col-span-full text-center py-16">
              No hay productos con los filtros aplicados.
            </p>
          )}
        </div>
      ) : (
        <ProductTable
          products={catalog.products}
          categories={catalog.categories}
          onEdit={modal.openEdit}
          onDelete={deletion.handleDelete}
        />
      )}

      <Pagination
        count={catalog.count}
        page={catalog.page}
        pageSize={catalog.pageSize}
        onPageChange={catalog.handlePageChange}
        onPageSizeChange={catalog.handlePageSizeChange}
      />

      <ProductModal
        open={modal.modalOpen}
        onClose={modal.closeModal}
        product={modal.editTarget}
        categories={catalog.categories}
        onSuccess={modal.handleModalSuccess}
      />

      <DeleteConfirmModal
        product={deletion.deleteTarget}
        onConfirm={deletion.confirmDelete}
        onCancel={deletion.cancelDelete}
        loading={deletion.deleting}
        error={deletion.deleteError}
      />
    </section>
  );
}
