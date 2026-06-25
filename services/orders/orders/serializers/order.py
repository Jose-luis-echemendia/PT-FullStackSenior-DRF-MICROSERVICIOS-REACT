from rest_framework import serializers

from ..models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    """Snapshot inmutable de un producto en el momento de la compra."""

    line_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        help_text="unit_price × quantity (string decimal).",
    )

    class Meta:
        model = OrderItem
        fields = [
            "product_id",
            "product_name",
            "unit_price",
            "quantity",
            "line_total",
        ]
        extra_kwargs = {
            "product_id": {
                "help_text": "UUID del producto en el catálogo al momento de la compra."
            },
            "product_name": {
                "help_text": "Nombre del producto capturado en la orden (snapshot, no cambia)."
            },
            "unit_price": {
                "help_text": "Precio unitario en el momento de la compra (string decimal, snapshot)."
            },
        }


class OrderSerializer(serializers.ModelSerializer):
    """Orden de compra con ítems anidados."""

    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "user_id",
            "status",
            "total",
            "items",
            "created_at",
        ]
        extra_kwargs = {
            "order_number": {"help_text": "Identificador legible en formato ORD-YYYYMMDD-NNNN."},
            "status": {
                "help_text": "PENDING → orden creada; CONFIRMED → procesada; CANCELLED → cancelada."
            },
            "total": {
                "help_text": "Suma de todos los line_total al momento de la creación (string decimal)."
            },
        }
