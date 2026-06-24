from django.urls import path

from .views import OrderDetailView, OrderListCreateView

urlpatterns = [
    path("orders/", OrderListCreateView.as_view()),
    path("orders/<uuid:id>/", OrderDetailView.as_view()),
]
