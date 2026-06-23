# CLAUDE.md — E-commerce Microservicios (DRF + React)

Prueba técnica Full-Stack Senior. La fuente de verdad del diseño es
[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Lee ese plan antes de
implementar cualquier servicio o vista; aquí solo se resumen las convenciones
operativas.

## Arquitectura

Flujo **Productos → Carrito → Orden** (sin pasarela de pago). Monorepo con
3 microservicios DRF + gateway Nginx + frontend React, orquestados por Docker
Compose.

- `services/products` (`:8001`) — catálogo y stock, fuente de verdad.
- `services/cart` (`:8002`) — carrito por `user_id` (token anónimo `X-User-Id`).
- `services/orders` (`:8003`) — orden desde carrito, snapshot de items.
- `gateway/` — Nginx en `:8080`, enruta `/api/{products,cart,orders}/`.
- `frontend/` — React SPA (Vite + Zustand), dev en `:5173`.
- RabbitMQ — eventos `order.created` (Products descuenta stock, Cart se vacía).

**Database-per-service:** cada servicio tiene su Postgres. Nunca cruces FK ni
accedas a la DB de otro servicio. Para validaciones síncronas se usa REST
(`clients.py`); los efectos secundarios desacoplados van por eventos.

## Convenciones de backend (patrón establecido en `services/products`)

- Proyecto Django en `config/`, app de dominio con el nombre del servicio.
- PK `UUIDField`; dinero en `DecimalField` (nunca float).
- DRF `ModelViewSet` + `DefaultRouter`; paginación 20; `django-filter`.
- Settings leen env con `python-decouple`; DB vía `dj-database-url`
  (SQLite por defecto en local/tests, Postgres con `DATABASE_URL` en Docker).
- Lógica inter-servicios en `services.py` + `clients.py`; eventos en
  `shared/events.py` (publish best-effort, nunca rompe el request).
- Tests con `pytest-django` + `factory-boy`; mock de HTTP con `responses`.

## Tooling Python

**Poetry declara, uv instala, ruff formatea.** No mezclar pip directo.

- Instalar: `uv pip install` / `poetry install`.
- Ejecutar: `uv run python manage.py ...`.
- Calidad: `ruff check --fix .` y `ruff format .` antes de cada entrega.
- Tests: `uv run pytest`.

## Skills de proyecto

- `/scaffold-service <nombre>` — genera un microservicio DRF nuevo (cart,
  orders) replicando el patrón de `products`.
- `/check [servicio]` — gate de calidad: `ruff check` + `ruff format --check`
  + `pytest` de uno o todos los servicios.
- `/compose <up|down|logs|...>` — atajos seguros de Docker Compose.

## Flujo de trabajo

Sigue el roadmap del §10 del plan. Tras cada servicio corre `/check`. No marques
algo como terminado sin que `ruff` y `pytest` pasen.
