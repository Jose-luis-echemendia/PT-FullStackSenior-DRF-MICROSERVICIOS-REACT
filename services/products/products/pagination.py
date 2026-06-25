"""Paginación del catálogo.

La ``PageNumberPagination`` por defecto de DRF ignora ``page_size`` enviado por
el cliente (``page_size_query_param = None``). El frontend permite elegir cuántos
productos ver por página, así que exponemos ese parámetro con un tope máximo.
"""

from rest_framework.pagination import PageNumberPagination


class ProductPagination(PageNumberPagination):
    """Paginación que respeta ``?page_size=`` del cliente, hasta ``max_page_size``."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
