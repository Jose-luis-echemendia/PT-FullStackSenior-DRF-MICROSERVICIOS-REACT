"""Order orchestration: read cart -> validate stock -> persist -> emit event."""

import datetime
import random
from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import APIException, ValidationError

from .clients import ServiceError, fetch_cart, fetch_product_stock
from .models import Order, OrderItem, OutboxEvent


class UpstreamUnavailable(APIException):
    status_code = 503
    default_detail = "Un servicio dependiente no está disponible."


def generate_order_number() -> str:
    today = datetime.date.today()
    return f"ORD-{today:%Y%m%d}-{random.randint(1000, 9999)}"


def _validate_stock(items: list[dict]) -> None:
    for item in items:
        available = fetch_product_stock(item["product_id"])
        if available < item["quantity"]:
            raise ValidationError(
                f"Stock insuficiente para '{item['product_name']}'. "
                f"Disponible: {available}, solicitado: {item['quantity']}."
            )


@transaction.atomic
def create_order_from_cart(user_id: str) -> Order:
    try:
        cart = fetch_cart(user_id)
    except ServiceError as exc:
        raise UpstreamUnavailable(str(exc)) from exc

    items = cart.get("items", [])
    if not items:
        raise ValidationError("El carrito está vacío.")

    try:
        _validate_stock(items)
    except ServiceError as exc:
        raise UpstreamUnavailable(str(exc)) from exc

    order = Order.objects.create(
        order_number=generate_order_number(),
        user_id=user_id,
        total=Decimal(str(cart["subtotal"])),
        status=Order.Status.CONFIRMED,
    )
    OrderItem.objects.bulk_create(
        [
            OrderItem(
                order=order,
                product_id=item["product_id"],
                product_name=item["product_name"],
                unit_price=Decimal(str(item["unit_price"])),
                quantity=item["quantity"],
            )
            for item in items
        ]
    )

    # Transactional outbox: persist the event in the SAME transaction as the
    # order. If the order rolls back, so does the event; if it commits, the
    # ``publish_outbox`` relay delivers it to RabbitMQ with retry. This removes
    # the "event lost when broker is down at commit" failure mode.
    OutboxEvent.objects.create(
        routing_key="order.created",
        payload={
            "order_id": str(order.id),
            "order_number": order.order_number,
            "user_id": user_id,
            "items": [{"product_id": i["product_id"], "quantity": i["quantity"]} for i in items],
        },
    )
    return order
