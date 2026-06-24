---
name: compose
description: Atajos seguros de Docker Compose para levantar y operar el stack completo (DBs, RabbitMQ, microservicios, gateway, frontend). Úsalo para arrancar, ver logs o detener el entorno. Argumento - la acción (up | down | logs | ps | build | restart <svc>).
---

# Operación del stack con Docker Compose

Orquesta el `docker-compose.yml` de la raíz. Requiere un `.env`
(copia de `.env.example`).

## Acciones

- **up** — `docker compose up --build -d`. Espera a que los healthchecks estén
  sanos; luego muestra `docker compose ps`. App en `http://localhost:5173`,
  API en `http://localhost:8080`, RabbitMQ admin en `http://localhost:15672`.
- **down** — `docker compose down` (sin `-v`: preserva los volúmenes de datos).
  Borrar volúmenes está vetado por seguridad; si el usuario lo pide
  explícitamente, confírmalo antes.
- **logs** — `docker compose logs -f --tail=100 [servicio]`.
- **ps** — `docker compose ps`.
- **build** — `docker compose build [servicio]`.
- **restart <svc>** — `docker compose restart <svc>`.

## Preparación

1. Si no existe `.env`, crea uno desde `.env.example` antes del primer `up`.
2. Tras `up`, si es la primera vez, verifica que las migraciones corrieron
   (el `command` de cada servicio incluye `manage.py migrate`) y opcionalmente
   siembra datos: `docker compose exec products python manage.py seed_products`.

## Reglas

- Nunca uses `down -v` ni `--volumes` sin confirmación explícita: destruye los
  datos de Postgres.
- Reporta el estado real de los contenedores; si uno queda `unhealthy` o
  reiniciándose, muestra sus logs en vez de declarar éxito.
