from rest_framework import serializers

from ..models import Product


class ProductReadSerializer(serializers.ModelSerializer):
    """Serializer de solo lectura; se usa en GET y como respuesta de escritura."""

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "stock",
            "category",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "price": {"help_text": "Precio en string decimal (nunca float). Ej: '19.99'"},
            "stock": {
                "help_text": "Unidades disponibles. Decrementado automáticamente al confirmar una orden."
            },
            "category": {
                "help_text": "TECNOLOGIA | ELECTRODOMESTICO | ELECTROMOVILIDAD | ALIMENTOS | ENERGIA"
            },
            "is_active": {"help_text": "false oculta el producto del catálogo público."},
        }


class ProductWriteSerializer(serializers.ModelSerializer):
    """Serializer de escritura para crear y actualizar productos."""

    class Meta:
        model = Product
        fields = ["name", "description", "price", "stock", "category", "is_active"]
        extra_kwargs = {
            "price": {"help_text": "Decimal positivo mayor que 0. Ej: '19.99'"},
            "stock": {"help_text": "Entero >= 0."},
            "category": {
                "help_text": "TECNOLOGIA | ELECTRODOMESTICO | ELECTROMOVILIDAD | ALIMENTOS | ENERGIA"
            },
        }

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor que 0.")
        return value

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("El nombre no puede estar vacío.")
        return value

    def to_representation(self, instance):
        return ProductReadSerializer(instance, context=self.context).data
