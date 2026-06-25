# 🛒 Mini E-commerce — Microservicios (Django REST + React)

Flujo completo de e-commerce básico: **gestión de productos → carrito → generación de orden** (sin pasarela de pago), implementado con una arquitectura de **microservicios** desacoplados.

> Prueba técnica Full-Stack Senior. Stack: Django REST Framework · PostgreSQL · RabbitMQ · React (Vite + TypeScript + Zustand) · Nginx · Docker.

---

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Ejecución con Docker (recomendado)](#ejecución-con-docker-recomendado)
- [Ejecución local (sin Docker)](#ejecución-local-sin-docker)
- [Documentación de la API](#documentación-de-la-api)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Decisiones técnicas](#decisiones-técnicas)

---

## Arquitectura

```
                  ┌────────────────────┐
                  │   React SPA (Vite) │  :5173
                  └─────────┬──────────┘
                            │ HTTP/JSON  ·  header X-User-Id (token anónimo)
                            ▼
                  ┌────────────────────┐
                  │  API Gateway Nginx │  :8080
                  └───┬──────┬─────┬───┘
          /api/products│ /api/cart│  │/api/orders
                       ▼          ▼  ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Products │  │   Cart   │  │  Orders  │   (Django REST)
        │  :8001   │◄─┤  :8002   │◄─┤  :8003   │   REST síncrono (validaciones)
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
        products_db    cart_db      orders_db      (PostgreSQL · 1 DB por servicio)

             ▲             ▲             │ publica "order.created"
             │ consume     │ consume     ▼
             └─────────────┴────────  RabbitMQ  ◄────────┘
              (descuenta stock)  (vacía carrito)   exchange topic: ecommerce.events
```

**Comunicación híbrida:**
- **REST síncrono** para validaciones que bloquean (Cart→Products, Orders→Cart/Products).
- **Eventos asíncronos (RabbitMQ)** para efectos secundarios: al crear una orden, Orders publica `order.created`; Products descuenta stock y Cart vacía el carrito de forma desacoplada e idempotente.

Cada servicio tiene **su propia base de datos** (patrón *database-per-service*); no hay FKs cruzadas. Las órdenes guardan un **snapshot** del nombre y precio de cada producto.

---

## Requisitos previos

**Para Docker (recomendado):**
- Docker `>= 24` y Docker Compose v2

**Para desarrollo local:**
- Python `3.12`, [uv](https://github.com/astral-sh/uv) y/o [Poetry](https://python-poetry.org/)
- Node `20+` y [bun](https://bun.sh/) `>= 1.3`

---

## Ejecución con Docker (recomendado)

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta: 3 bases PostgreSQL, RabbitMQ, Redis, los 3 servicios Django (+ 3 workers: `products-consumer`, `cart-consumer`, `orders-outbox-relay`), el gateway Nginx y el frontend. Las migraciones y el *seed* de productos se ejecutan automáticamente.

| Servicio            | URL                              |
|---------------------|----------------------------------|
| **Frontend (SPA)**  | http://localhost:5173            |
| **API (gateway)**   | http://localhost:8080/api        |
| **RabbitMQ admin**  | http://localhost:15672 (guest/guest) |

Atajos disponibles vía `make help` (`make up`, `make down`, `make seed`, `make test`…).

---

## Ejecución local (sin Docker)

Cada servicio corre con SQLite por defecto si no se define `DATABASE_URL`.

```bash
# Backend (repetir por cada servicio: products / cart / orders)
cd services/products
uv venv .venv && source .venv/bin/activate
uv pip install -r <(poetry export -f requirements.txt --with dev --without-hashes)
python manage.py migrate
python manage.py seed_products          # solo en products
python manage.py runserver 8001         # 8002 cart · 8003 orders

# Worker de eventos (en otra terminal; requiere RabbitMQ corriendo)
python manage.py consume_events

# Frontend
cd frontend
bun install
bun run dev                             # http://localhost:5173
```

> Para el flujo completo de eventos en local necesitas un RabbitMQ accesible
> (`docker run -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management-alpine`).

---

## Documentación de la API

Todas las rutas pasan por el gateway: `http://localhost:8080`.
El carrito y las órdenes se identifican con el header **`X-User-Id`** (token anónimo generado por el frontend).

### Products — `/api/products/`

| Método | Ruta                     | Descripción            |
|--------|--------------------------|------------------------|
| GET    | `/api/products/`         | Listar (paginado)      |
| POST   | `/api/products/`         | Crear                  |
| GET    | `/api/products/{id}/`    | Detalle                |
| PATCH  | `/api/products/{id}/`    | Actualizar             |
| DELETE | `/api/products/{id}/`    | Eliminar               |

```jsonc
// GET /api/products/
{
  "count": 5,
  "results": [
    { "id": "8f1c…", "name": "Teclado mecánico RGB", "price": "59.99",
      "stock": 25, "is_active": true }
  ]
}
```

### Cart — `/api/cart/` (requiere `X-User-Id`)

| Método | Ruta                        | Descripción                |
|--------|-----------------------------|----------------------------|
| GET    | `/api/cart/`                | Ver carrito                |
| DELETE | `/api/cart/`                | Vaciar carrito             |
| POST   | `/api/cart/items/`          | Agregar `{product_id, quantity}` |
| PATCH  | `/api/cart/items/{id}/`     | Cambiar `{quantity}`       |
| DELETE | `/api/cart/items/{id}/`     | Eliminar ítem              |

```jsonc
// GET /api/cart/
{
  "id": "c1…", "user_id": "anon-7f3a…",
  "items": [
    { "id": "i1…", "product_id": "8f1c…", "product_name": "Teclado mecánico RGB",
      "unit_price": "59.99", "quantity": 2, "line_total": "119.98" }
  ],
  "subtotal": "119.98"
}
```

### Orders — `/api/orders/` (requiere `X-User-Id`)

| Método | Ruta                   | Descripción                       |
|--------|------------------------|-----------------------------------|
| POST   | `/api/orders/`         | Crear orden desde el carrito      |
| GET    | `/api/orders/`         | Listar órdenes del usuario        |
| GET    | `/api/orders/{id}/`    | Detalle de orden                  |

```jsonc
// POST /api/orders/  -> 201
{
  "id": "o9…", "order_number": "ORD-20260623-4821",
  "status": "CONFIRMED", "total": "119.98",
  "items": [
    { "product_id": "8f1c…", "product_name": "Teclado mecánico RGB",
      "unit_price": "59.99", "quantity": 2, "line_total": "119.98" }
  ]
}
```

Al crear la orden se publica `order.created` → el stock se descuenta en Products y el carrito se vacía en Cart (asíncrono).

### Documentación interactiva (Swagger UI / ReDoc)

Con los servicios en ejecución (`make up`), la documentación OpenAPI 3.0 generada automáticamente por **drf-spectacular** está disponible en:

| Servicio  | Swagger UI                                              | ReDoc                                              |
|-----------|---------------------------------------------------------|----------------------------------------------------|
| Products  | http://localhost:8080/api/products/schema/swagger-ui/   | http://localhost:8080/api/products/schema/redoc/   |
| Cart      | http://localhost:8080/api/cart/schema/swagger-ui/       | http://localhost:8080/api/cart/schema/redoc/       |
| Orders    | http://localhost:8080/api/orders/schema/swagger-ui/     | http://localhost:8080/api/orders/schema/redoc/     |

El schema OpenAPI en formato YAML es descargable desde `/api/{servicio}/schema/`.

---

## Estructura del proyecto

```
.
├── docker-compose.yml          # orquesta todo el stack
├── Makefile                    # atajos (up/down/test/seed…)
├── gateway/nginx.conf          # API gateway (enrutamiento por path)
├── services/
│   ├── products/               # Django REST · CRUD + consumer (stock)
│   ├── cart/                    # Django REST · carrito + consumer (limpieza)
│   └── orders/                  # Django REST · orquestación + Outbox publisher
│       └── <app>/
│           ├── models.py serializers.py views.py
│           ├── services.py clients.py        # lógica de negocio + HTTP inter-servicios
│           ├── management/commands/publish_outbox.py
│           └── tests/
│       └── shared/events.py     # publisher / consumer RabbitMQ (pika)
└── frontend/                    # React + Vite + TS + Zustand
    └── src/{api,store,pages,components,tests}/
```

---

## Pruebas

```bash
make test            # backend (pytest) + frontend (vitest)
```

- **Backend** (`pytest` + `responses` para mockear llamadas inter-servicio): 45 tests
  cubriendo CRUD, validaciones, caché Redis del catálogo, reglas de carrito, creación de
  orden, validación de stock, handlers de eventos (descuento de stock + idempotencia,
  limpieza de carrito) y publicación del Outbox.
- **Frontend** (`vitest` + Testing Library): 6 tests sobre componentes y store de Zustand.

---

## Decisiones técnicas

| Decisión | Justificación |
|----------|---------------|
| **Database-per-service** | Bajo acoplamiento y despliegue independiente; sin FKs cruzadas. |
| **REST síncrono + eventos (RabbitMQ)** | REST para validaciones bloqueantes; eventos para efectos secundarios desacoplados, evitando transacciones distribuidas. RabbitMQ es el estándar de facto en stacks Python/Django. |
| **Snapshot en órdenes** | El precio/nombre se congela al comprar; cambios futuros del catálogo no alteran órdenes históricas. |
| **Idempotencia en consumers** | `ProcessedEvent` evita doble descuento de stock ante reentregas del broker. |
| **`transaction.on_commit` para publicar** | El evento solo se emite si la orden realmente se persistió. |
| **Zustand (frontend)** | Mínimo boilerplate vs Redux, `persist` a localStorage, re-renders selectivos. |
| **Token anónimo (`X-User-Id`)** | Identificación simplificada sin login; ruta de evolución directa a JWT. |
| **uv + Poetry + ruff** | Poetry declara dependencias, uv instala rápido en Docker, ruff hace lint+format. |
| **bun (frontend)** | Instalación y ejecución de scripts más rápidas que npm. |
| **Caché Redis (catálogo)** | Products usa Redis para cachear lecturas del catálogo; reduce carga en Postgres bajo tráfico de lectura alto. |
| **Patrón Outbox** | La orden y su evento se persisten en la misma transacción DB (`OutboxEvent`); un worker (`publish_outbox`) los publica a RabbitMQ, garantizando entrega al menos una vez sin pérdida ante caídas. |