import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time web chat.

    Accepts connections at:
      ws/chat/<conversation_id>/   — resume existing conversation
      ws/chat/                     — start a new conversation

    Incoming message format:
    {
        "message": "Hello",
        "sender_name": "John",
        "sender_id": "user_123"
    }

    Outgoing message formats:
    AI response:
    {
        "type": "ai_response",
        "message": "...",
        "classification": "...",
        "conversation_id": "..."
    }

    Human agent response:
    {
        "type": "agent_response",
        "message": "...",
        "agent_name": "..."
    }
    """

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"].get(
            "conversation_id", ""
        )
        self.room_group_name = (
            f"chat_{self.conversation_id}"
            if self.conversation_id
            else f"chat_{id(self)}"
        )

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        logger.info(
            "WebSocket connected: group=%s, channel=%s",
            self.room_group_name,
            self.channel_name,
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(
            "WebSocket disconnected: group=%s, code=%s",
            self.room_group_name,
            close_code,
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON payload."}
                )
            )
            return

        message = data.get("message", "")
        sender_name = data.get("sender_name", "Anonymous")
        sender_id = data.get("sender_id", str(id(self)))

        if not message.strip():
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Empty message received."}
                )
            )
            return

        try:
            # Process through AI brain
            from core.views import process_message_internal

            result = await sync_to_async(process_message_internal)(
                message=message,
                sender_id=sender_id,
                sender_name=sender_name,
                channel="webchat",
            )

            # Update conversation_id if this was a new conversation
            if not self.conversation_id and result.get("conversation_id"):
                self.conversation_id = result["conversation_id"]
                new_group = f"chat_{self.conversation_id}"
                await self.channel_layer.group_add(new_group, self.channel_name)
                await self.channel_layer.group_discard(
                    self.room_group_name, self.channel_name
                )
                self.room_group_name = new_group

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "ai_response",
                        "message": result["response"],
                        "classification": result["classification"],
                        "conversation_id": result["conversation_id"],
                    }
                )
            )

        except Exception as exc:
            logger.exception("Error processing WebSocket message: %s", exc)
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "An error occurred while processing your message.",
                    }
                )
            )

    async def agent_message(self, event):
        """Handle messages from human agents via channel layer."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "agent_response",
                    "message": event["message"],
                    "agent_name": event["agent_name"],
                }
            )
        )
