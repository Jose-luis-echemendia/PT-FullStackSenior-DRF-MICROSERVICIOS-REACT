from django.db import models

from .base import BaseModel


class OutboxEvent(BaseModel):
    """Transactional outbox row.

    Domain events are written here in the *same* DB transaction as the aggregate
    that produced them, then relayed to RabbitMQ by the ``publish_outbox`` worker.
    This guarantees at-least-once delivery even if the broker is down at commit
    time; consumers stay idempotent (see ``ProcessedEvent`` in Products).
    """

    routing_key = models.CharField(max_length=128)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    attempts = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        state = "sent" if self.published_at else "pending"
        return f"{self.routing_key} ({state})"
