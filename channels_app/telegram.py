import logging
from typing import Optional

import requests
from django.conf import settings

from .unified import UnifiedMessage

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org"


def parse_telegram_update(payload: dict) -> Optional[UnifiedMessage]:
    """Parse an incoming Telegram Bot API update into a UnifiedMessage.

    Returns None if the update doesn't contain a text message.
    """
    try:
        message = payload.get("message")
        if not message:
            return None

        text = message.get("text", "")
        if not text:
            return None

        chat = message.get("chat", {})
        sender = message.get("from", {})

        chat_id = str(chat.get("id", ""))
        first_name = sender.get("first_name", "")
        last_name = sender.get("last_name", "")
        sender_name = f"{first_name} {last_name}".strip() or f"User {chat_id}"

        return UnifiedMessage(
            channel="telegram",
            sender_id=chat_id,
            sender_name=sender_name,
            content=text,
            raw_payload=payload,
        )

    except Exception as e:
        logger.error("Failed to parse Telegram update: %s", e)
        return None


def send_telegram_message(
    chat_id: str,
    message: str,
    bot_token: str | None = None,
) -> bool:
    """Send a text message via Telegram Bot API.

    Args:
        chat_id: Telegram chat ID to send to.
        message: Message text.
        bot_token: Bot token. Falls back to settings.TELEGRAM_BOT_TOKEN.

    Returns:
        True if the message was sent successfully.
    """
    token = bot_token or getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN not configured")
        return False

    url = f"{TELEGRAM_API_URL}/bot{token}/sendMessage"

    try:
        response = requests.post(
            url,
            json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown",
            },
            timeout=10,
        )
        response.raise_for_status()
        logger.info("Telegram message sent to %s", chat_id)
        return True
    except Exception as e:
        logger.error("Failed to send Telegram message to %s: %s", chat_id, e)
        return False
