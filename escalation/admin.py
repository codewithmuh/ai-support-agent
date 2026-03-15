from django.contrib import admin

from .models import Escalation


@admin.register(Escalation)
class EscalationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "reason",
        "resolved",
        "resolved_by",
        "created_at",
        "resolved_at",
    ]
    list_filter = ["reason", "resolved", "created_at"]
    search_fields = ["details", "ai_summary", "resolved_by"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["conversation"]
    ordering = ["-created_at"]
