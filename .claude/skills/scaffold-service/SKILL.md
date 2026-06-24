---
name: scaffold-service
description: Genera un microservicio DRF nuevo (cart, orders) replicando el patrón establecido en services/products. Úsalo al construir los pasos 3 y 4 del roadmap. Argumento - el nombre del servicio (cart | orders | <otro>).
---

# Scaffold de microservicio DRF

Crea un nuevo microservicio bajo `services/<nombre>/` copiando la estructura y
convenciones de `services/products` (la plantilla canónica). Reutiliza, no
reinventes: lee `services/products` antes de generar.

## Pasos

1. **Leer la plantilla.** Inspecciona `services/products/`:
   `pyproject.toml`, `ruff.toml`, `Dockerfile`, `.dockerignore`, `manage.py`,
   `config/` (settings, urls, wsgi, asgi), la app `products/`, y `shared/events.py`.
   También lee la sección correspondiente del `IMPLEMENTATION_PLAN.md`
   (§3.2 para cart, §3.3 para orders).

2. **Crear el árbol** en `services/<nombre>/`:
   - `pyproject.toml` — copia el de products; ajusta `name` y `description`.
     Conserva el grupo `[tool.poetry.group.dev.dependencies]` y la sección
     `[tool.pytest.ini_options]`. Para cart/orders el plan no añade
     dependencias nuevas (requests y pika ya están).
   - `ruff.toml`, `Dockerfile` (ajusta `EXPOSE` y el puerto del `CMD`:
     cart=8002, orders=8003), `.dockerignore`, `manage.py`.
   - `config/` — settings.py (ajusta `INSTALLED_APPS` con la app local),
     urls.py, wsgi.py, asgi.py. Settings idéntico salvo la app instalada.
   - `<nombre>/` — `models.py`, `serializers.py`, `views.py`, `urls.py`,
     `apps.py`, `admin.py`, `services.py`, `clients.py` (cuando aplique),
     `migrations/__init__.py`, `management/commands/` (consumer de eventos si
     el servicio consume), y `tests/` con `factories.py`, `test_models.py`,
     `test_api.py`.
   - `shared/events.py` — reutiliza el de products tal cual.

3. **Implementar el dominio** según el plan:
   - **cart:** modelos `Cart`/`CartItem`, `clients.fetch_product`,
     `services.add_item`, endpoints `/api/cart/` e items. Consume `order.created`
     para vaciar el carrito.
   - **orders:** modelos `Order`/`OrderItem`, `clients.fetch_cart`+`validate_stock`,
     `services.create_order_from_cart` (transacción atómica + `publish_event`).

4. **Verificar:** corre `/check <nombre>` (ruff + pytest). No termines hasta
   que pase en verde.

## Reglas

- PK `UUIDField`, dinero en `DecimalField`, `product_id` como UUID **sin FK
  cruzada** (DBs separadas).
- El cliente HTTP usa la URL del otro servicio desde env (`PRODUCTS_SERVICE_URL`,
  `CART_SERVICE_URL`).
- Eventos: publish best-effort en `shared/events.py`; consumers en
  `management/commands/consume_events.py`.
- Mockea las llamadas HTTP inter-servicio en los tests con `responses`.
