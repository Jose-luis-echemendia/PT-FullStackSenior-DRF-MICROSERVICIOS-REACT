FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml ./
RUN pip install --no-cache-dir poetry==1.8.* poetry-plugin-export \
    && poetry export -f requirements.txt --without-hashes --with dev -o requirements.txt \
    && uv pip install --system --no-cache -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8002", "--workers", "3"]
