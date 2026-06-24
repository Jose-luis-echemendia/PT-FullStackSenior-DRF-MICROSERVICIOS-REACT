from django.db import models

from .base import TimestampedModel


class Product(TimestampedModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return f"{self.name} (${self.price})"
