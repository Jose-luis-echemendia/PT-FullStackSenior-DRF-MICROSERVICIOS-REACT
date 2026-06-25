"""Tests for the versioned catalog cache and its strategic invalidation."""

import pytest
from rest_framework.test import APIClient

from products.cache import cache_version, invalidate_products
from products.management.commands.consume_events import handle_order_created
from products.models import Product

from .factories import ProductFactory


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_list_is_served_from_cache_until_invalidated(client):
    ProductFactory.create_batch(2)
    assert client.get("/api/products/").data["count"] == 2

    # Add a product straight through the ORM, bypassing API invalidation.
    ProductFactory()
    # Still the cached (stale) page — proof the response came from cache.
    assert client.get("/api/products/").data["count"] == 2

    # Explicit invalidation supersedes the cached page.
    invalidate_products()
    assert client.get("/api/products/").data["count"] == 3


@pytest.mark.django_db
def test_write_through_api_invalidates(client):
    ProductFactory.create_batch(2)
    assert client.get("/api/products/").data["count"] == 2  # prime cache

    resp = client.post(
        "/api/products/",
        {"name": "X", "price": "5.00", "stock": 1, "category": Product.Category.TECNOLOGIA},
        format="json",
    )
    assert resp.status_code == 201
    # The create bumped the version, so the next list is fresh.
    assert client.get("/api/products/").data["count"] == 3


@pytest.mark.django_db
def test_detail_is_cached_and_invalidated_on_update(client):
    product = ProductFactory(stock=10)
    url = f"/api/products/{product.id}/"
    assert client.get(url).data["stock"] == 10  # prime cache

    client.patch(url, {"stock": 99}, format="json")
    # perform_update invalidated the cache → detail reflects the new stock.
    assert client.get(url).data["stock"] == 99


def test_invalidate_bumps_version():
    before = cache_version()
    invalidate_products()
    assert cache_version() == before + 1


@pytest.mark.django_db
def test_order_created_event_invalidates_cache(client, django_capture_on_commit_callbacks):
    product = ProductFactory(stock=10)
    url = f"/api/products/{product.id}/"
    assert client.get(url).data["stock"] == 10  # prime cache

    with django_capture_on_commit_callbacks(execute=True):
        handle_order_created(
            "order.created",
            {"order_id": "o1", "items": [{"product_id": str(product.id), "quantity": 3}]},
        )

    # Async stock change invalidated the cache → detail is fresh.
    assert client.get(url).data["stock"] == 7
