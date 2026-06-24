import pytest
from rest_framework.test import APIClient

from products.management.commands.consume_events import handle_order_created
from products.models import ProcessedEvent, Product

from .factories import ProductFactory


@pytest.fixture
def client():
    return APIClient()


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
    payload = {"name": "Nuevo", "price": "19.99", "stock": 5}
    resp = client.post("/api/products/", payload, format="json")
    assert resp.status_code == 201
    assert Product.objects.count() == 1


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
