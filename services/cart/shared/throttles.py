from rest_framework.throttling import SimpleRateThrottle


class XUserIdThrottle(SimpleRateThrottle):
    """Rate-limit keyed on X-User-Id header instead of Django auth."""

    def get_cache_key(self, request, view):
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            return None  # NotAuthenticated handles the missing header case
        return self.cache_format % {"scope": self.scope, "ident": user_id}


class CartThrottle(XUserIdThrottle):
    """60 peticiones/minuto por usuario para endpoints del carrito."""

    scope = "cart"
