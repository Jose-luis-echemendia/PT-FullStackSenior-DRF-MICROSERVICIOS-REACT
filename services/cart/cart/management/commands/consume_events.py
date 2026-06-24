"""Worker that consumes ``order.created`` and empties the buyer's cart.

Run as a dedicated process:  ``python manage.py consume_events``
"""

from django.core.management.base import BaseCommand

from cart.models import Cart
from shared.events import consume

QUEUE = "cart.order_created"


def handle_order_created(_routing_key: str, payload: dict) -> None:
    user_id = payload.get("user_id")
    if user_id:
        # Deleting the cart cascades to its items; idempotent by nature.
        Cart.objects.filter(user_id=user_id).delete()


class Command(BaseCommand):
    help = "Consume order.created events and clear the user's cart."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Cart consumer started..."))
        consume(QUEUE, ["order.created"], handle_order_created)
