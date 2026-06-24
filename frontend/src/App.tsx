import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { CartPage } from "./pages/CartPage";
import { OrderSuccessPage } from "./pages/OrderSuccessPage";
import { ProductsPage } from "./pages/ProductsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/order/success/:orderNumber" element={<OrderSuccessPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
