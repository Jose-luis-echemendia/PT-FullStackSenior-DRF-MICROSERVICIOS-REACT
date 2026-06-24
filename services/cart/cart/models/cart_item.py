from decimal import Decimal

from django.db import models

from .base import BaseModel
from .cart import Cart


class CartItem(BaseModel):
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)
    product_id = models.UUIDField()
    product_name = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("cart", "product_id")
        ordering = ["product_name"]

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity
