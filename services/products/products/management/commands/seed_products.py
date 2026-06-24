"""Seed the catalog with sample products (idempotent by name)."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from products.models import Product

SEED = [
    {
        "name": "Teclado mecánico RGB",
        "description": "Switches rojos, retroiluminado",
        "price": Decimal("59.99"),
        "stock": 25,
    },
    {
        "name": "Mouse gamer 16000 DPI",
        "description": "Sensor óptico, 7 botones",
        "price": Decimal("29.50"),
        "stock": 40,
    },
    {
        "name": 'Monitor 27" 144Hz',
        "description": "IPS, 1ms, FreeSync",
        "price": Decimal("249.00"),
        "stock": 12,
    },
    {
        "name": "Auriculares inalámbricos",
        "description": "Cancelación de ruido activa",
        "price": Decimal("89.90"),
        "stock": 30,
    },
    {
        "name": "Webcam 1080p",
        "description": "Micrófono integrado, autoenfoque",
        "price": Decimal("39.99"),
        "stock": 18,
    },
]


class Command(BaseCommand):
    help = "Load sample products."

    def handle(self, *args, **options):
        created = 0
        for data in SEED:
            _, was_created = Product.objects.get_or_create(name=data["name"], defaults=data)
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Seed complete. {created} new products."))
