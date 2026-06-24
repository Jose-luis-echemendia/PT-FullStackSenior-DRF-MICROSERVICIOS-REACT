from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .. import services
from ..models import CartItem
from ..serializers import AddItemSerializer, CartSerializer, UpdateItemSerializer


def get_user_id(request) -> str:
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        raise NotAuthenticated("Falta el encabezado X-User-Id.")
    return user_id


class CartView(APIView):
    """GET the current user's cart; DELETE to empty it."""

    def get(self, request):
        cart = services.get_or_create_cart(get_user_id(request))
        return Response(CartSerializer(cart).data)

    def delete(self, request):
        services.clear_cart(get_user_id(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemsView(APIView):
    """POST a new item into the cart."""

    def post(self, request):
        user_id = get_user_id(request)
        serializer = AddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_item(
            user_id,
            str(serializer.validated_data["product_id"]),
            serializer.validated_data["quantity"],
        )
        cart = services.get_or_create_cart(user_id)
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    """PATCH quantity or DELETE a single item."""

    def _get_item(self, request, item_id) -> CartItem:
        user_id = get_user_id(request)
        return CartItem.objects.get(id=item_id, cart__user_id=user_id)

    def patch(self, request, item_id):
        try:
            item = self._get_item(request, item_id)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = UpdateItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.update_item_quantity(item, serializer.validated_data["quantity"])
        cart = services.get_or_create_cart(get_user_id(request))
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id):
        try:
            item = self._get_item(request, item_id)
        except CartItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        item.delete()
        cart = services.get_or_create_cart(get_user_id(request))
        return Response(CartSerializer(cart).data)
