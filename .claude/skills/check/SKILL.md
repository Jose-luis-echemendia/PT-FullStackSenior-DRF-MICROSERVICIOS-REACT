---
name: check
description: Gate de calidad de un microservicio backend - corre ruff check, ruff format --check y pytest. Úsalo tras implementar o modificar cualquier servicio DRF, antes de dar algo por terminado. Argumento opcional - nombre del servicio (products | cart | orders); sin argumento corre todos.
---

# Gate de calidad backend

Verifica lint, formato y tests de uno o todos los servicios. **No marques una
tarea como terminada si esto no pasa en verde.**

## Uso

- `/check products` — solo ese servicio.
- `/check` — todos los servicios presentes bajo `services/`.

## Pasos

Para cada servicio objetivo (`services/<nombre>/`):

1. `ruff check .` — lint. Si hay fallos auto-corregibles, aplica
   `ruff check --fix .` y vuelve a verificar.
2. `ruff format --check .` — formato. Si falla, aplica `ruff format .`.
3. Tests:
   ```
   uv run pytest
   ```
   Si `uv` no está disponible o el entorno no está instalado, intenta
   `uv pip install --system -e .` / `poetry install` primero, o cae a
   `python -m pytest`. Los tests usan SQLite por defecto (no requieren Postgres).

## Salida

Reporta por servicio: ✅/❌ en lint, formato y tests, con el conteo de tests y
cualquier fallo concreto (no resumas un fallo como éxito). Si algo falla,
corrígelo y vuelve a correr antes de reportar verde.
