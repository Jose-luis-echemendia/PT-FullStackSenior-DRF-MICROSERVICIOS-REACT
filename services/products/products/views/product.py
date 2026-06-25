from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..cache import CACHE_TTL, detail_cache_key, invalidate_products, list_cache_key
from ..filters import ProductFilter
from ..models import Product
from ..serializers import ProductReadSerializer, ProductWriteSerializer

_PRODUCT_TAG = ["Products"]

_FILTER_PARAMS = [
    OpenApiParameter(
        "category",
        description="Filtrar por categoría (TECNOLOGIA, ELECTRODOMESTICO, ELECTROMOVILIDAD, ALIMENTOS, ENERGIA)",
    ),
    OpenApiParameter("price_min", description="Precio mínimo (decimal)"),
    OpenApiParameter("price_max", description="Precio máximo (decimal)"),
    OpenApiParameter("stock_min", description="Stock mínimo"),
    OpenApiParameter("stock_max", description="Stock máximo"),
    OpenApiParameter(
        "in_stock", description="true → solo con stock > 0; false → solo sin stock", type=bool
    ),
    OpenApiParameter("is_active", description="Filtrar por estado activo/inactivo", type=bool),
    OpenApiParameter("search", description="Búsqueda por nombre o descripción"),
    OpenApiParameter(
        "ordering", description="Ordenar por: price, stock, created_at, name (prefijo - para desc)"
    ),
]


@extend_schema_view(
    list=extend_schema(
        summary="Listar productos",
        description="Retorna una lista paginada de productos. Admite filtros, búsqueda y ordenamiento.",
        parameters=_FILTER_PARAMS,
        responses={200: ProductReadSerializer(many=True)},
        tags=_PRODUCT_TAG,
    ),
    create=extend_schema(
        summary="Crear producto",
        request=ProductWriteSerializer,
        responses={201: ProductReadSerializer},
        tags=_PRODUCT_TAG,
    ),
    retrieve=extend_schema(
        summary="Detalle de producto",
        responses={200: ProductReadSerializer},
        tags=_PRODUCT_TAG,
    ),
    update=extend_schema(
        summary="Reemplazar producto",
        request=ProductWriteSerializer,
        responses={200: ProductReadSerializer},
        tags=_PRODUCT_TAG,
    ),
    partial_update=extend_schema(
        summary="Actualizar producto parcialmente",
        request=ProductWriteSerializer,
        responses={200: ProductReadSerializer},
        tags=_PRODUCT_TAG,
    ),
    destroy=extend_schema(
        summary="Eliminar producto",
        responses={204: OpenApiResponse(description="Eliminado correctamente")},
        tags=_PRODUCT_TAG,
    ),
)
class ProductViewSet(viewsets.ModelViewSet):
    """CRUD completo del catálogo. Fuente de verdad de stock."""

    queryset = Product.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "description"]
    ordering_fields = ["price", "stock", "created_at", "name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductReadSerializer

    # --- Read caching (Redis): list/detail served from cache on hit ---------- #

    def list(self, request, *args, **kwargs):
        key = list_cache_key(request)
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(key, response.data, CACHE_TTL)
        return response

    def retrieve(self, request, *args, **kwargs):
        key = detail_cache_key(kwargs[self.lookup_field])
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)
        response = super().retrieve(request, *args, **kwargs)
        cache.set(key, response.data, CACHE_TTL)
        return response

    # --- Strategic invalidation: every write bumps the catalog version ------- #

    def perform_create(self, serializer):
        serializer.save()
        invalidate_products()

    def perform_update(self, serializer):
        serializer.save()
        invalidate_products()

    def perform_destroy(self, instance):
        instance.delete()
        invalidate_products()

    @extend_schema(
        summary="Listar categorías disponibles",
        description="Retorna las categorías de productos definidas como TextChoices.",
        responses={
            200: {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"value": {"type": "string"}, "label": {"type": "string"}},
                },
            }
        },
        tags=_PRODUCT_TAG,
    )
    @action(detail=False, methods=["get"])
    def categories(self, request):
        """Retorna los pares value/label de Product.Category."""
        return Response(
            [{"value": value, "label": label} for value, label in Product.Category.choices]
        )
