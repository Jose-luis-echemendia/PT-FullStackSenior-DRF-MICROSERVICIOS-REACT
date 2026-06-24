.PHONY: help up down build logs seed test test-back test-front lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the whole stack
	docker compose up --build

down: ## Stop and remove containers
	docker compose down

build: ## Build all images
	docker compose build

logs: ## Tail logs of all services
	docker compose logs -f

seed: ## Re-seed the product catalog
	docker compose exec products python manage.py seed_products

test: test-back test-front ## Run all tests

test-back: ## Run backend tests for the three services
	cd services/products && . .venv/bin/activate && pytest -q
	cd services/cart && . .venv/bin/activate && pytest -q
	cd services/orders && . .venv/bin/activate && pytest -q

test-front: ## Run frontend tests
	cd frontend && bun run test

lint: ## Lint backend (ruff) and report
	cd services/products && . .venv/bin/activate && ruff check . || true
	cd services/cart && . .venv/bin/activate && ruff check . || true
	cd services/orders && . .venv/bin/activate && ruff check . || true

clean: ## Remove volumes and local virtualenvs
	docker compose down -v
	rm -rf services/*/.venv frontend/node_modules
