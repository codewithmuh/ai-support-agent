from rest_framework import serializers

from .models import Conversation, KnowledgeBase, Message


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


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

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
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(source="messages.count", read_only=True)

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
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProcessMessageSerializer(serializers.Serializer):
    message = serializers.CharField()
    sender_id = serializers.CharField()
    channel = serializers.ChoiceField(choices=["whatsapp", "email", "webchat"])
    sender_name = serializers.CharField(required=False, default="")
