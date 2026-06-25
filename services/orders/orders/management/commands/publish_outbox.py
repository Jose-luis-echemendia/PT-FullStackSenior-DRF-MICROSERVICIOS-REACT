"""Outbox relay: publishes unsent ``OutboxEvent`` rows to RabbitMQ.

Polls the outbox table, publishing each pending event with retry. Delivery is
at-least-once (a row is only marked sent once the broker acknowledges the
publish); consumers are idempotent, so duplicates are harmless.

Run as a dedicated process:  ``python manage.py publish_outbox``
"""

import logging
import time

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from orders.models import OutboxEvent
from shared.events import publish_event

logger = logging.getLogger(__name__)

POLL_INTERVAL = 1.0  # seconds between polls when the outbox is empty
BATCH_SIZE = 50


def relay_pending() -> int:
    """Publish one batch of pending events. Returns how many were sent.

    ``select_for_update(skip_locked=True)`` lets multiple relay instances run
    safely: each locks a disjoint set of rows. A failed publish leaves the row
    pending (``published_at`` stays NULL) to be retried on the next poll.
    """
    sent = 0
    with transaction.atomic():
        rows = list(
            OutboxEvent.objects.select_for_update(skip_locked=True)
            .filter(published_at__isnull=True)
            .order_by("created_at")[:BATCH_SIZE]
        )
        for row in rows:
            row.attempts += 1
            if publish_event(row.routing_key, row.payload):
                row.published_at = timezone.now()
                sent += 1
            row.save(update_fields=["attempts", "published_at"])
    return sent


class Command(BaseCommand):
    help = "Relay outbox events to RabbitMQ (at-least-once delivery)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Outbox relay started..."))
        while True:
            try:
                relay_pending()
            except Exception:  # noqa: BLE001 - keep the relay alive on any error
                logger.exception("Outbox relay iteration failed")
            time.sleep(POLL_INTERVAL)
