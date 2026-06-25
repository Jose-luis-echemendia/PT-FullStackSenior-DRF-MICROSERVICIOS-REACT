"""Worker that consumes ``order.created`` and decrements product stock.

Run as a dedicated process:  ``python manage.py consume_events``
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F

from products.cache import invalidate_products
from products.models import ProcessedEvent, Product
from shared.events import consume

QUEUE = "products.order_created"


def handle_order_created(routing_key: str, payload: dict) -> None:
    order_id = payload.get("order_id")
    event_id = f"{routing_key}:{order_id}"

    with transaction.atomic():
        # Idempotency: skip if this order was already processed.
        _, created = ProcessedEvent.objects.get_or_create(event_id=event_id)
        if not created:
            return
        for item in payload.get("items", []):
            Product.objects.filter(id=item["product_id"]).update(
                stock=F("stock") - item["quantity"]
            )
        # Stock just changed: drop the catalog cache so the UI's next fetch is
        # fresh. Runs only after a successful commit and only on first delivery.
        transaction.on_commit(invalidate_products)


class Command(BaseCommand):
    help = "Consume order.created events and decrement stock."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Products consumer started..."))
        consume(QUEUE, ["order.created"], handle_order_created)
