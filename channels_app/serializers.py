from rest_framework import serializers


class WhatsAppWebhookVerifySerializer(serializers.Serializer):
    """Serializer for WhatsApp webhook verification GET request query params."""

    hub_mode = serializers.CharField(
        source="hub.mode",
        required=True,
        help_text="Should be 'subscribe' for webhook verification.",
    )
    hub_verify_token = serializers.CharField(
        source="hub.verify_token",
        required=True,
        help_text="Verification token that must match the configured value.",
    )
    hub_challenge = serializers.CharField(
        source="hub.challenge",
        required=True,
        help_text="Challenge string to echo back for verification.",
    )

    def validate_hub_mode(self, value):
        if value != "subscribe":
            raise serializers.ValidationError(
                f"Expected hub.mode='subscribe', got '{value}'."
            )
        return value


class WhatsAppWebhookPayloadSerializer(serializers.Serializer):
    """Serializer for incoming WhatsApp webhook POST payload."""

    object = serializers.CharField(required=True)
    entry = serializers.ListField(required=True)

    def validate_object(self, value):
        if value != "whatsapp_business_account":
            raise serializers.ValidationError(
                f"Unexpected object type: '{value}'."
            )
        return value


class EmailWebhookSerializer(serializers.Serializer):
    """Serializer for incoming email webhook notification payload."""

    message_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Gmail message ID to process.",
    )
    history_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Gmail history ID from push notification.",
    )
    email_address = serializers.EmailField(
        required=False,
        help_text="Email address that received the message.",
    )

    def validate(self, attrs):
        if not attrs.get("message_id") and not attrs.get("history_id"):
            raise serializers.ValidationError(
                "Either 'message_id' or 'history_id' must be provided."
            )
        return attrs
