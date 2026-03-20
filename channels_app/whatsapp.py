import logging
from typing import Optional

import requests
from django.conf import settings

from .unified import UnifiedMessage

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = "https://graph.facebook.com/v22.0"


def parse_whatsapp_webhook(payload: dict) -> Optional[UnifiedMessage]:
    """
    Parse an incoming WhatsApp Cloud API webhook payload and return
    a UnifiedMessage, or None if the payload does not contain a user message.

    Expected payload structure (simplified):
    {
      "entry": [{
        "changes": [{
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {"phone_number_id": "..."},
            "contacts": [{"profile": {"name": "..."}, "wa_id": "..."}],
            "messages": [{
              "from": "...",
              "id": "...",
              "timestamp": "...",
              "type": "text",
              "text": {"body": "Hello"}
            }]
          }
        }]
      }]
    }
    """
    try:
        entry = payload.get("entry", [])
        if not entry:
            return None

        changes = entry[0].get("changes", [])
        if not changes:
            return None

        value = changes[0].get("value", {})
        messages = value.get("messages")
        if not messages:
            # Status updates or other non-message events
            return None

        message_obj = messages[0]
        message_type = message_obj.get("type", "")

        # Extract text content based on message type
        if message_type == "text":
            text_body = message_obj.get("text", {}).get("body", "")
        elif message_type == "interactive":
            interactive = message_obj.get("interactive", {})
            interactive_type = interactive.get("type", "")
            if interactive_type == "button_reply":
                text_body = interactive.get("button_reply", {}).get("title", "")
            elif interactive_type == "list_reply":
                text_body = interactive.get("list_reply", {}).get("title", "")
            else:
                text_body = ""
        else:
            # Unsupported message types (image, audio, etc.) — log and skip
            logger.info("Unsupported WhatsApp message type: %s", message_type)
            return None

        if not text_body:
            return None

        # Extract sender information
        contacts = value.get("contacts", [])
        sender_name = "Unknown"
        if contacts:
            sender_name = contacts[0].get("profile", {}).get("name", "Unknown")

        sender_id = message_obj.get("from", "")
        message_id = message_obj.get("id", "")
        phone_number_id = value.get("metadata", {}).get("phone_number_id", "")

        return UnifiedMessage(
            channel="whatsapp",
            sender_id=sender_id,
            sender_name=sender_name,
            message=text_body,
            conversation_id=sender_id,  # Use phone number as conversation ID
            metadata={
                "message_id": message_id,
                "phone_number_id": phone_number_id,
                "message_type": message_type,
            },
        )

    except (KeyError, IndexError, TypeError) as exc:
        logger.exception("Failed to parse WhatsApp webhook payload: %s", exc)
        return None


def _get_whatsapp_credentials() -> tuple[str, str]:
    """Get WhatsApp credentials from database first, then fall back to .env."""
    try:
        from teams.models import TeamWhatsAppConfig

        config = TeamWhatsAppConfig.objects.filter(is_active=True).first()
        if config and config.access_token and config.phone_number_id:
            return config.access_token, config.phone_number_id
    except Exception:
        pass

    return (
        getattr(settings, "WHATSAPP_ACCESS_TOKEN", ""),
        getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", ""),
    )


def send_whatsapp_message(phone_number: str, message: str) -> bool:
    """
    Send a text message to a WhatsApp user via the Cloud API.

    Reads credentials from team config in database first, falls back to .env.
    """
    access_token, phone_number_id = _get_whatsapp_credentials()

    if not access_token or not phone_number_id:
        logger.error(
            "WhatsApp credentials not configured. "
            "Configure via Settings > WhatsApp in the dashboard."
        )
        return False

    url = f"{WHATSAPP_API_URL}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        logger.info("WhatsApp message sent to %s", phone_number)
        return True
    except requests.RequestException as exc:
        logger.exception("Failed to send WhatsApp message to %s: %s", phone_number, exc)
        return False
