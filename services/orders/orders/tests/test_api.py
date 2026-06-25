import uuid

import pytest
import responses
from rest_framework.test import APIClient

from orders.models import Order, OrderItem, OutboxEvent

CART_URL = "http://cart:8002"
PRODUCTS_URL = "http://products:8001"
USER = "user-1"


@pytest.fixture
def client():
    c = APIClient()
    c.credentials(HTTP_X_USER_ID=USER)
    return c


def _mock_cart(items, subtotal):
    responses.add(
        responses.GET,
        f"{CART_URL}/api/cart/",
        json={"id": "c1", "user_id": USER, "items": items, "subtotal": subtotal},
        status=200,
    )


def _mock_stock(product_id, stock):
    responses.add(
        responses.GET,
        f"{PRODUCTS_URL}/api/products/{product_id}/",
        json={"id": product_id, "name": "X", "price": "10.00", "stock": stock},
        status=200,
    )


@pytest.mark.django_db
def test_create_order_requires_user_header():
    resp = APIClient().post("/api/orders/")
    assert resp.status_code == 403


@pytest.mark.django_db
@responses.activate
def test_create_order_empty_cart(client):
    _mock_cart(items=[], subtotal="0.00")
    resp = client.post("/api/orders/")
    assert resp.status_code == 400


@pytest.mark.django_db
@responses.activate
def test_create_order_success(client):
    pid = str(uuid.uuid4())
    item = {
        "product_id": pid,
        "product_name": "Teclado",
        "unit_price": "10.00",
        "quantity": 2,
    }
    _mock_cart(items=[item], subtotal="20.00")
    _mock_stock(pid, stock=50)

    resp = client.post("/api/orders/")

    assert resp.status_code == 201
    assert resp.data["status"] == "CONFIRMED"
    assert resp.data["total"] == "20.00"
    assert resp.data["order_number"].startswith("ORD-")
    assert len(resp.data["items"]) == 1
    assert Order.objects.count() == 1
    assert OrderItem.objects.count() == 1
    # The event is written to the outbox (unpublished) in the same transaction,
    # NOT pushed to the broker inline. The relay delivers it later.
    event = OutboxEvent.objects.get()
    assert event.routing_key == "order.created"
    assert event.published_at is None
    assert event.payload["user_id"] == USER


@pytest.mark.django_db
@responses.activate
def test_create_order_insufficient_stock(client):
    pid = str(uuid.uuid4())
    item = {
        "product_id": pid,
        "product_name": "Teclado",
        "unit_price": "10.00",
        "quantity": 5,
    }
    _mock_cart(items=[item], subtotal="50.00")
    _mock_stock(pid, stock=1)

    resp = client.post("/api/orders/")

    assert resp.status_code == 400
    assert Order.objects.count() == 0
    # Order rolled back → no outbox row leaked.
    assert OutboxEvent.objects.count() == 0


@pytest.mark.django_db
def test_list_orders(client):
    Order.objects.create(order_number="ORD-1", user_id=USER, total="10.00", status="CONFIRMED")
    Order.objects.create(order_number="ORD-2", user_id="other", total="20.00", status="CONFIRMED")
    resp = client.get("/api/orders/")
    assert resp.status_code == 200
    assert len(resp.data) == 1  # only the user's own order
