import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cartApi from "../api/cart";
import { useCartStore } from "../store/cartStore";
import type { Cart } from "../types";

vi.mock("../api/cart");

const sampleCart: Cart = {
  id: "c1",
  user_id: "u1",
  items: [
    {
      id: "i1",
      product_id: "p1",
      product_name: "Teclado",
      unit_price: "10.00",
      quantity: 2,
      line_total: "20.00",
    },
  ],
  subtotal: "20.00",
  updated_at: "",
};

describe("cartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ cart: null, loading: false, error: null });
    vi.clearAllMocks();
  });

  it("itemCount sums quantities", () => {
    useCartStore.setState({ cart: sampleCart });
    expect(useCartStore.getState().itemCount()).toBe(2);
  });

  it("addItem stores the returned cart and returns true", async () => {
    vi.mocked(cartApi.addItem).mockResolvedValue(sampleCart);
    const ok = await useCartStore.getState().addItem("p1", 2);
    expect(ok).toBe(true);
    expect(useCartStore.getState().cart).toEqual(sampleCart);
  });

  it("addItem sets an error message and returns false on failure", async () => {
    vi.mocked(cartApi.addItem).mockRejectedValue(new Error("boom"));
    const ok = await useCartStore.getState().addItem("p1", 2);
    expect(ok).toBe(false);
    expect(useCartStore.getState().error).toBeTruthy();
  });
});
