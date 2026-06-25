import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Product } from "../types";

interface Options {
  setProducts: Dispatch<SetStateAction<Product[]>>;
  onCreated: () => void;
}

export function useProductModal({ setProducts, onCreated }: Options) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  function openCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditTarget(product);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleModalSuccess(saved: Product) {
    if (editTarget) {
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      onCreated();
    }
  }

  return { modalOpen, editTarget, openCreate, openEdit, closeModal, handleModalSuccess };
}
