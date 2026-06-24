import { Link, useParams } from "react-router-dom";

export function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return (
    <section className="text-center py-12 px-4">
      <div className="text-5xl">✅</div>
      <h1>¡Orden creada con éxito!</h1>
      <p>
        Tu número de orden es: <strong className="text-blue-800 font-mono">{orderNumber}</strong>
      </p>
      <Link to="/" className="bg-blue-600 text-white border-0 rounded-lg px-4 py-2.5 font-semibold cursor-pointer no-underline inline-block text-center hover:bg-blue-800">
        Seguir comprando
      </Link>
    </section>
  );
}
