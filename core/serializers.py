from rest_framework import serializers

from .models import (
    CannedResponse,
    Conversation,
    InternalNote,
    KnowledgeBase,
    Message,
    Tag,
)


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = [
            "id",
            "content",
            "category",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "conversation", "role", "content", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color", "created_at"]
        read_only_fields = ["id", "created_at"]


class InternalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalNote
        fields = ["id", "conversation", "author_name", "content", "created_at"]
        read_only_fields = ["id", "conversation", "created_at"]


class CannedResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CannedResponse
        fields = [
            "id",
            "title",
            "content",
            "category",
            "shortcut",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    internal_notes = InternalNoteSerializer(many=True, read_only=True)
    escalation_id = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "channel",
            "sender_id",
            "sender_name",
            "status",
            "assigned_agent",
            "created_at",
            "updated_at",
            "messages",
            "tags",
            "internal_notes",
            "escalation_id",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_escalation_id(self, obj) -> str | None:
        escalation = obj.escalations.filter(resolved=False).first()
        return str(escalation.id) if escalation else None


class ConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(source="messages.count", read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "channel",
            "sender_id",
            "sender_name",
            "status",
            "assigned_agent",
            "created_at",
            "updated_at",
            "message_count",
            "tags",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ConversationSearchSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(source="messages.count", read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "channel",
            "sender_id",
            "sender_name",
            "status",
            "assigned_agent",
            "created_at",
            "updated_at",
            "message_count",
            "tags",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProcessMessageSerializer(serializers.Serializer):
    message = serializers.CharField()
    sender_id = serializers.CharField()
    channel = serializers.ChoiceField(choices=["whatsapp", "email", "webchat"])
    sender_name = serializers.CharField(required=False, default="")
