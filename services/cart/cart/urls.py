from django.urls import path

from .views import CartItemDetailView, CartItemsView, CartView

urlpatterns = [
    path("cart/", CartView.as_view()),
    path("cart/items/", CartItemsView.as_view()),
    path("cart/items/<uuid:item_id>/", CartItemDetailView.as_view()),
]
