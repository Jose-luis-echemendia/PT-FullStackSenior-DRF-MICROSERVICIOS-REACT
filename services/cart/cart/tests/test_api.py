import uuid

import pytest
import responses
from rest_framework.test import APIClient

from cart.management.commands.consume_events import handle_order_created
from cart.models import Cart, CartItem

PRODUCTS_URL = "http://products:8001"
USER = "user-1"


@pytest.fixture
def client():
    c = APIClient()
    c.credentials(HTTP_X_USER_ID=USER)
    return c


def _mock_product(product_id, *, price="10.00", stock=50, name="Tec"):
    responses.add(
        responses.GET,
        f"{PRODUCTS_URL}/api/products/{product_id}/",
        json={"id": product_id, "name": name, "price": price, "stock": stock},
        status=200,
    )


@pytest.mark.django_db
def test_get_empty_cart(client):
    resp = client.get("/api/cart/")
    assert resp.status_code == 200
    assert resp.data["items"] == []
    assert resp.data["subtotal"] == "0.00"


@pytest.mark.django_db
def test_cart_requires_user_header():
    resp = APIClient().get("/api/cart/")
    assert resp.status_code == 403  # DRF NotAuthenticated without authenticators


@pytest.mark.django_db
@responses.activate
def test_add_item(client):
    pid = str(uuid.uuid4())
    _mock_product(pid, price="10.00", stock=50)
    resp = client.post("/api/cart/items/", {"product_id": pid, "quantity": 2}, format="json")
    assert resp.status_code == 201
    assert resp.data["items"][0]["quantity"] == 2
    assert resp.data["subtotal"] == "20.00"


@pytest.mark.django_db
@responses.activate
def test_add_same_product_twice_accumulates(client):
    pid = str(uuid.uuid4())
    _mock_product(pid, price="10.00", stock=50)
    _mock_product(pid, price="10.00", stock=50)
    client.post("/api/cart/items/", {"product_id": pid, "quantity": 1}, format="json")
    resp = client.post("/api/cart/items/", {"product_id": pid, "quantity": 2}, format="json")
    assert resp.data["items"][0]["quantity"] == 3
    assert CartItem.objects.count() == 1


@pytest.mark.django_db
@responses.activate
def test_add_item_insufficient_stock(client):
    pid = str(uuid.uuid4())
    _mock_product(pid, stock=1)
    resp = client.post("/api/cart/items/", {"product_id": pid, "quantity": 5}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
@responses.activate
def test_add_nonexistent_product(client):
    pid = str(uuid.uuid4())
    responses.add(responses.GET, f"{PRODUCTS_URL}/api/products/{pid}/", status=404)
    resp = client.post("/api/cart/items/", {"product_id": pid, "quantity": 1}, format="json")
    assert resp.status_code == 404


@pytest.mark.django_db
@responses.activate
def test_update_and_delete_item(client):
    pid = str(uuid.uuid4())
    _mock_product(pid, stock=50)
    _mock_product(pid, stock=50)
    client.post("/api/cart/items/", {"product_id": pid, "quantity": 1}, format="json")
    item_id = CartItem.objects.first().id

    resp = client.patch(f"/api/cart/items/{item_id}/", {"quantity": 4}, format="json")
    assert resp.status_code == 200
    assert resp.data["items"][0]["quantity"] == 4

    resp = client.delete(f"/api/cart/items/{item_id}/")
    assert resp.status_code == 200
    assert resp.data["items"] == []


@pytest.mark.django_db
def test_order_created_event_clears_cart():
    cart = Cart.objects.create(user_id=USER)
    CartItem.objects.create(
        cart=cart,
        product_id=uuid.uuid4(),
        product_name="X",
        unit_price="10.00",
        quantity=1,
    )
    handle_order_created("order.created", {"user_id": USER, "order_id": "o1"})
    assert Cart.objects.filter(user_id=USER).count() == 0
