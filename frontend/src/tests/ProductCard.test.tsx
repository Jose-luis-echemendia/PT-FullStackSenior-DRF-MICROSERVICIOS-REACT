import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "../components/ProductCard";
import { useCartStore } from "../store/cartStore";
import type { Product } from "../types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Teclado",
    description: "Mecánico",
    price: "59.99",
    stock: 10,
    category: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

import type { CategoryOption } from "../types";

const noCategories: CategoryOption[] = [];

describe("ProductCard", () => {
  it("renders product info", () => {
    render(<ProductCard product={makeProduct()} categories={noCategories} />);
    expect(screen.getByText("Teclado")).toBeInTheDocument();
    expect(screen.getByText("$59.99")).toBeInTheDocument();
    expect(screen.getByText("Stock: 10")).toBeInTheDocument();
  });

  it("disables the button and shows 'Agotado' when out of stock", () => {
    render(<ProductCard product={makeProduct({ stock: 0 })} categories={noCategories} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Agotado");
  });

  it("calls addItem with the product id when clicked", async () => {
    const addItem = vi.fn().mockResolvedValue(true);
    useCartStore.setState({ addItem });

    render(<ProductCard product={makeProduct({ id: "abc" })} categories={noCategories} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Agregar al carrito"));
    });

    expect(addItem).toHaveBeenCalledWith("abc", 1);
  });
});
