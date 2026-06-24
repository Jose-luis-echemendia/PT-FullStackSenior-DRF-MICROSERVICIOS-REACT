"""HTTP client to the Products service (synchronous, request-blocking)."""

import requests
from django.conf import settings


class ProductNotFound(Exception):
    pass


class ProductsServiceError(Exception):
    pass


def fetch_product(product_id: str) -> dict:
    url = f"{settings.PRODUCTS_SERVICE_URL}/api/products/{product_id}/"
    try:
        resp = requests.get(url, timeout=5)
    except requests.RequestException as exc:
        raise ProductsServiceError(str(exc)) from exc

    if resp.status_code == 404:
        raise ProductNotFound(product_id)
    if resp.status_code != 200:
        raise ProductsServiceError(f"Products returned {resp.status_code}")
    return resp.json()
