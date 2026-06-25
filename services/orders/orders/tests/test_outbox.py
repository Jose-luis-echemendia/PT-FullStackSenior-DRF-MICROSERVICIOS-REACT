"""Tests for the transactional outbox relay (``publish_outbox``)."""

from unittest import mock

import pytest

from orders.management.commands.publish_outbox import relay_pending
from orders.models import OutboxEvent


@pytest.fixture
def pending_event():
    return OutboxEvent.objects.create(
        routing_key="order.created",
        payload={"order_id": "o1", "user_id": "user-1", "items": []},
    )


@pytest.mark.django_db
def test_relay_publishes_and_marks_sent(pending_event):
    with mock.patch(
        "orders.management.commands.publish_outbox.publish_event", return_value=True
    ) as pub:
        sent = relay_pending()

    assert sent == 1
    pub.assert_called_once_with("order.created", pending_event.payload)
    pending_event.refresh_from_db()
    assert pending_event.published_at is not None
    assert pending_event.attempts == 1


@pytest.mark.django_db
def test_relay_keeps_row_pending_when_broker_down(pending_event):
    # Broker unreachable → publish_event returns False; row must stay pending
    # so the next poll retries it (no event lost).
    with mock.patch("orders.management.commands.publish_outbox.publish_event", return_value=False):
        sent = relay_pending()

    assert sent == 0
    pending_event.refresh_from_db()
    assert pending_event.published_at is None
    assert pending_event.attempts == 1


@pytest.mark.django_db
def test_relay_skips_already_published():
    OutboxEvent.objects.create(
        routing_key="order.created",
        payload={},
        published_at="2026-01-01T00:00:00Z",
    )
    with mock.patch(
        "orders.management.commands.publish_outbox.publish_event", return_value=True
    ) as pub:
        sent = relay_pending()

    assert sent == 0
    pub.assert_not_called()
