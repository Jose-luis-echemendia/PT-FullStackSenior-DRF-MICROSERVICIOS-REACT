from django.db import models

from .base import TimestampedModel


class Product(TimestampedModel):
    class Category(models.TextChoices):
        TECNOLOGIA = "TECNOLOGIA", "Tecnología"
        ELECTRODOMESTICO = "ELECTRODOMESTICO", "Electrodoméstico"
        ELECTROMOVILIDAD = "ELECTROMOVILIDAD", "Electromovilidad"
        ALIMENTOS = "ALIMENTOS", "Alimentos"
        ENERGIA = "ENERGIA", "Energía"

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    category = models.CharField(  # noqa: DJ001
        max_length=20,
        choices=Category.choices,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} (${self.price})"
