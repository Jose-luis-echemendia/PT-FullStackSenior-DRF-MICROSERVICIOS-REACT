from rest_framework.exceptions import NotAuthenticated


class UserIdMixin:
    """Provide get_user_id() for views that identify users via X-User-Id."""

    def get_user_id(self) -> str:
        user_id = self.request.headers.get("X-User-Id")
        if not user_id:
            raise NotAuthenticated("Falta el encabezado X-User-Id.")
        return user_id
