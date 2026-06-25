import { useCallback, useEffect, useState } from "react";
import { getCategories, listProducts } from "../api/products";
import { parseApiError } from "../api/errors";
import { EMPTY_FILTERS } from "../components/ProductFilters";
import type { FilterState } from "../components/ProductFilters";
import type { CategoryOption, Product } from "../types";

export function useProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (p: number, size: number, f: FilterState) => {
    setLoading(true);
    setError(null);
    try {
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
  }, []);

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

  function reload() {
    loadPage(page, pageSize, filters);
  }

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

  return {
    products,
    setProducts,
    count,
    categories,
    page,
    pageSize,
    filters,
    loading,
    error,
    setError,
    reload,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    handleClearFilters,
  };
}
