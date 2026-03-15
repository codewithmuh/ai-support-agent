import uuid

from django.db import models


class Escalation(models.Model):
    REASON_CHOICES = [
        ("low_confidence", "Low AI Confidence"),
        ("negative_sentiment", "Negative Sentiment"),
        ("customer_request", "Customer Requested Human"),
        ("guardrail_flag", "Guardrail Flagged"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        "core.Conversation",
        on_delete=models.CASCADE,
        related_name="escalations",
    )
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    details = models.TextField(blank=True)
    ai_summary = models.TextField(
        blank=True,
        help_text="AI-generated summary of the conversation so far",
    )
    suggested_response = models.TextField(
        blank=True,
        help_text="AI-suggested response for the human agent",
    )
    resolved = models.BooleanField(default=False)
    resolved_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Escalation {self.id} - {self.reason}"
