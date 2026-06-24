"""Lightweight RabbitMQ helpers shared across services.

Topology:
    exchange: ``ecommerce.events`` (type=topic, durable)
    routing keys: ``order.created`` (extendable)

Publishing is best-effort and never blocks the request path: a broker outage
logs an error instead of raising, so the HTTP transaction still succeeds.
Consuming runs in a dedicated worker process (see ``consume_events`` command).
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable

import pika
from django.conf import settings

logger = logging.getLogger(__name__)

EXCHANGE = "ecommerce.events"


def _params() -> pika.URLParameters:
    return pika.URLParameters(settings.RABBITMQ_URL)


def publish_event(routing_key: str, payload: dict) -> None:
    """Publish a domain event. Failures are logged, not raised."""
    try:
        connection = pika.BlockingConnection(_params())
        channel = connection.channel()
        channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
        channel.basic_publish(
            exchange=EXCHANGE,
            routing_key=routing_key,
            body=json.dumps(payload).encode(),
            properties=pika.BasicProperties(
                delivery_mode=2,  # persistent
                content_type="application/json",
            ),
        )
        connection.close()
        logger.info("Published %s: %s", routing_key, payload)
    except Exception:  # noqa: BLE001 - never break the caller on broker issues
        logger.exception("Failed to publish event %s", routing_key)


def consume(
    queue_name: str,
    routing_keys: list[str],
    handler: Callable[[str, dict], None],
    *,
    max_retries: int = 30,
) -> None:
    """Block forever consuming events, dispatching each message to ``handler``.

    Retries the initial connection so the worker survives RabbitMQ not being
    ready yet at container start-up.
    """
    connection = None
    for attempt in range(1, max_retries + 1):
        try:
            connection = pika.BlockingConnection(_params())
            break
        except pika.exceptions.AMQPConnectionError:
            logger.warning("RabbitMQ not ready (attempt %s/%s)", attempt, max_retries)
            time.sleep(2)
    if connection is None:
        raise RuntimeError("Could not connect to RabbitMQ")

    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=queue_name, durable=True)
    for key in routing_keys:
        channel.queue_bind(exchange=EXCHANGE, queue=queue_name, routing_key=key)
    channel.basic_qos(prefetch_count=1)

    def _on_message(ch, method, _properties, body):
        try:
            payload = json.loads(body)
            handler(method.routing_key, payload)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:  # noqa: BLE001
            logger.exception("Error handling %s; requeuing", method.routing_key)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_consume(queue=queue_name, on_message_callback=_on_message)
    logger.info("Consuming queue '%s' bound to %s", queue_name, routing_keys)
    channel.start_consuming()
