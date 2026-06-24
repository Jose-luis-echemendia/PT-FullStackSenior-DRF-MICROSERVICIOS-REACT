FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# uv: ultra-fast installer
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies. Poetry declares them; uv exports + installs fast.
COPY pyproject.toml ./
RUN pip install --no-cache-dir poetry==1.8.* poetry-plugin-export \
    && poetry export -f requirements.txt --without-hashes --with dev -o requirements.txt \
    && uv pip install --system --no-cache -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8001", "--workers", "3"]
