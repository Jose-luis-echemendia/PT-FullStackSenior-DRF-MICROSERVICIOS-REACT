from decimal import Decimal

import factory

from products.models import Product


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Product {n}")
    description = "A sample product"
    price = Decimal("10.00")
    stock = 50
    category = Product.Category.TECNOLOGIA
    is_active = True
