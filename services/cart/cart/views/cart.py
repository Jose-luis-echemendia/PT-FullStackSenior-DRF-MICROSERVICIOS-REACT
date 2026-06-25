from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.mixins import UserIdMixin
from shared.throttles import CartThrottle

from .. import services
from ..models import CartItem
from ..serializers import AddItemSerializer, CartSerializer, UpdateItemSerializer

_USER_ID_PARAM = OpenApiParameter(
    "X-User-Id",
    location=OpenApiParameter.HEADER,
    required=True,
    description="Identificador anónimo de usuario generado por el frontend.",
)

_CART_TAG = ["Cart"]


class CartView(UserIdMixin, APIView):
    """GET el carrito del usuario; DELETE para vaciarlo."""

    throttle_classes = [CartThrottle]

    @extend_schema(
        summary="Obtener carrito",
        description="Retorna el carrito del usuario (se crea automáticamente si no existe).",
        parameters=[_USER_ID_PARAM],
        responses={200: CartSerializer},
        tags=_CART_TAG,
    )
    def get(self, request):
        cart = services.get_or_create_cart(self.get_user_id())
        return Response(CartSerializer(cart).data)

    @extend_schema(
        summary="Vaciar carrito",
        description="Elimina todos los ítems del carrito. Retorna 204 sin cuerpo.",
        parameters=[_USER_ID_PARAM],
        responses={204: OpenApiResponse(description="Carrito vaciado")},
        tags=_CART_TAG,
    )
    def delete(self, request):
        services.clear_cart(self.get_user_id())
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemsView(UserIdMixin, APIView):
    """POST un ítem al carrito."""

    throttle_classes = [CartThrottle]

    @extend_schema(
        summary="Agregar ítem al carrito",
        description=(
            "Agrega un producto al carrito. Si el producto ya existe, incrementa la cantidad. "
            "Valida stock y obtiene el precio actual del Products Service."
        ),
        parameters=[_USER_ID_PARAM],
        request=AddItemSerializer,
        responses={
            201: CartSerializer,
            404: OpenApiResponse(description="Producto no encontrado en el catálogo"),
            409: OpenApiResponse(description="Sin stock suficiente"),
            503: OpenApiResponse(description="Products Service no disponible"),
        },
        tags=_CART_TAG,
    )
    def post(self, request):
        user_id = self.get_user_id()
        serializer = AddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_item(
            user_id,
            str(serializer.validated_data["product_id"]),
            serializer.validated_data["quantity"],
        )
        cart = services.get_or_create_cart(user_id)
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(UserIdMixin, APIView):
    """PATCH para cambiar cantidad; DELETE para quitar un ítem."""

    throttle_classes = [CartThrottle]

    def _get_item(self, item_id) -> CartItem:
        return CartItem.objects.get(id=item_id, cart__user_id=self.get_user_id())

    @extend_schema(
        summary="Actualizar cantidad de un ítem",
        description="Modifica la cantidad de un ítem existente. Retorna el carrito actualizado.",
        parameters=[_USER_ID_PARAM],
        request=UpdateItemSerializer,
        responses={
            200: CartSerializer,
            404: OpenApiResponse(description="Ítem no encontrado en el carrito"),
        },
        tags=_CART_TAG,
    )
    def patch(self, request, item_id):
        try:
            item = self._get_item(item_id)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = UpdateItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.update_item_quantity(item, serializer.validated_data["quantity"])
        cart = services.get_or_create_cart(self.get_user_id())
        return Response(CartSerializer(cart).data)

    @extend_schema(
        summary="Eliminar ítem del carrito",
        description="Quita un ítem del carrito. Retorna el carrito actualizado.",
        parameters=[_USER_ID_PARAM],
        responses={
            200: CartSerializer,
            404: OpenApiResponse(description="Ítem no encontrado en el carrito"),
        },
        tags=_CART_TAG,
    )
    def delete(self, request, item_id):
        try:
            item = self._get_item(item_id)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        item.delete()
        cart = services.get_or_create_cart(self.get_user_id())
        return Response(CartSerializer(cart).data)
