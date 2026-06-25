import { useState } from "react";
import { deleteProduct } from "../api/products";
import { parseApiError } from "../api/errors";
import type { Product } from "../types";

export function useDeleteProduct(onDeleted: () => void) {
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      onDeleted();
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

  return { deleteTarget, deleting, deleteError, handleDelete, confirmDelete, cancelDelete };
}
