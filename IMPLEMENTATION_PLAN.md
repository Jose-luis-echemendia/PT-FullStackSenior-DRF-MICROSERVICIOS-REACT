# Plan de Implementación — E-commerce con Microservicios (DRF + React)

> Flujo completo: **Productos → Carrito → Orden** (sin pasarela de pago).
> Stack: **Django REST Framework** (microservicios) + **React SPA**.
> Tooling Python: **uv** + **Poetry** + **ruff**. Orquestación: **Docker Compose**.

---

## Tabla de Contenidos

1. [Arquitectura General del Sistema](#1-arquitectura-general-del-sistema)
2. [Estructura del Repositorio](#2-estructura-del-repositorio)
3. [Plan de Implementación Backend](#3-plan-de-implementación-backend)
4. [Plan de Implementación Frontend](#4-plan-de-implementación-frontend)
5. [Flujo de Datos y Estados](#5-flujo-de-datos-y-estados)
6. [Docker y Docker Compose](#6-docker-y-docker-compose)
7. [Plan de Pruebas](#7-plan-de-pruebas)
8. [Documentación del README](#8-documentación-del-readme)
9. [Consideraciones Adicionales](#9-consideraciones-adicionales)
10. [Roadmap de Implementación (orden sugerido)](#10-roadmap-de-implementación)

---

## 1. Arquitectura General del Sistema

### 1.1 Diagrama de arquitectura (texto)

```
                          ┌──────────────────────────┐
                          │      React SPA (Vite)     │
                          │   localhost:5173 (dev)    │
                          └─────────────┬────────────┘
                                        │ HTTP/JSON (Axios)
                                        │ Header: X-User-Id (token anónimo)
                                        ▼
                          ┌──────────────────────────┐
                          │      API Gateway          │
                          │   (Nginx reverse proxy)   │
                          │     localhost:8080        │
                          └───┬──────────┬────────┬───┘
              /api/products/  │  /api/cart/        │ /api/orders/
                              ▼          ▼         ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │  Products svc │ │   Cart svc    │ │  Orders svc   │
        │  DRF :8001    │ │  DRF :8002    │ │  DRF :8003    │
        └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                │                  │                 │
        ┌───────▼──────┐  ┌────────▼─────┐  ┌────────▼──────┐
        │ products_db  │  │   cart_db    │  │   orders_db   │
        │ (PostgreSQL) │  │ (PostgreSQL) │  │ (PostgreSQL)  │
        └──────────────┘  └──────────────┘  └───────────────┘

                  Comunicación asíncrona (eventos)
        ┌──────────────────────────────────────────────────┐
        │                  RabbitMQ broker                   │
        │  exchange: ecommerce.events (topic)                │
        │  • order.created   → Products (descuenta stock)    │
        │  • order.created   → Cart (limpia carrito)         │
        └──────────────────────────────────────────────────┘
```

### 1.2 Definición de cada servicio

| Servicio | Responsabilidad | Puerto | DB |
|----------|-----------------|--------|----|
| **API Gateway** (Nginx) | Punto único de entrada, enrutamiento por path, CORS, rate-limit básico | 8080 | — |
| **Products Service** | CRUD de productos, gestión de stock, fuente de verdad del catálogo | 8001 | `products_db` |
| **Cart Service** | Carrito por usuario, items, cantidades, cálculo de subtotales | 8002 | `cart_db` |
| **Orders Service** | Creación de orden desde carrito, snapshot de items, estado de orden | 8003 | `orders_db` |
| **RabbitMQ** | Broker de eventos (descontar stock, limpiar carrito) | 5672 / 15672 | — |

### 1.3 Flujo de comunicación

**Síncrono (REST) — para consultas que necesitan respuesta inmediata:**
- Cart → Products: validar que el producto existe, obtener precio y stock al agregar item (`GET /api/products/{id}/`).
- Orders → Cart: leer el contenido del carrito al crear la orden (`GET /api/cart/?user_id=...`).
- Orders → Products: validar stock disponible antes de confirmar la orden.

**Asíncrono (eventos vía RabbitMQ) — para efectos secundarios desacoplados:**
- Orders publica `order.created` → Products consume y descuenta stock.
- Orders publica `order.created` → Cart consume y vacía el carrito del usuario.

> **Decisión:** Usamos **REST síncrono** para validaciones que bloquean la operación (no se puede crear orden con stock inválido) y **eventos asíncronos** para acciones idempotentes posteriores (descontar stock confirmado, limpiar carrito). Esto evita un commit distribuido complejo y mantiene los servicios desacoplados. Ver §9.3 para la justificación del broker.

### 1.4 Estrategia de base de datos

**Database-per-service (DB independiente por servicio).** Cada microservicio posee su propia base PostgreSQL y nadie accede a la DB de otro servicio directamente.

- **Por qué:** es el patrón estándar en microservicios; garantiza bajo acoplamiento, despliegue independiente y libertad de esquema. Una DB compartida crearía acoplamiento oculto que anula el beneficio de microservicios.
- **Consistencia de datos:** los servicios duplican lo mínimo necesario. Orders guarda un **snapshot** de los items (nombre, precio, cantidad) en el momento de la compra, de modo que un cambio futuro de precio en Products no altera órdenes históricas.
- **Para la prueba técnica:** se usan 3 contenedores Postgres separados (o un Postgres con 3 bases lógicas si se quiere ahorrar recursos; el `docker-compose` mostrado usa contenedores separados por claridad).

---

## 2. Estructura del Repositorio

### 2.1 Monorepo vs Multi-repo

**Monorepo.** Para una prueba técnica un monorepo es superior: un solo `git clone`, un solo `docker-compose up`, revisión de código unificada y visión completa del sistema. En producción real cada servicio podría extraerse a su propio repo, pero aquí el monorepo maximiza la claridad de evaluación.

### 2.2 Árbol de carpetas

```
ecommerce-microservices/
├── README.md
├── IMPLEMENTATION_PLAN.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── Makefile                      # atajos: make up / make test / make lint
│
├── gateway/
│   └── nginx.conf                # enrutamiento /api/products, /api/cart, /api/orders
│
├── services/
│   ├── products/
│   │   ├── pyproject.toml        # gestionado con Poetry / instalado con uv
│   │   ├── poetry.lock
│   │   ├── ruff.toml             # config de lint + format
│   │   ├── Dockerfile
│   │   ├── manage.py
│   │   ├── .dockerignore
│   │   ├── config/               # proyecto Django
│   │   │   ├── __init__.py
│   │   │   ├── settings.py
│   │   │   ├── urls.py
│   │   │   ├── wsgi.py
│   │   │   └── asgi.py
│   │   ├── products/             # app Django
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   ├── admin.py
│   │   │   └── tests/
│   │   │       ├── test_models.py
│   │   │       ├── test_api.py
│   │   │       └── factories.py
│   │   └── shared/
│   │       └── events.py         # publisher/consumer RabbitMQ
│   │
│   ├── cart/                     # misma estructura que products
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   ├── config/
│   │   ├── cart/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── services.py       # lógica de negocio (cálculos, llamada a Products)
│   │   │   ├── clients.py        # cliente HTTP hacia Products svc
│   │   │   └── tests/
│   │   └── shared/
│   │
│   └── orders/                   # misma estructura
│       ├── pyproject.toml
│       ├── Dockerfile
│       ├── config/
│       ├── orders/
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── services.py       # orquestación: leer carrito, validar stock, crear orden
│       │   ├── clients.py
│       │   └── tests/
│       └── shared/
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── Dockerfile
    ├── .env.example
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        │   ├── client.ts          # instancia Axios + interceptores
        │   ├── products.ts
        │   ├── cart.ts
        │   └── orders.ts
        ├── store/
        │   ├── cartStore.ts       # Zustand
        │   └── userStore.ts
        ├── pages/
        │   ├── ProductsPage.tsx
        │   ├── CartPage.tsx
        │   └── OrderSuccessPage.tsx
        ├── components/
        │   ├── ProductCard.tsx
        │   ├── CartItem.tsx
        │   ├── Navbar.tsx
        │   ├── Loader.tsx
        │   └── ErrorBanner.tsx
        ├── hooks/
        │   ├── useProducts.ts
        │   └── useCart.ts
        ├── types/
        │   └── index.ts
        └── tests/
            ├── ProductCard.test.tsx
            └── CartPage.test.tsx
```

### 2.3 Archivos de configuración clave

**`pyproject.toml`** (idéntico patrón en los 3 servicios, gestionado con Poetry, instalado con uv):

```toml
[tool.poetry]
name = "products-service"
version = "0.1.0"
description = "Products microservice (DRF)"
authors = ["Tu Nombre <you@example.com>"]
package-mode = false

[tool.poetry.dependencies]
python = "^3.12"
django = "^5.0"
djangorestframework = "^3.15"
psycopg = {extras = ["binary"], version = "^3.2"}
django-cors-headers = "^4.4"
django-filter = "^24.0"
pika = "^1.3"                  # cliente RabbitMQ
gunicorn = "^23.0"
python-decouple = "^3.8"      # variables de entorno
requests = "^2.32"            # cliente HTTP inter-servicios

[tool.poetry.group.dev.dependencies]
pytest = "^8.3"
pytest-django = "^4.9"
factory-boy = "^3.3"
responses = "^0.25"           # mock de llamadas HTTP en tests
ruff = "^0.7"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

**`ruff.toml`** (raíz o por servicio):

```toml
target-version = "py312"
line-length = 100

[lint]
select = ["E", "F", "I", "UP", "B", "DJ", "C4", "SIM"]  # incluye reglas Django (DJ)
ignore = ["E501"]

[lint.isort]
known-first-party = ["config", "products", "cart", "orders", "shared"]

[format]
quote-style = "double"
```

> **Tooling Python — cómo conviven uv, Poetry y ruff:**
> - **Poetry** declara y resuelve dependencias (`pyproject.toml` + `poetry.lock`) — fuente de verdad reproducible.
> - **uv** se usa dentro del Dockerfile para instalar a gran velocidad (`uv pip install`) y como runner local (`uv run python manage.py ...`), reduciendo el tiempo de build drásticamente frente a pip.
> - **ruff** reemplaza a flake8 + isort + black: lint y formato en una sola herramienta ultrarrápida (`ruff check` / `ruff format`).

**`package.json` (frontend):**

```json
{
  "name": "ecommerce-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "axios": "^1.7",
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6.26",
    "zustand": "^4.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5",
    "@testing-library/react": "^16.0",
    "@testing-library/user-event": "^14.5",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3",
    "@vitejs/plugin-react": "^4.3",
    "jsdom": "^25.0",
    "typescript": "^5.6",
    "vite": "^5.4",
    "vitest": "^2.1"
  }
}
```

---

## 3. Plan de Implementación Backend

> Convención común a los 3 servicios: DRF con `ViewSets` + `Routers`, paginación, `django-filter`, manejo de errores con `Response` y códigos HTTP correctos, y settings que leen variables con `python-decouple`.

### 3.1 Servicio de Productos

#### Modelo de datos

```python
# services/products/products/models.py
import uuid
from django.db import models


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return f"{self.name} (${self.price})"
```

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK no secuencial (evita enumeración, mejor para sistemas distribuidos) |
| `name` | CharField(200) | requerido |
| `description` | TextField | opcional |
| `price` | Decimal(10,2) | **nunca float** para dinero |
| `stock` | PositiveInteger | no negativo |
| `is_active` | Bool | soft-disable sin borrar |
| `created_at/updated_at` | DateTime | auditoría |

#### Serializador

```python
# services/products/products/serializers.py
from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "description", "price", "stock",
                  "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor que 0.")
        return value
```

#### Vistas / Endpoints

```python
# services/products/products/views.py
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
```

```python
# services/products/products/urls.py
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
urlpatterns = router.urls
```

| Método | Endpoint | Acción |
|--------|----------|--------|
| `GET` | `/api/products/` | Listar (paginado, filtrable) |
| `POST` | `/api/products/` | Crear |
| `GET` | `/api/products/{id}/` | Obtener por ID |
| `PUT/PATCH` | `/api/products/{id}/` | Actualizar |
| `DELETE` | `/api/products/{id}/` | Eliminar |

#### Validaciones
- `price > 0`, `stock >= 0` (garantizado por `PositiveIntegerField`).
- `name` no vacío (requerido por el modelo).
- Endpoint interno de decremento de stock idempotente vía evento (ver §3.3).

#### Ejemplo de respuestas JSON

`GET /api/products/`
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "8f1c2e3a-...",
      "name": "Teclado mecánico",
      "description": "Switches rojos, RGB",
      "price": "59.99",
      "stock": 25,
      "is_active": true,
      "created_at": "2026-06-23T10:00:00Z",
      "updated_at": "2026-06-23T10:00:00Z"
    },
    { "id": "a2b...", "name": "Mouse gamer", "price": "29.50", "stock": 40, "is_active": true }
  ]
}
```

`POST /api/products/` → `201 Created`
```json
{ "id": "8f1c2e3a-...", "name": "Teclado mecánico", "price": "59.99", "stock": 25, "is_active": true }
```

`GET /api/products/{id}/` → `200 OK` (objeto único).
`DELETE /api/products/{id}/` → `204 No Content`.
Error `404` → `{ "detail": "No encontrado." }`.

---

### 3.2 Servicio de Carrito

#### Modelo de datos

```python
# services/cart/cart/models.py
import uuid
from decimal import Decimal
from django.db import models


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=64, unique=True, db_index=True)  # token anónimo
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def subtotal(self) -> Decimal:
        return sum((item.line_total for item in self.items.all()), Decimal("0.00"))


class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)
    product_id = models.UUIDField()             # referencia a Products svc (sin FK cruzada)
    product_name = models.CharField(max_length=200)   # cache para mostrar sin llamar a Products
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("cart", "product_id")  # un producto = una línea

    @property
    def line_total(self):
        return self.unit_price * self.quantity
```

> **Nota de diseño:** `product_id` es solo una referencia (UUID), **no** una FK — las DB están separadas. Se cachea `product_name` y `unit_price` al agregar el item para no llamar a Products en cada render del carrito.

#### Lógica de negocio (services.py + clients.py)

```python
# services/cart/cart/clients.py
import requests
from decouple import config

PRODUCTS_URL = config("PRODUCTS_SERVICE_URL", default="http://products:8001")


def fetch_product(product_id: str) -> dict:
    resp = requests.get(f"{PRODUCTS_URL}/api/products/{product_id}/", timeout=5)
    resp.raise_for_status()
    return resp.json()
```

```python
# services/cart/cart/services.py
from rest_framework.exceptions import ValidationError, NotFound
from .clients import fetch_product
from .models import Cart, CartItem


def add_item(user_id: str, product_id: str, quantity: int) -> CartItem:
    try:
        product = fetch_product(product_id)
    except Exception:
        raise NotFound("Producto no encontrado en el catálogo.")

    if product["stock"] < quantity:
        raise ValidationError("Stock insuficiente.")

    cart, _ = Cart.objects.get_or_create(user_id=user_id)
    item, created = CartItem.objects.get_or_create(
        cart=cart, product_id=product_id,
        defaults={
            "product_name": product["name"],
            "unit_price": product["price"],
            "quantity": quantity,
        },
    )
    if not created:
        item.quantity += quantity
        item.save()
    return item
```

#### Serializadores

```python
# services/cart/cart/serializers.py
from rest_framework import serializers
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "product_id", "product_name", "unit_price", "quantity", "line_total"]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user_id", "items", "subtotal", "updated_at"]
```

#### Endpoints

| Método | Endpoint | Acción |
|--------|----------|--------|
| `GET` | `/api/cart/` | Ver carrito del usuario (por `X-User-Id`) |
| `POST` | `/api/cart/items/` | Agregar item `{product_id, quantity}` |
| `PATCH` | `/api/cart/items/{id}/` | Actualizar cantidad `{quantity}` |
| `DELETE` | `/api/cart/items/{id}/` | Eliminar item |
| `DELETE` | `/api/cart/` | Vaciar carrito |

`GET /api/cart/` → `200 OK`
```json
{
  "id": "c1...",
  "user_id": "anon-7f3a...",
  "items": [
    { "id": "i1...", "product_id": "8f1c...", "product_name": "Teclado mecánico",
      "unit_price": "59.99", "quantity": 2, "line_total": "119.98" }
  ],
  "subtotal": "119.98",
  "updated_at": "2026-06-23T11:00:00Z"
}
```

---

### 3.3 Servicio de Órdenes

#### Modelo de datos

```python
# services/orders/orders/models.py
import uuid
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        CONFIRMED = "CONFIRMED", "Confirmada"
        CANCELLED = "CANCELLED", "Cancelada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, db_index=True)
    user_id = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product_id = models.UUIDField()
    product_name = models.CharField(max_length=200)   # snapshot histórico
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
```

#### Lógica de negocio: crear orden desde carrito

```python
# services/orders/orders/services.py
from decimal import Decimal
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .clients import fetch_cart, validate_stock
from .models import Order, OrderItem
from shared.events import publish_event


def generate_order_number() -> str:
    import datetime, random
    return f"ORD-{datetime.date.today():%Y%m%d}-{random.randint(1000, 9999)}"


@transaction.atomic
def create_order_from_cart(user_id: str) -> Order:
    cart = fetch_cart(user_id)                      # REST → Cart svc
    if not cart["items"]:
        raise ValidationError("El carrito está vacío.")

    validate_stock(cart["items"])                   # REST → Products svc

    order = Order.objects.create(
        order_number=generate_order_number(),
        user_id=user_id,
        total=Decimal(cart["subtotal"]),
    )
    OrderItem.objects.bulk_create([
        OrderItem(order=order, product_id=i["product_id"], product_name=i["product_name"],
                  unit_price=Decimal(i["unit_price"]), quantity=i["quantity"])
        for i in cart["items"]
    ])
    order.status = Order.Status.CONFIRMED
    order.save(update_fields=["status"])

    # Efectos secundarios desacoplados (asíncronos):
    publish_event("order.created", {
        "order_id": str(order.id),
        "user_id": user_id,
        "items": [{"product_id": i["product_id"], "quantity": i["quantity"]}
                  for i in cart["items"]],
    })
    return order
```

**Pasos de la lógica:**
1. Leer carrito del usuario (REST → Cart).
2. Validar que no esté vacío.
3. Validar stock disponible producto por producto (REST → Products).
4. Generar `order_number` legible + `id` UUID.
5. Crear `Order` + `OrderItems` (snapshot de nombre/precio) en una transacción atómica.
6. Publicar evento `order.created` → Products descuenta stock, Cart se vacía.

#### Serializador

```python
# services/orders/orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["product_id", "product_name", "unit_price", "quantity"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "order_number", "user_id", "status", "total", "items", "created_at"]
```

#### Endpoints

| Método | Endpoint | Acción |
|--------|----------|--------|
| `POST` | `/api/orders/` | Crear orden desde el carrito del usuario |
| `GET` | `/api/orders/` | Listar órdenes del usuario |
| `GET` | `/api/orders/{id}/` | Detalle de orden |

`POST /api/orders/` → `201 Created`
```json
{
  "id": "o9...",
  "order_number": "ORD-20260623-4821",
  "user_id": "anon-7f3a...",
  "status": "CONFIRMED",
  "total": "119.98",
  "items": [
    { "product_id": "8f1c...", "product_name": "Teclado mecánico",
      "unit_price": "59.99", "quantity": 2 }
  ],
  "created_at": "2026-06-23T11:05:00Z"
}
```

---

## 4. Plan de Implementación Frontend (React SPA)

### 4.1 Estado global — elección: **Zustand**

| Opción | Veredicto |
|--------|-----------|
| Redux Toolkit | Potente pero excesivo boilerplate (actions, reducers, slices) para 3 vistas |
| Context API | Suficiente, pero provoca re-renders en cascada y se vuelve verboso con lógica async |
| **Zustand ✅** | API mínima, sin providers anidados, `persist` middleware integrado para localStorage, re-renders selectivos por selector. Ideal para el estado del carrito |

```typescript
// src/store/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as cartApi from "../api/cart";
import type { Cart } from "../types";

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      loading: false,
      error: null,
      fetchCart: async () => {
        set({ loading: true, error: null });
        try {
          set({ cart: await cartApi.getCart(), loading: false });
        } catch {
          set({ error: "No se pudo cargar el carrito", loading: false });
        }
      },
      addItem: async (productId, quantity) => {
        set({ loading: true, error: null });
        try {
          await cartApi.addItem(productId, quantity);
          await get().fetchCart();
        } catch {
          set({ error: "No se pudo agregar el producto", loading: false });
        }
      },
      updateQty: async (itemId, quantity) => {
        await cartApi.updateItem(itemId, quantity);
        await get().fetchCart();
      },
      removeItem: async (itemId) => {
        await cartApi.removeItem(itemId);
        await get().fetchCart();
      },
    }),
    { name: "cart-storage", partialize: (s) => ({ cart: s.cart }) }
  )
);
```

### 4.2 Rutas (React Router)

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

<BrowserRouter>
  <Navbar />
  <Routes>
    <Route path="/" element={<ProductsPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/order/success/:orderNumber" element={<OrderSuccessPage />} />
  </Routes>
</BrowserRouter>
```

### 4.3 Capa de API (Axios + token anónimo)

```typescript
// src/api/client.ts
import axios from "axios";

const getUserId = () => {
  let id = localStorage.getItem("user_id");
  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem("user_id", id);
  }
  return id;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api",
});

api.interceptors.request.use((config) => {
  config.headers["X-User-Id"] = getUserId();
  return config;
});
```

```typescript
// src/api/cart.ts
import { api } from "./client";
export const getCart = () => api.get("/cart/").then((r) => r.data);
export const addItem = (product_id: string, quantity: number) =>
  api.post("/cart/items/", { product_id, quantity });
export const updateItem = (id: string, quantity: number) =>
  api.patch(`/cart/items/${id}/`, { quantity });
export const removeItem = (id: string) => api.delete(`/cart/items/${id}/`);
```

### 4.4 Componentes principales

```tsx
// src/components/ProductCard.tsx
import { useCartStore } from "../store/cartStore";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <strong>${product.price}</strong>
      <span>Stock: {product.stock}</span>
      <button
        disabled={product.stock === 0}
        onClick={() => addItem(product.id, 1)}
      >
        {product.stock === 0 ? "Agotado" : "Agregar al carrito"}
      </button>
    </div>
  );
}
```

```tsx
// src/pages/CartPage.tsx (resumen)
export function CartPage() {
  const { cart, loading, error, updateQty, removeItem } = useCartStore();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);

  const createOrder = async () => {
    setPlacing(true);
    try {
      const { data } = await ordersApi.createOrder();
      await useCartStore.getState().fetchCart();      // refresca (vacío)
      navigate(`/order/success/${data.order_number}`);
    } catch {
      /* set error UI */
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} />;
  if (!cart?.items.length) return <p>Tu carrito está vacío.</p>;

  return (
    <div>
      {cart.items.map((it) => (
        <CartItem key={it.id} item={it} onQty={updateQty} onRemove={removeItem} />
      ))}
      <h3>Subtotal: ${cart.subtotal}</h3>
      <button disabled={placing} onClick={createOrder}>
        {placing ? "Generando..." : "Crear orden"}
      </button>
    </div>
  );
}
```

```tsx
// src/pages/OrderSuccessPage.tsx
export function OrderSuccessPage() {
  const { orderNumber } = useParams();
  return (
    <div className="success">
      <h2>✅ ¡Orden creada con éxito!</h2>
      <p>Tu número de orden es: <strong>{orderNumber}</strong></p>
      <Link to="/">Seguir comprando</Link>
    </div>
  );
}
```

### 4.5 Manejo de estados (loading / error / éxito)

Cada operación async sigue el patrón `loading → success | error`:
- **Loading:** spinner (`<Loader />`) o botones `disabled` con texto "Generando...".
- **Error:** `<ErrorBanner />` con mensaje legible; los stores capturan excepciones y exponen `error`.
- **Éxito:** redirección a `/order/success/:orderNumber` y refresco del carrito (queda vacío).

---

## 5. Flujo de Datos y Estados

### 5.1 Flujo: agregar producto al carrito

```
Usuario clic "Agregar"
   │
   ▼
cartStore.addItem(productId, 1)   [loading=true]
   │  POST /api/cart/items/  (X-User-Id)
   ▼
Cart svc → GET /api/products/{id}/  (valida existencia + stock)
   │
   ├─ producto OK y stock suficiente ─► crea/incrementa CartItem ─► 201
   │        │
   │        ▼
   │   cartStore.fetchCart() ─► UI muestra carrito actualizado [loading=false]
   │
   └─ producto inexistente (404) ─► Cart 404 ─► store set error
       stock insuficiente (400)  ─► Cart 400 ─► ErrorBanner
```

### 5.2 Flujo: generar orden

```
Usuario clic "Crear orden"  [placing=true]
   │  POST /api/orders/  (X-User-Id)
   ▼
Orders svc:
   1. GET /api/cart/        (Cart svc)  ── carrito vacío? ─► 400 "carrito vacío"
   2. validar stock         (Products) ── insuficiente?  ─► 400 "stock insuficiente"
   3. transacción atómica: crea Order + OrderItems (snapshot)
   4. status = CONFIRMED
   5. publish "order.created" ──► RabbitMQ
   │                                  ├─► Products: descuenta stock
   │                                  └─► Cart: vacía carrito del user
   ▼
201 { order_number } ─► frontend navega a /order/success/:orderNumber
                        ─► fetchCart() (queda vacío)
```

### 5.3 Manejo de errores por paso

| Paso | Error posible | Código | Manejo frontend |
|------|---------------|--------|-----------------|
| Listar productos | Products svc caído | 502/timeout | ErrorBanner + retry |
| Agregar item | Producto no existe | 404 | "Producto no disponible" |
| Agregar item | Sin stock | 400 | "Stock insuficiente" |
| Crear orden | Carrito vacío | 400 | "Tu carrito está vacío" |
| Crear orden | Stock cambió | 400 | "Algún producto ya no tiene stock" |
| Crear orden | Orders svc error | 500 | "Error al generar la orden, reintenta" |

### 5.4 Persistencia del carrito

**Backend como fuente de verdad + localStorage como caché de UX.**
- El carrito **vive en el Cart Service** (PostgreSQL), identificado por `user_id` (token anónimo). Sobrevive a recargas y cambios de dispositivo si se mantiene el token.
- El `user_id` (token anónimo) se persiste en **localStorage** (`crypto.randomUUID()` la primera visita).
- Zustand `persist` cachea el último estado del carrito en localStorage para render instantáneo, pero **siempre revalida con `fetchCart()`** al montar para evitar datos obsoletos.

> Justificación: solo localStorage perdería el carrito entre dispositivos y no permitiría que Orders lo lea server-side. Solo sesión Django acoplaría servicios. El backend como verdad es lo correcto en arquitectura de microservicios.

---

## 6. Docker y Docker Compose

### 6.1 Dockerfile de microservicio (multi-stage con uv)

```dockerfile
# services/products/Dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# uv: instalador ultrarrápido
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Instala dependencias desde el lock de Poetry
COPY pyproject.toml poetry.lock ./
RUN uv pip install --system --no-cache \
    $(uv export --no-hashes --format requirements-txt 2>/dev/null || true) \
    || pip install --no-cache-dir poetry && poetry export -f requirements.txt --without-hashes -o /tmp/req.txt && uv pip install --system --no-cache -r /tmp/req.txt

COPY . .
EXPOSE 8001
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8001", "--workers", "3"]
```

> Para simplicidad y robustez en la prueba, una alternativa válida es exportar `requirements.txt` desde Poetry y usar `uv pip install --system -r requirements.txt`. Lo importante es: **Poetry declara, uv instala rápido**.

### 6.2 Dockerfile del frontend

```dockerfile
# frontend/Dockerfile (build de producción servido por Nginx)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.spa.conf /etc/nginx/conf.d/default.conf   # fallback a index.html (SPA)
EXPOSE 80
```

### 6.3 docker-compose.yml

```yaml
services:
  # ---------- Bases de datos ----------
  products-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: products_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [products-data:/var/lib/postgresql/data]

  cart-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cart_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [cart-data:/var/lib/postgresql/data]

  orders-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [orders-data:/var/lib/postgresql/data]

  # ---------- Broker ----------
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports: ["15672:15672"]   # consola de administración
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      retries: 5

  # ---------- Microservicios ----------
  products:
    build: ./services/products
    command: >
      sh -c "python manage.py migrate &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8001 --workers 3"
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@products-db:5432/products_db
      RABBITMQ_URL: amqp://rabbitmq:5672
      DJANGO_ALLOWED_HOSTS: "*"
    depends_on: [products-db, rabbitmq]

  cart:
    build: ./services/cart
    command: >
      sh -c "python manage.py migrate &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8002 --workers 3"
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@cart-db:5432/cart_db
      PRODUCTS_SERVICE_URL: http://products:8001
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on: [cart-db, products, rabbitmq]

  orders:
    build: ./services/orders
    command: >
      sh -c "python manage.py migrate &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8003 --workers 3"
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@orders-db:5432/orders_db
      CART_SERVICE_URL: http://cart:8002
      PRODUCTS_SERVICE_URL: http://products:8001
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on: [orders-db, cart, products, rabbitmq]

  # ---------- Gateway + Frontend ----------
  gateway:
    image: nginx:alpine
    volumes: ["./gateway/nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
    ports: ["8080:80"]
    depends_on: [products, cart, orders]

  frontend:
    build: ./frontend
    ports: ["5173:80"]
    environment:
      VITE_API_URL: http://localhost:8080/api
    depends_on: [gateway]

volumes:
  products-data:
  cart-data:
  orders-data:
```

### 6.4 Gateway Nginx (enrutamiento)

```nginx
# gateway/nginx.conf
server {
  listen 80;
  location /api/products/ { proxy_pass http://products:8001; }
  location /api/cart/     { proxy_pass http://cart:8002; }
  location /api/orders/   { proxy_pass http://orders:8003; }

  # Cabeceras comunes
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-User-Id $http_x_user_id;
}
```

### 6.5 Variables de entorno (`.env.example`)

```env
# Base de datos
DB_USER=ecommerce
DB_PASSWORD=changeme

# Django
DJANGO_SECRET_KEY=dev-secret-change-in-prod
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*

# Inter-servicios
PRODUCTS_SERVICE_URL=http://products:8001
CART_SERVICE_URL=http://cart:8002
RABBITMQ_URL=amqp://rabbitmq:5672

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8080/api
```

---

## 7. Plan de Pruebas

### 7.1 Unit tests por servicio (pytest-django)

**Products:**
```python
# services/products/products/tests/test_api.py
import pytest
from rest_framework.test import APIClient
from .factories import ProductFactory

@pytest.mark.django_db
def test_list_products():
    ProductFactory.create_batch(3)
    resp = APIClient().get("/api/products/")
    assert resp.status_code == 200
    assert resp.data["count"] == 3

@pytest.mark.django_db
def test_create_product_rejects_negative_price():
    resp = APIClient().post("/api/products/", {"name": "X", "price": "-1", "stock": 5})
    assert resp.status_code == 400
```

**Cart (con mock de Products vía `responses`):**
```python
@pytest.mark.django_db
@responses.activate
def test_add_item_increments_existing():
    responses.add(responses.GET, "http://products:8001/api/products/PID/",
                  json={"id": "PID", "name": "Tec", "price": "10.00", "stock": 50})
    client = APIClient()
    client.post("/api/cart/items/", {"product_id": "PID", "quantity": 1},
                headers={"X-User-Id": "u1"})
    client.post("/api/cart/items/", {"product_id": "PID", "quantity": 2},
                headers={"X-User-Id": "u1"})
    resp = client.get("/api/cart/", headers={"X-User-Id": "u1"})
    assert resp.data["items"][0]["quantity"] == 3
    assert resp.data["subtotal"] == "30.00"
```

**Orders:**
```python
@pytest.mark.django_db
@responses.activate
def test_create_order_empty_cart_fails():
    responses.add(responses.GET, "http://cart:8002/api/cart/",
                  json={"items": [], "subtotal": "0.00"})
    resp = APIClient().post("/api/orders/", headers={"X-User-Id": "u1"})
    assert resp.status_code == 400
```

### 7.2 Pruebas de integración entre servicios

- Test end-to-end con `docker-compose up` + script (pytest o bash) que recorra: crear producto → agregar al carrito → crear orden → verificar que el stock bajó y el carrito quedó vacío.
- Verificar que el evento `order.created` efectivamente descontó stock (consumir la cola o consultar `GET /api/products/{id}/` tras unos segundos).

### 7.3 Pruebas de componentes React (Vitest + RTL)

```tsx
// src/tests/ProductCard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "../components/ProductCard";

test("botón deshabilitado cuando stock es 0", () => {
  render(<ProductCard product={{ id: "1", name: "X", price: "10", stock: 0 } as any} />);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByText("Agotado")).toBeInTheDocument();
});

test("llama addItem al hacer clic", () => {
  const product = { id: "1", name: "X", price: "10", stock: 5 } as any;
  render(<ProductCard product={product} />);
  fireEvent.click(screen.getByText("Agregar al carrito"));
  // assert sobre el store mockeado
});
```

### 7.4 Casos de prueba clave a cubrir

- ✅ Crear producto con precio inválido → 400.
- ✅ Agregar producto inexistente al carrito → 404.
- ✅ Agregar más cantidad que el stock → 400.
- ✅ Agregar dos veces el mismo producto → suma cantidades (no duplica línea).
- ✅ Cálculo correcto de `line_total` y `subtotal`.
- ✅ Crear orden con carrito vacío → 400.
- ✅ Crear orden exitosa → 201 con `order_number`, snapshot de items, stock descontado y carrito vaciado.
- ✅ Frontend: estados loading/error/éxito; botón "Agotado"; redirección a página de éxito.

---

## 8. Documentación del README

El `README.md` debe contener:

1. **Descripción del proyecto** — qué es, diagrama de arquitectura, stack.
2. **Requisitos previos** — Docker + Docker Compose; (opcional dev local) Python 3.12, uv, Poetry, Node 20+.
3. **Instalación y ejecución:**
   - Con Docker: `cp .env.example .env && docker compose up --build`. App en `http://localhost:5173`, API en `http://localhost:8080`.
   - Local (por servicio): `uv run python manage.py migrate && uv run python manage.py runserver 8001`; frontend `npm install && npm run dev`.
   - Seed de datos: `docker compose exec products python manage.py loaddata seed.json` o un comando de management.
4. **Endpoints de la API** — tabla por servicio (métodos, paths, payloads, ejemplos JSON). Mencionar el header `X-User-Id`.
5. **Estructura del proyecto** — árbol resumido (ver §2.2).
6. **Decisiones técnicas y justificaciones** — DB-per-service, Zustand, REST+eventos, UUIDs, snapshots en órdenes, uv/Poetry/ruff.
7. **Cómo correr los tests** — `docker compose exec products pytest`, `npm test`.
8. **Variables de entorno** — referencia a `.env.example`.

---

## 9. Consideraciones Adicionales

### 9.1 CORS
- `django-cors-headers` en cada servicio con `CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]` (leído de env).
- En producción, restringir al dominio del frontend; nunca `CORS_ALLOW_ALL_ORIGINS = True`.
- El header personalizado `X-User-Id` debe incluirse en `CORS_ALLOW_HEADERS`.

### 9.2 Autenticación / Identificación de usuario (simplificada)
- **Token anónimo (UUID en localStorage).** En la primera visita el frontend genera `anon-<uuid>` y lo persiste; se envía en cada request como header `X-User-Id`.
- El backend usa ese valor como clave de carrito y de órdenes. No requiere login.
- **Ruta de evolución:** sustituir el token anónimo por **JWT** (`djangorestframework-simplejwt`) validado en el gateway o en cada servicio, manteniendo el mismo `user_id` como `sub` del token. La capa de negocio no cambia.

### 9.3 Comunicación entre microservicios — recomendación estándar
- **Patrón híbrido (el más recomendado en la industria):**
  - **REST síncrono** para consultas que bloquean la operación (validar producto/stock, leer carrito). Simple, depurable, suficiente para baja latencia.
  - **Mensajería asíncrona con broker** para eventos de dominio (`order.created`) que disparan efectos secundarios (descontar stock, limpiar carrito). Desacopla servicios, tolera caídas temporales (la cola retiene el mensaje) y evita transacciones distribuidas.
- **Broker recomendado: RabbitMQ** (AMQP) — el estándar de facto para mensajería de tareas/eventos en stacks Python/Django por su madurez, enrutamiento por topic y consola de administración. **Kafka** sería la elección si se necesitara streaming de alto volumen y rejugado de eventos (event sourcing), pero es excesivo para este alcance.
- **Por qué no solo HTTP directo:** acoplaría la disponibilidad (si Products cae, no se podrían crear órdenes ni siquiera para confirmar) y obligaría a sagas/compensaciones síncronas frágiles.

### 9.4 Escalabilidad futura
- **Stateless services** → escalado horizontal con réplicas (Kubernetes / `docker compose --scale`).
- **DB-per-service** permite escalar cada base de forma independiente (réplicas de lectura en Products, que es read-heavy).
- **Caché:** Redis para el catálogo de productos (alto tráfico de lectura) y para sesiones/tokens.
- **Patrón Saga** para flujos de orden más complejos (pago, envío) con compensaciones.
- **Outbox pattern** para garantizar publicación fiable de eventos (escribir evento en la misma transacción que la orden y publicarlo con un relay).
- **API Gateway** evolucionable a Kong/Traefik con auth centralizada, rate-limiting y observabilidad (tracing distribuido con OpenTelemetry).
- **CI/CD:** pipeline por servicio (lint con ruff → tests → build imagen → deploy), habilitado por el desacoplamiento.

---

## 10. Roadmap de Implementación

Orden sugerido para construir incrementalmente con valor demostrable en cada paso:

1. **Andamiaje del monorepo** — estructura de carpetas, `docker-compose.yml`, `.env.example`, Makefile.
2. **Products Service** — modelo, serializer, viewset, migraciones, seed, tests. *(Demo: CRUD funcionando)*.
3. **Cart Service** — modelo, cliente HTTP a Products, lógica de add/update/remove, tests con mocks.
4. **Orders Service** — orquestación REST (leer carrito + validar stock), creación atómica, tests.
5. **Eventos RabbitMQ** — publisher en Orders, consumers en Products (stock) y Cart (limpieza).
6. **API Gateway (Nginx)** — enrutamiento unificado + CORS.
7. **Frontend** — capa API + Zustand store → ProductsPage → CartPage → OrderSuccessPage.
8. **Dockerización completa** — Dockerfiles, `docker compose up --build` levanta todo.
9. **Tests** — unit (backend + frontend) e integración end-to-end.
10. **README + pulido** — documentación, decisiones técnicas, limpieza con ruff.

> **Tip de evaluación:** entregar después del paso 4 ya constituye un MVP funcional (flujo completo vía REST). Los eventos (paso 5) elevan la solución a "arquitectura de microservicios real". Prioriza tener el flujo end-to-end funcionando antes de pulir.
