from rest_framework.throttling import SimpleRateThrottle


class XUserIdThrottle(SimpleRateThrottle):
    """Rate-limit keyed on X-User-Id header instead of Django auth."""

    def get_cache_key(self, request, view):
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            return None  # NotAuthenticated handles the missing header case
        return self.cache_format % {"scope": self.scope, "ident": user_id}


class OrderThrottle(XUserIdThrottle):
    """60 peticiones/minuto por usuario para listado/detalle de órdenes."""

    scope = "order"


class CheckoutThrottle(XUserIdThrottle):
    """10 peticiones/minuto por usuario para creación de órdenes (checkout)."""

    scope = "checkout"
