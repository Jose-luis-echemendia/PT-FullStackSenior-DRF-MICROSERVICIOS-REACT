from django.db import models


class ProcessedEvent(models.Model):
    """Idempotency guard: records events already consumed so re-deliveries are no-ops."""

    event_id = models.CharField(max_length=128, unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.event_id
