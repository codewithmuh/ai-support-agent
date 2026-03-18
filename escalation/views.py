import logging

from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Conversation, Message

from .models import Escalation
from .serializers import (
    EscalationListSerializer,
    EscalationResolveSerializer,
    EscalationSerializer,
)

logger = logging.getLogger(__name__)


class EscalationListView(generics.ListAPIView):
    """List all escalations with optional filtering by resolved status.

    Query parameters:
        resolved (bool): Filter by resolved status. Omit to return all.
    """

    serializer_class = EscalationListSerializer

    def get_queryset(self):
        queryset = Escalation.objects.select_related("conversation").all()

        resolved_param = self.request.query_params.get("resolved")
        if resolved_param is not None:
            resolved = resolved_param.lower() in ("true", "1", "yes")
            queryset = queryset.filter(resolved=resolved)

        return queryset


class EscalationDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a single escalation.

    Includes full conversation data with messages for the detail view.
    """

    queryset = Escalation.objects.select_related("conversation").all()
    serializer_class = EscalationSerializer


class EscalationResolveView(APIView):
    """Mark an escalation as resolved and record the agent's response.

    POST body:
        agent_name (str): Name of the human agent resolving the ticket.
        response (str): The response message to send to the customer.
    """

    def post(self, request, pk):
        serializer = EscalationResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            escalation = Escalation.objects.select_related("conversation").get(pk=pk)
        except Escalation.DoesNotExist:
            return Response(
                {"error": "Escalation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if escalation.resolved:
            return Response(
                {"error": "This escalation has already been resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        agent_name = serializer.validated_data["agent_name"]
        response_text = serializer.validated_data["response"]
        now = timezone.now()

        # Mark escalation as resolved
        escalation.resolved = True
        escalation.resolved_by = agent_name
        escalation.resolved_at = now
        escalation.save(update_fields=["resolved", "resolved_by", "resolved_at"])

        # Create the agent's response as a message in the conversation
        Message.objects.create(
            conversation=escalation.conversation,
            role="agent",
            content=response_text,
            metadata={"agent_name": agent_name, "escalation_id": str(escalation.id)},
        )

        # Update conversation status back to resolved
        conversation = escalation.conversation
        conversation.status = "resolved"
        conversation.assigned_agent = agent_name
        conversation.save(update_fields=["status", "assigned_agent", "updated_at"])

        # Send the response back to the customer via their original channel
        self._send_to_customer(conversation, response_text)

        logger.info(
            "Escalation %s resolved by %s for conversation %s",
            escalation.id,
            agent_name,
            conversation.id,
        )

        return Response(
            {
                "message": "Escalation resolved successfully.",
                "escalation_id": str(escalation.id),
                "resolved_by": agent_name,
                "resolved_at": now.isoformat(),
            },
            status=status.HTTP_200_OK,
        )

    def _send_to_customer(self, conversation, message: str):
        """Send a message back to the customer via their original channel."""
        try:
            if conversation.channel == "whatsapp":
                from channels_app.whatsapp import send_whatsapp_message

                send_whatsapp_message(conversation.sender_id, message)
            elif conversation.channel == "email":
                from channels_app.email_handler import send_email_reply

                send_email_reply(
                    to=conversation.sender_id,
                    subject="Re: Support Request",
                    body=message,
                )
            elif conversation.channel == "telegram":
                from channels_app.telegram import send_telegram_message

                send_telegram_message(conversation.sender_id, message)
        except Exception as exc:
            logger.exception(
                "Failed to send resolve message to customer %s: %s",
                conversation.sender_id,
                exc,
            )


class ConversationReplyView(APIView):
    """Send a manual reply to a customer without resolving the ticket.

    POST body:
        message (str): The message to send to the customer.
        agent_name (str, optional): Name of the agent. Defaults to 'Dashboard Agent'.
    """

    def post(self, request, pk):
        message_text = request.data.get("message", "").strip()
        agent_name = request.data.get("agent_name", "Dashboard Agent")

        if not message_text:
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Save the agent message
        msg = Message.objects.create(
            conversation=conversation,
            role="agent",
            content=message_text,
            metadata={"agent_name": agent_name},
        )

        # Send to customer via their channel
        try:
            if conversation.channel == "whatsapp":
                from channels_app.whatsapp import send_whatsapp_message

                send_whatsapp_message(conversation.sender_id, message_text)
            elif conversation.channel == "email":
                from channels_app.email_handler import send_email_reply

                send_email_reply(
                    to=conversation.sender_id,
                    subject="Re: Support Request",
                    body=message_text,
                )
            elif conversation.channel == "telegram":
                from channels_app.telegram import send_telegram_message

                send_telegram_message(conversation.sender_id, message_text)
            sent = True
        except Exception as exc:
            logger.exception("Failed to send reply: %s", exc)
            sent = False

        return Response(
            {
                "message_id": str(msg.id),
                "sent": sent,
                "content": message_text,
                "created_at": msg.created_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class DashboardStatsView(APIView):
    """Return dashboard statistics for the current day.

    GET response:
        total_tickets_today: Total conversations created today.
        ai_resolved: Conversations resolved without escalation.
        escalated: Conversations that were escalated to humans.
        avg_response_time: Average time (in seconds) between a customer
            message and the next AI/agent response, for today's conversations.
        channel_breakdown: Dict with counts per channel.
    """

    def get(self, request):
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Total conversations created today
        today_conversations = Conversation.objects.filter(
            created_at__gte=today_start
        )
        total_tickets_today = today_conversations.count()

        # Escalated conversations today
        escalated_today = today_conversations.filter(status="escalated").count()

        # Resolved conversations today (includes both AI-resolved and agent-resolved)
        resolved_today = today_conversations.filter(status="resolved").count()

        # AI-resolved = resolved today that have NO escalation records
        ai_resolved = (
            today_conversations.filter(status="resolved")
            .exclude(escalations__isnull=False)
            .count()
        )

        # Channel breakdown
        channel_breakdown = dict(
            today_conversations.values_list("channel")
            .annotate(count=Count("id"))
            .values_list("channel", "count")
        )

        # Average response time (seconds) — time between customer message
        # and the next AI/agent message in today's conversations
        avg_response_time = self._calculate_avg_response_time(today_start)

        # Overall stats (all-time)
        all_conversations = Conversation.objects.all()
        total_tickets = all_conversations.count()
        total_open = all_conversations.filter(status__in=["active", "escalated"]).count()
        total_escalated = all_conversations.filter(status="escalated").count()
        total_resolved = all_conversations.filter(status="resolved").count()

        # Recent escalations for dashboard list
        recent_escalations = list(
            Escalation.objects.select_related("conversation")
            .order_by("-created_at")[:10]
            .values(
                "id",
                "reason",
                "resolved",
                "created_at",
                conversation_id_val=F("conversation__id"),
                customer_name=F("conversation__sender_name"),
            )
        )
        for esc in recent_escalations:
            esc["conversation_id"] = str(esc.pop("conversation_id_val"))
            esc["status"] = "resolved" if esc.pop("resolved") else "pending"

        return Response(
            {
                "total_tickets_today": total_tickets_today,
                "total_tickets": total_tickets,
                "total_open": total_open,
                "total_escalated": total_escalated,
                "total_resolved": total_resolved,
                "ai_resolved": ai_resolved,
                "escalated": escalated_today,
                "avg_response_time": avg_response_time,
                "channel_breakdown": channel_breakdown,
                "recent_escalations": recent_escalations,
            },
            status=status.HTTP_200_OK,
        )

    def _calculate_avg_response_time(self, since: timezone.datetime) -> float | None:
        """Calculate average response time in seconds for conversations since a given time.

        Pairs each customer message with the next AI/agent message in the same
        conversation and averages the time deltas.
        """
        customer_messages = (
            Message.objects.filter(
                role="customer",
                conversation__created_at__gte=since,
            )
            .select_related("conversation")
            .order_by("conversation_id", "created_at")
        )

        total_seconds = 0.0
        count = 0

        for msg in customer_messages:
            # Find the next non-customer message in this conversation
            next_response = (
                Message.objects.filter(
                    conversation=msg.conversation,
                    created_at__gt=msg.created_at,
                    role__in=["ai", "agent"],
                )
                .order_by("created_at")
                .first()
            )

            if next_response:
                delta = (next_response.created_at - msg.created_at).total_seconds()
                total_seconds += delta
                count += 1

        if count == 0:
            return None

        return round(total_seconds / count, 2)
