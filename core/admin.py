from django.contrib import admin
from .models import KnowledgeBase, Conversation, Message


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ("id", "category", "content_preview", "created_at")
    list_filter = ("category",)
    search_fields = ("content",)

    def content_preview(self, obj):
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content

    content_preview.short_description = "Content"


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "channel", "sender_name", "status", "assigned_agent", "created_at")
    list_filter = ("channel", "status")
    search_fields = ("sender_name", "sender_id")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "content_preview", "created_at")
    list_filter = ("role",)

    def content_preview(self, obj):
        return obj.content[:100] + "..." if len(obj.content) > 100 else obj.content

    content_preview.short_description = "Content"
