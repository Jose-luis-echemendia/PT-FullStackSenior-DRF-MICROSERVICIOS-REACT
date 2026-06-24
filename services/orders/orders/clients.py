"""Synchronous HTTP clients to Cart and Products services."""

import requests
from django.conf import settings


class ServiceError(Exception):
    pass


def fetch_cart(user_id: str) -> dict:
    """Read the user's cart from the Cart service."""
    url = f"{settings.CART_SERVICE_URL}/api/cart/"
    try:
        resp = requests.get(url, headers={"X-User-Id": user_id}, timeout=5)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ServiceError(f"No se pudo leer el carrito: {exc}") from exc
    return resp.json()


def fetch_product_stock(product_id: str) -> int:
    """Return current stock for a product from the Products service."""
    url = f"{settings.PRODUCTS_SERVICE_URL}/api/products/{product_id}/"
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise ServiceError(f"No se pudo validar el stock: {exc}") from exc
    return int(resp.json()["stock"])
