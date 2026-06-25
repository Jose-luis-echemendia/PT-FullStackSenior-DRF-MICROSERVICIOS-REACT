from rest_framework import serializers

from ..models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """Ítem del carrito con precio de línea calculado."""

    line_total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        help_text="unit_price × quantity (string decimal).",
    )

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "product_name",
            "unit_price",
            "quantity",
            "line_total",
        ]
        extra_kwargs = {
            "product_id": {"help_text": "UUID del producto en el catálogo."},
            "unit_price": {
                "help_text": "Precio unitario en el momento de agregar al carrito (string decimal)."
            },
        }


class CartSerializer(serializers.ModelSerializer):
    """Carrito completo con ítems anidados y subtotal calculado."""

    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        help_text="Suma de todos los line_total (string decimal).",
    )

    class Meta:
        model = Cart
        fields = ["id", "user_id", "items", "subtotal", "updated_at"]
        extra_kwargs = {
            "user_id": {"help_text": "Identificador anónimo del usuario (X-User-Id header)."},
        }


class AddItemSerializer(serializers.Serializer):
    """Payload para agregar un producto al carrito."""

    product_id = serializers.UUIDField(help_text="UUID del producto a agregar.")
    quantity = serializers.IntegerField(
        min_value=1,
        default=1,
        help_text="Cantidad a agregar. Mínimo 1, por defecto 1.",
    )


class UpdateItemSerializer(serializers.Serializer):
    """Payload para actualizar la cantidad de un ítem del carrito."""

    quantity = serializers.IntegerField(
        min_value=1,
        help_text="Nueva cantidad. Mínimo 1.",
    )
