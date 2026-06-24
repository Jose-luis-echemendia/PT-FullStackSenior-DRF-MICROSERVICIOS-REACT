from decimal import Decimal

from django.db import models

from .base import TimestampedModel


class Cart(TimestampedModel):
    user_id = models.CharField(max_length=64, unique=True, db_index=True)

    def __str__(self) -> str:
        return f"Cart<{self.user_id}>"

    @property
    def subtotal(self) -> Decimal:
        return sum((item.line_total for item in self.items.all()), Decimal("0.00"))
