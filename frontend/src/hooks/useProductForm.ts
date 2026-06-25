import { useEffect, useRef, useState } from "react";
import { createProduct, updateProduct } from "../api/products";
import { parseApiError } from "../api/errors";
import type { Product, ProductFormData } from "../types";

const EMPTY: ProductFormData = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category: "",
  is_active: true,
};

type FormErrors = Partial<Record<keyof ProductFormData, string>>;

function validate(data: ProductFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  } else if (data.name.trim().length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  }

  const price = parseFloat(String(data.price));
  if (!String(data.price).trim()) {
    errors.price = "El precio es obligatorio.";
  } else if (isNaN(price) || price <= 0) {
    errors.price = "El precio debe ser un número mayor que 0.";
  } else if (!/^\d+(\.\d{1,2})?$/.test(String(data.price).trim())) {
    errors.price = "El precio admite máximo 2 decimales.";
  }

  const stock = Number(data.stock);
  if (String(data.stock) === "") {
    errors.stock = "El stock es obligatorio.";
  } else if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = "El stock debe ser un entero mayor o igual a 0.";
  }

  return errors;
}

interface Options {
  open: boolean;
  product?: Product | null;
  onSuccess: (p: Product) => void;
  onClose: () => void;
}

export function useProductForm({ open, product, onSuccess, onClose }: Options) {
  const [form, setForm] = useState<ProductFormData>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof ProductFormData, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? "",
        price: product.price,
        stock: product.stock,
        category: product.category ?? "",
        is_active: product.is_active,
      });
    } else {
      setForm(EMPTY);
    }
    setTouched({});
    setSubmitAttempted(false);
    setApiError(null);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open, product]);

  function handleChange(field: keyof ProductFormData, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof ProductFormData) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function fieldError(field: keyof ProductFormData) {
    if (!touched[field] && !submitAttempted) return undefined;
    return validate(form)[field];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validate(form);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const result = product
        ? await updateProduct(product.id, form)
        : await createProduct(form);
      onSuccess(result);
      onClose();
    } catch (err) {
      setApiError(parseApiError(err, "No se pudo guardar el producto."));
    } finally {
      setSubmitting(false);
    }
  }

  const hasErrors = Object.keys(validate(form)).length > 0;
  const submitDisabled = submitting || (submitAttempted && hasErrors);

  return {
    form,
    submitting,
    submitDisabled,
    apiError,
    firstInputRef,
    handleChange,
    handleBlur,
    fieldError,
    handleSubmit,
  };
}
