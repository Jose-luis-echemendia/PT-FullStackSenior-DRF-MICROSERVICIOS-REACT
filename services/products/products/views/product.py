from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from ..models import Product
from ..serializers import ProductReadSerializer, ProductWriteSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductReadSerializer
