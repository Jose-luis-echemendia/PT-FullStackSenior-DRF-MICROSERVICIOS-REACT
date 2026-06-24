import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { CartIcon } from "./CartIcon";

export function Navbar() {
  const count = useCartStore((s) => s.itemCount());
  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
      <Link to="/" className="text-xl font-bold no-underline text-slate-800">
        🛒 Mini E-commerce
      </Link>
      <Link to="/cart" className="inline-flex items-center gap-1.5 no-underline text-blue-600 font-semibold">
        <CartIcon />
        Carrito {count > 0 && <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs ml-1">{count}</span>}
      </Link>
    </nav>
  );
}
