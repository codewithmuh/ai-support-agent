import logging
from typing import Optional

import requests
from django.conf import settings

from .unified import UnifiedMessage

logger = logging.getLogger(__name__)

GRAPH_API_URL = "https://graph.facebook.com/v22.0"


def parse_messenger_webhook(payload: dict) -> Optional[UnifiedMessage]:
    """
    Parse an incoming Messenger/Instagram webhook payload and return
    a UnifiedMessage, or None if the payload does not contain a user message.

    Expected payload structure (simplified):
    {
      "object": "page",
      "entry": [{
        "id": "<PAGE_ID>",
        "time": 1234567890,
        "messaging": [{
          "sender": {"id": "..."},
          "recipient": {"id": "..."},
          "timestamp": 1234567890,
          "message": {
            "mid": "...",
            "text": "Hello"
          }
        }]
      }]
    }

    Instagram DMs use the same webhook structure when the Instagram account
    is connected to a Facebook Page. The sender.id is an Instagram-scoped ID.
    """
    try:
        entry = payload.get("entry", [])
        if not entry:
            return None

        messaging = entry[0].get("messaging", [])
        if not messaging:
            return None

        event = messaging[0]

        # Only process actual messages (skip deliveries, reads, postbacks, etc.)
        message_obj = event.get("message")
        if not message_obj:
            return None

        text = message_obj.get("text", "")
        if not text:
            # Attachments (images, stickers, etc.) — skip for now
            logger.info("Messenger webhook received non-text message, skipping.")
            return None

        sender_id = event.get("sender", {}).get("id", "")
        if not sender_id:
            return None

        page_id = entry[0].get("id", "")
        message_id = message_obj.get("mid", "")

        # Determine channel: check if this page_id is configured as Instagram
        channel = _detect_channel(page_id)

        return UnifiedMessage(
            channel=channel,
            sender_id=sender_id,
            sender_name=f"User {sender_id}",  # Messenger doesn't include name in webhook
            message=text,
            conversation_id=sender_id,
            metadata={
                "message_id": message_id,
                "page_id": page_id,
            },
        )

    except (KeyError, IndexError, TypeError) as exc:
        logger.exception("Failed to parse Messenger webhook payload: %s", exc)
        return None


def _detect_channel(page_id: str) -> str:
    """Detect whether a webhook came from Messenger or Instagram.

    Checks if the page_id belongs to a TeamMessengerConfig with
    instagram_enabled=True. Falls back to 'messenger'.
    """
    try:
        from teams.models import TeamMessengerConfig

        config = TeamMessengerConfig.objects.filter(
            page_id=page_id, instagram_enabled=True, is_active=True
        ).first()
        if config:
            return "instagram"
    except Exception:
        pass

    return "messenger"


def _get_messenger_credentials() -> str:
    """Get Messenger page access token from database first, then fall back to .env."""
    try:
        from teams.models import TeamMessengerConfig

        config = TeamMessengerConfig.objects.filter(is_active=True).first()
        if config and config.page_access_token:
            return config.page_access_token
    except Exception:
        pass

    return getattr(settings, "MESSENGER_PAGE_ACCESS_TOKEN", "")


def send_messenger_message(
    recipient_id: str,
    message: str,
    page_access_token: str | None = None,
) -> bool:
    """
    Send a text message to a Messenger/Instagram user via the Graph API.

    This works for both Messenger and Instagram DMs — they use the same
    Send API endpoint.

    Args:
        recipient_id: The PSID (Page-Scoped ID) or Instagram-scoped ID.
        message: Message text to send.
        page_access_token: Page access token. Falls back to DB config, then .env.

    Returns:
        True if the message was sent successfully.
    """
    token = page_access_token or _get_messenger_credentials()

    if not token:
        logger.error(
            "Messenger page access token not configured. "
            "Configure via Settings > Messenger in the dashboard."
        )
        return False

    url = f"{GRAPH_API_URL}/me/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message},
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        logger.info("Messenger message sent to %s", recipient_id)
        return True
    except requests.RequestException as exc:
        logger.exception(
            "Failed to send Messenger message to %s: %s", recipient_id, exc
        )
        return False
