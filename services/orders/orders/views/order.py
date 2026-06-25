from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.mixins import UserIdMixin
from shared.throttles import CheckoutThrottle, OrderThrottle

from .. import services
from ..models import Order
from ..serializers import OrderSerializer

_USER_ID_PARAM = OpenApiParameter(
    "X-User-Id",
    location=OpenApiParameter.HEADER,
    required=True,
    description="Identificador anónimo de usuario generado por el frontend.",
)

_ORDER_TAG = ["Orders"]


class OrderListCreateView(UserIdMixin, APIView):
    """GET lista las órdenes del usuario; POST crea una desde su carrito."""

    def get_throttles(self):
        if self.request.method == "POST":
            return [CheckoutThrottle()]
        return [OrderThrottle()]

    @extend_schema(
        summary="Listar órdenes del usuario",
        description="Retorna todas las órdenes del usuario identificado por X-User-Id, con sus ítems anidados.",
        parameters=[_USER_ID_PARAM],
        responses={200: OrderSerializer(many=True)},
        tags=_ORDER_TAG,
    )
    def get(self, request):
        user_id = self.get_user_id()
        orders = Order.objects.filter(user_id=user_id).prefetch_related("items")
        return Response(OrderSerializer(orders, many=True).data)

    @extend_schema(
        summary="Crear orden desde el carrito",
        description=(
            "Convierte el carrito actual en una orden. No requiere body. "
            "El flujo interno: lee el carrito → valida stock → crea Order + OrderItems en transacción → "
            "publica `order.created` tras el commit (best-effort). "
            "Tasa límite: 10 peticiones/minuto por usuario."
        ),
        parameters=[_USER_ID_PARAM],
        request=None,
        responses={
            201: OrderSerializer,
            400: OpenApiResponse(description="Carrito vacío o sin ítems"),
            409: OpenApiResponse(description="Stock insuficiente para uno o más productos"),
            503: OpenApiResponse(description="Cart Service o Products Service no disponible"),
        },
        tags=_ORDER_TAG,
    )
    def post(self, request):
        user_id = self.get_user_id()
        order = services.create_order_from_cart(user_id)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(UserIdMixin, RetrieveAPIView):
    """Detalle de una orden específica del usuario."""

    serializer_class = OrderSerializer
    lookup_field = "id"
    throttle_classes = [OrderThrottle]

    @extend_schema(
        summary="Detalle de una orden",
        description="Retorna la orden identificada por `id`, siempre que pertenezca al usuario (X-User-Id).",
        parameters=[_USER_ID_PARAM],
        responses={
            200: OrderSerializer,
            404: OpenApiResponse(description="Orden no encontrada o no pertenece al usuario"),
        },
        tags=_ORDER_TAG,
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Order.objects.filter(user_id=self.get_user_id()).prefetch_related("items")
