import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .email_handler import (
    fetch_unread_emails,
    mark_as_read,
    parse_email,
    send_email_reply,
)
from .serializers import (
    EmailWebhookSerializer,
    WhatsAppWebhookPayloadSerializer,
)
from .messenger import parse_messenger_webhook, send_messenger_message
from .telegram import parse_telegram_update, send_telegram_message
from .whatsapp import parse_whatsapp_webhook, send_whatsapp_message

logger = logging.getLogger(__name__)


class WhatsAppWebhookView(APIView):
    """
    WhatsApp Cloud API webhook endpoint.

    GET  — Webhook verification (echoes hub.challenge when token matches).
    POST — Receives incoming messages, processes them through the AI brain,
           and sends responses back via the WhatsApp Cloud API.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """Handle WhatsApp webhook verification.

        Checks the verify token against team configs stored in the database.
        Teams configure their verify token via the dashboard Settings > WhatsApp.
        """
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        if mode != "subscribe" or not token or not challenge:
            return Response(
                {"error": "Missing verification parameters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check team configs in database
        token_matches = False
        try:
            from teams.models import TeamWhatsAppConfig

            token_matches = TeamWhatsAppConfig.objects.filter(
                verify_token=token, is_active=True
            ).exists()
        except Exception:
            pass

        if token_matches:
            logger.info("WhatsApp webhook verified successfully.")
            return Response(int(challenge), status=status.HTTP_200_OK)

        logger.warning(
            "WhatsApp webhook verification failed. token=%s",
            token,
        )
        return Response(
            {"error": "Verification failed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    def post(self, request):
        """Handle incoming WhatsApp messages."""
        serializer = WhatsAppWebhookPayloadSerializer(data=request.data)
        if not serializer.is_valid():
            # WhatsApp expects 200 even for payloads we don't process
            return Response(status=status.HTTP_200_OK)

        unified_msg = parse_whatsapp_webhook(request.data)
        if unified_msg is None:
            # Not a user message (e.g., status update) — acknowledge silently
            return Response(status=status.HTTP_200_OK)

        try:
            from core.views import process_message_internal

            result = process_message_internal(
                message=unified_msg.message,
                sender_id=unified_msg.sender_id,
                sender_name=unified_msg.sender_name,
                channel="whatsapp",
            )

            # Send AI response back — unless human_only mode (no response)
            if result.get("response"):
                send_whatsapp_message(
                    phone_number=unified_msg.sender_id,
                    message=result["response"],
                )

        except Exception as exc:
            logger.exception("Error processing WhatsApp message: %s", exc)
            # Still return 200 to prevent WhatsApp from retrying
            send_whatsapp_message(
                phone_number=unified_msg.sender_id,
                message="Sorry, something went wrong. Please try again later.",
            )

        return Response(status=status.HTTP_200_OK)


class EmailWebhookView(APIView):
    """
    Gmail push notification webhook endpoint.

    POST — Receives a notification that a new email has arrived,
           fetches it via Gmail API, processes it through the AI brain,
           and sends a reply.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        """Handle incoming email webhook notification."""
        serializer = EmailWebhookSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        message_id = serializer.validated_data.get("message_id", "")
        history_id = serializer.validated_data.get("history_id", "")

        try:
            from .email_handler import get_gmail_service

            service = get_gmail_service()

            if message_id:
                # Fetch the specific message
                msg = (
                    service.users()
                    .messages()
                    .get(userId="me", id=message_id, format="full")
                    .execute()
                )
                self._process_email(msg)

            elif history_id:
                # Fetch messages since the history ID
                results = (
                    service.users()
                    .history()
                    .list(userId="me", startHistoryId=history_id)
                    .execute()
                )
                for record in results.get("history", []):
                    for msg_added in record.get("messagesAdded", []):
                        msg_id = msg_added["message"]["id"]
                        msg = (
                            service.users()
                            .messages()
                            .get(userId="me", id=msg_id, format="full")
                            .execute()
                        )
                        self._process_email(msg)

        except Exception as exc:
            logger.exception("Error processing email webhook: %s", exc)
            return Response(
                {"error": "Internal processing error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"status": "processed"}, status=status.HTTP_200_OK)

    def _process_email(self, gmail_message: dict):
        """Parse, process through AI brain, and reply to a single email."""
        unified_msg = parse_email(gmail_message)

        # Skip emails from ourselves to avoid loops
        our_email = getattr(settings, "SUPPORT_EMAIL_ADDRESS", "")
        if our_email and unified_msg.sender_id.lower() == our_email.lower():
            logger.info("Skipping email from ourselves: %s", unified_msg.sender_id)
            return

        try:
            from core.views import process_message_internal

            result = process_message_internal(
                message=unified_msg.message,
                sender_id=unified_msg.sender_id,
                sender_name=unified_msg.sender_name,
                channel="email",
            )

            # Send reply
            subject = unified_msg.metadata.get("subject", "Support Response")
            thread_id = unified_msg.metadata.get("thread_id", "")

            send_email_reply(
                to=unified_msg.sender_id,
                subject=subject,
                body=result["response"],
                thread_id=thread_id,
            )

            # Mark the original as read
            msg_id = unified_msg.metadata.get("message_id", "")
            if msg_id:
                mark_as_read(msg_id)

        except Exception as exc:
            logger.exception(
                "Error processing email from %s: %s",
                unified_msg.sender_id,
                exc,
            )


class GmailPollView(APIView):
    """
    Manually trigger email polling.

    POST — Fetches unread emails from Gmail, processes each through
           the AI brain, and sends replies. Intended for cron jobs
           or manual triggering when push notifications are not available.
    """

    def post(self, request):
        """Poll Gmail for unread emails and process them."""
        max_results = request.data.get("max_results", 10)

        try:
            max_results = int(max_results)
        except (ValueError, TypeError):
            max_results = 10

        try:
            emails = fetch_unread_emails(max_results=max_results)
            processed = 0
            errors = 0

            for gmail_message in emails:
                try:
                    unified_msg = parse_email(gmail_message)

                    # Skip our own emails
                    our_email = getattr(settings, "SUPPORT_EMAIL_ADDRESS", "")
                    if (
                        our_email
                        and unified_msg.sender_id.lower() == our_email.lower()
                    ):
                        continue

                    from core.views import process_message_internal

                    result = process_message_internal(
                        message=unified_msg.message,
                        sender_id=unified_msg.sender_id,
                        sender_name=unified_msg.sender_name,
                        channel="email",
                    )

                    subject = unified_msg.metadata.get(
                        "subject", "Support Response"
                    )
                    thread_id = unified_msg.metadata.get("thread_id", "")

                    if result.get("response"):
                        send_email_reply(
                            to=unified_msg.sender_id,
                            subject=subject,
                            body=result["response"],
                            thread_id=thread_id,
                        )

                    msg_id = unified_msg.metadata.get("message_id", "")
                    if msg_id:
                        mark_as_read(msg_id)

                    processed += 1

                except Exception as exc:
                    logger.exception("Error processing polled email: %s", exc)
                    errors += 1

            return Response(
                {
                    "status": "completed",
                    "total_fetched": len(emails),
                    "processed": processed,
                    "errors": errors,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as exc:
            logger.exception("Error polling Gmail: %s", exc)
            return Response(
                {"error": "Failed to poll emails"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TelegramWebhookView(APIView):
    """Telegram Bot API webhook endpoint.

    POST — Receives incoming messages from Telegram, processes them
           through the AI brain, and sends responses back.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        """Handle incoming Telegram update."""
        unified_msg = parse_telegram_update(request.data)

        if unified_msg is None:
            # Not a text message (could be edit, reaction, etc.) — acknowledge
            return Response({"status": "ok"}, status=status.HTTP_200_OK)

        logger.info(
            "Telegram message from %s (%s): %s",
            unified_msg.sender_name,
            unified_msg.sender_id,
            unified_msg.content[:50],
        )

        try:
            from core.views import process_message_internal

            result = process_message_internal(
                message=unified_msg.content,
                sender_id=unified_msg.sender_id,
                sender_name=unified_msg.sender_name,
                channel="telegram",
            )

            if result.get("response"):
                send_telegram_message(
                    chat_id=unified_msg.sender_id,
                    message=result["response"],
                )

        except Exception as exc:
            logger.exception("Error processing Telegram message: %s", exc)
            send_telegram_message(
                chat_id=unified_msg.sender_id,
                message="Sorry, I'm having trouble processing your request. Please try again.",
            )

        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class MessengerWebhookView(APIView):
    """
    Facebook Messenger & Instagram DM webhook endpoint.

    Both Messenger and Instagram DMs use the same Meta Graph API webhook.
    When an Instagram account is linked to a Facebook Page, Instagram DMs
    arrive through the same webhook with an Instagram-scoped sender ID.

    GET  — Webhook verification (echoes hub.challenge when token matches).
    POST — Receives incoming messages, processes them through the AI brain,
           and sends responses back via the Graph API Send API.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """Handle Messenger/Instagram webhook verification.

        Checks the verify token against team configs stored in the database.
        Teams configure their verify token via the dashboard Settings > Messenger.
        """
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        if mode != "subscribe" or not token or not challenge:
            return Response(
                {"error": "Missing verification parameters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check team configs in database
        token_matches = False
        try:
            from teams.models import TeamMessengerConfig

            token_matches = TeamMessengerConfig.objects.filter(
                verify_token=token, is_active=True
            ).exists()
        except Exception:
            pass

        if token_matches:
            logger.info("Messenger webhook verified successfully.")
            return Response(int(challenge), status=status.HTTP_200_OK)

        logger.warning(
            "Messenger webhook verification failed. token=%s",
            token,
        )
        return Response(
            {"error": "Verification failed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    def post(self, request):
        """Handle incoming Messenger/Instagram messages."""
        # Messenger webhooks have object="page"
        if request.data.get("object") != "page":
            return Response(status=status.HTTP_200_OK)

        unified_msg = parse_messenger_webhook(request.data)
        if unified_msg is None:
            # Not a user message (e.g., delivery receipt) — acknowledge silently
            return Response(status=status.HTTP_200_OK)

        logger.info(
            "Messenger/%s message from %s: %s",
            unified_msg.channel,
            unified_msg.sender_id,
            unified_msg.message[:50],
        )

        try:
            from core.views import process_message_internal

            result = process_message_internal(
                message=unified_msg.message,
                sender_id=unified_msg.sender_id,
                sender_name=unified_msg.sender_name,
                channel=unified_msg.channel,
            )

            # Send AI response back — unless human_only mode (no response)
            if result.get("response"):
                send_messenger_message(
                    recipient_id=unified_msg.sender_id,
                    message=result["response"],
                )

        except Exception as exc:
            logger.exception("Error processing Messenger message: %s", exc)
            # Still return 200 to prevent Meta from retrying
            send_messenger_message(
                recipient_id=unified_msg.sender_id,
                message="Sorry, something went wrong. Please try again later.",
            )

        return Response(status=status.HTTP_200_OK)
