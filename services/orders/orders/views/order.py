from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .. import services
from ..models import Order
from ..serializers import OrderSerializer


def get_user_id(request) -> str:
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        raise NotAuthenticated("Falta el encabezado X-User-Id.")
    return user_id


class OrderListCreateView(APIView):
    """GET lists the user's orders; POST creates one from their cart."""

    def get(self, request):
        user_id = get_user_id(request)
        orders = Order.objects.filter(user_id=user_id).prefetch_related("items")
        return Response(OrderSerializer(orders, many=True).data)

    def post(self, request):
        user_id = get_user_id(request)
        order = services.create_order_from_cart(user_id)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(RetrieveAPIView):
    serializer_class = OrderSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Order.objects.filter(user_id=get_user_id(self.request)).prefetch_related("items")
