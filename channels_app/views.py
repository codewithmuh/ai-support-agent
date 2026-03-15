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
        """Handle WhatsApp webhook verification."""
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        verify_token = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "")

        if mode == "subscribe" and token == verify_token:
            logger.info("WhatsApp webhook verified successfully.")
            return Response(int(challenge), status=status.HTTP_200_OK)

        logger.warning(
            "WhatsApp webhook verification failed. mode=%s, token=%s",
            mode,
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

            # Send AI response back to the user
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
