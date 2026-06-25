import pytest
from rest_framework.test import APIClient

from products.management.commands.consume_events import handle_order_created
from products.models import ProcessedEvent, Product

from .factories import ProductFactory


@pytest.fixture
def client():
    return APIClient()


# ── CRUD básico ──────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_products(client):
    ProductFactory.create_batch(3)
    resp = client.get("/api/products/")
    assert resp.status_code == 200
    assert resp.data["count"] == 3


@pytest.mark.django_db
def test_retrieve_product(client):
    product = ProductFactory()
    resp = client.get(f"/api/products/{product.id}/")
    assert resp.status_code == 200
    assert resp.data["name"] == product.name


@pytest.mark.django_db
def test_create_product(client):
    payload = {
        "name": "Nuevo",
        "price": "19.99",
        "stock": 5,
        "category": Product.Category.TECNOLOGIA,
    }
    resp = client.post("/api/products/", payload, format="json")
    assert resp.status_code == 201
    assert Product.objects.count() == 1
    assert resp.data["category"] == Product.Category.TECNOLOGIA


@pytest.mark.django_db
def test_create_product_rejects_negative_price(client):
    resp = client.post("/api/products/", {"name": "X", "price": "-1", "stock": 5}, format="json")
    assert resp.status_code == 400
    assert "price" in resp.data


@pytest.mark.django_db
def test_update_product(client):
    product = ProductFactory(stock=10)
    resp = client.patch(f"/api/products/{product.id}/", {"stock": 99}, format="json")
    assert resp.status_code == 200
    product.refresh_from_db()
    assert product.stock == 99


@pytest.mark.django_db
def test_delete_product(client):
    product = ProductFactory()
    resp = client.delete(f"/api/products/{product.id}/")
    assert resp.status_code == 204
    assert Product.objects.count() == 0


# ── Paginación ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_returns_paginated_response(client):
    ProductFactory.create_batch(5)
    resp = client.get("/api/products/")
    assert resp.status_code == 200
    assert "count" in resp.data
    assert "results" in resp.data
    assert resp.data["count"] == 5


@pytest.mark.django_db
def test_list_respects_page_size_query_param(client):
    ProductFactory.create_batch(10)
    resp = client.get("/api/products/", {"page_size": 6})
    assert resp.status_code == 200
    assert resp.data["count"] == 10
    assert len(resp.data["results"]) == 6


# ── Filtro por categoría ─────────────────────────────────────────────────────


@pytest.mark.django_db
def test_filter_by_category(client):
    ProductFactory.create_batch(2, category=Product.Category.TECNOLOGIA)
    ProductFactory.create_batch(3, category=Product.Category.ALIMENTOS)

    resp = client.get("/api/products/", {"category": "TECNOLOGIA"})
    assert resp.status_code == 200
    assert resp.data["count"] == 2

    resp = client.get("/api/products/", {"category": "ALIMENTOS"})
    assert resp.status_code == 200
    assert resp.data["count"] == 3


# ── Filtro por precio ────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_filter_by_price_min(client):
    ProductFactory(price="10.00")
    ProductFactory(price="50.00")
    ProductFactory(price="100.00")

    resp = client.get("/api/products/", {"price_min": "50"})
    assert resp.status_code == 200
    assert resp.data["count"] == 2


@pytest.mark.django_db
def test_filter_by_price_max(client):
    ProductFactory(price="10.00")
    ProductFactory(price="50.00")
    ProductFactory(price="100.00")

    resp = client.get("/api/products/", {"price_max": "50"})
    assert resp.status_code == 200
    assert resp.data["count"] == 2


@pytest.mark.django_db
def test_filter_by_price_range(client):
    ProductFactory(price="10.00")
    ProductFactory(price="50.00")
    ProductFactory(price="100.00")

    resp = client.get("/api/products/", {"price_min": "20", "price_max": "60"})
    assert resp.status_code == 200
    assert resp.data["count"] == 1


# ── Filtro por stock ─────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_filter_by_stock_min(client):
    ProductFactory(stock=0)
    ProductFactory(stock=5)
    ProductFactory(stock=20)

    resp = client.get("/api/products/", {"stock_min": "5"})
    assert resp.status_code == 200
    assert resp.data["count"] == 2


@pytest.mark.django_db
def test_filter_by_stock_max(client):
    ProductFactory(stock=0)
    ProductFactory(stock=5)
    ProductFactory(stock=20)

    resp = client.get("/api/products/", {"stock_max": "5"})
    assert resp.status_code == 200
    assert resp.data["count"] == 2


@pytest.mark.django_db
def test_filter_in_stock(client):
    ProductFactory(stock=0)
    ProductFactory(stock=0)
    ProductFactory(stock=10)

    resp = client.get("/api/products/", {"in_stock": "true"})
    assert resp.status_code == 200
    assert resp.data["count"] == 1


# ── Búsqueda por texto ───────────────────────────────────────────────────────


@pytest.mark.django_db
def test_search_by_name(client):
    ProductFactory(name="Teclado mecánico")
    ProductFactory(name="Mouse gamer")
    ProductFactory(name="Monitor 27 pulgadas")

    resp = client.get("/api/products/", {"search": "gamer"})
    assert resp.status_code == 200
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["name"] == "Mouse gamer"


@pytest.mark.django_db
def test_search_by_description(client):
    ProductFactory(name="Laptop", description="Con pantalla retina y chip M2")
    ProductFactory(name="Tablet", description="Procesador Snapdragon 865")

    resp = client.get("/api/products/", {"search": "retina"})
    assert resp.status_code == 200
    assert resp.data["count"] == 1


# ── Ordenamiento ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_ordering_by_price_asc(client):
    ProductFactory(price="100.00")
    ProductFactory(price="10.00")
    ProductFactory(price="50.00")

    resp = client.get("/api/products/", {"ordering": "price"})
    assert resp.status_code == 200
    prices = [float(p["price"]) for p in resp.data["results"]]
    assert prices == sorted(prices)


@pytest.mark.django_db
def test_ordering_by_price_desc(client):
    ProductFactory(price="100.00")
    ProductFactory(price="10.00")
    ProductFactory(price="50.00")

    resp = client.get("/api/products/", {"ordering": "-price"})
    assert resp.status_code == 200
    prices = [float(p["price"]) for p in resp.data["results"]]
    assert prices == sorted(prices, reverse=True)


# ── Categorías ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_categories(client):
    resp = client.get("/api/products/categories/")
    assert resp.status_code == 200
    values = [c["value"] for c in resp.data]
    assert "TECNOLOGIA" in values
    assert len(resp.data) == 5


# ── Eventos ──────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_order_created_event_decrements_stock():
    product = ProductFactory(stock=10)
    payload = {
        "order_id": "order-1",
        "items": [{"product_id": str(product.id), "quantity": 3}],
    }
    handle_order_created("order.created", payload)
    product.refresh_from_db()
    assert product.stock == 7


@pytest.mark.django_db
def test_order_created_event_is_idempotent():
    product = ProductFactory(stock=10)
    payload = {
        "order_id": "order-1",
        "items": [{"product_id": str(product.id), "quantity": 3}],
    }
    handle_order_created("order.created", payload)
    handle_order_created("order.created", payload)  # redelivery
    product.refresh_from_db()
    assert product.stock == 7
    assert ProcessedEvent.objects.count() == 1
