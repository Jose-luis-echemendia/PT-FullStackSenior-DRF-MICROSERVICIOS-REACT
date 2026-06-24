import pytest

from .factories import ProductFactory


@pytest.mark.django_db
def test_product_str():
    product = ProductFactory(name="Tec", price="10.00")
    assert "Tec" in str(product)


@pytest.mark.django_db
def test_product_defaults_active():
    product = ProductFactory()
    assert product.is_active is True
