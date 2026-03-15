from rest_framework import serializers

from core.serializers import ConversationSerializer

from .models import Escalation


class EscalationSerializer(serializers.ModelSerializer):
    conversation_data = ConversationSerializer(source="conversation", read_only=True)

    class Meta:
        model = Escalation
        fields = [
            "id",
            "conversation",
            "conversation_data",
            "reason",
            "details",
            "ai_summary",
            "suggested_response",
            "resolved",
            "resolved_by",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "conversation_data",
            "ai_summary",
            "suggested_response",
            "created_at",
        ]


class EscalationListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views — omits full conversation messages."""

    channel = serializers.CharField(source="conversation.channel", read_only=True)
    sender_name = serializers.CharField(
        source="conversation.sender_name", read_only=True
    )
    sender_id = serializers.CharField(source="conversation.sender_id", read_only=True)

    class Meta:
        model = Escalation
        fields = [
            "id",
            "conversation",
            "channel",
            "sender_name",
            "sender_id",
            "reason",
            "details",
            "resolved",
            "resolved_by",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields


class EscalationResolveSerializer(serializers.Serializer):
    agent_name = serializers.CharField(max_length=100)
    response = serializers.CharField()
