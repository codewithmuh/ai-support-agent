import logging

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .classifier import classify_ticket
from .embeddings import generate_embedding
from .guardrails import check_response
from .knowledge_base import search_knowledge_base
from .models import Conversation, KnowledgeBase, Message
from .responder import generate_response
from .serializers import (
    ConversationListSerializer,
    ConversationSerializer,
    KnowledgeBaseSerializer,
    ProcessMessageSerializer,
)

logger = logging.getLogger(__name__)


def process_message_internal(
    message: str,
    sender_id: str,
    sender_name: str = "",
    channel: str = "webchat",
) -> dict:
    """Core message processing pipeline. Used by all channels (WhatsApp, Email, WebChat).

    Returns dict with: response, classification, conversation_id, escalated
    """
    # Find existing open conversation or create a new one
    conversation = (
        Conversation.objects.filter(
            sender_id=sender_id,
            channel=channel,
        )
        .exclude(status="resolved")
        .order_by("-created_at")
        .first()
    )
    if conversation is None:
        conversation = Conversation.objects.create(
            sender_id=sender_id,
            channel=channel,
            sender_name=sender_name or sender_id,
        )

    # Save customer message
    Message.objects.create(
        conversation=conversation,
        role="customer",
        content=message,
    )

    # Classify with Haiku
    classification = classify_ticket(message)

    # Check for escalation
    try:
        from escalation.detector import should_escalate
        from escalation.handoff import create_handoff_package

        escalation_result = should_escalate(message, classification)
    except Exception as e:
        logger.error("Escalation check failed: %s", str(e))
        escalation_result = {"should_escalate": False}

    if escalation_result.get("should_escalate"):
        conversation.status = "escalated"
        conversation.save(update_fields=["status", "updated_at"])

        try:
            create_handoff_package(
                conversation_id=str(conversation.id),
                reason=escalation_result.get("reason", "customer_request"),
                details=escalation_result.get("details", ""),
            )
        except Exception as e:
            logger.error("Failed to create handoff package: %s", str(e))

        ai_response = (
            "I understand your concern, and I want to make sure you get the best help possible. "
            "Let me connect you with a team member right away. They'll have the full context "
            "of our conversation and will be with you shortly."
        )
        Message.objects.create(
            conversation=conversation,
            role="ai",
            content=ai_response,
            metadata={"escalated": True, "reason": escalation_result.get("reason", "")},
        )

        return {
            "response": ai_response,
            "classification": classification,
            "conversation_id": str(conversation.id),
            "escalated": True,
            "escalation_reason": escalation_result.get("reason", ""),
        }

    # Retrieve knowledge base context
    query_embedding = generate_embedding(message)
    knowledge_chunks = search_knowledge_base(
        query_embedding=query_embedding,
        category=classification.get("category"),
        limit=3,
    )

    # Build conversation history
    history = list(
        Message.objects.filter(conversation=conversation)
        .order_by("created_at")
        .values("role", "content")
    )
    history = history[:-1]  # Exclude the message we just saved

    # Generate response with Sonnet
    response_result = generate_response(
        message=message,
        conversation_history=history,
        knowledge_chunks=knowledge_chunks,
    )

    # Run guardrails
    guardrail_result = check_response(
        response=response_result["response"],
        knowledge_chunks=knowledge_chunks,
    )

    ai_response = response_result["response"]

    if not guardrail_result["is_safe"]:
        logger.warning(
            "Guardrails flagged response for conversation %s: %s",
            conversation.id,
            guardrail_result["flagged_terms"],
        )

    # Save AI response
    Message.objects.create(
        conversation=conversation,
        role="ai",
        content=ai_response,
        metadata={
            "confidence": response_result["confidence"],
            "guardrails": guardrail_result,
            "classification": classification,
        },
    )

    return {
        "response": ai_response,
        "classification": classification,
        "conversation_id": str(conversation.id),
        "escalated": False,
    }


class ProcessMessageView(APIView):
    """Main orchestrator endpoint. Takes a customer message, classifies it,
    retrieves knowledge base context, generates a response, and runs guardrails.
    """

    def post(self, request):
        serializer = ProcessMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        message = data["message"]
        sender_id = data["sender_id"]
        channel = data["channel"]
        sender_name = data.get("sender_name", "")

        # 1. Find existing open conversation or create a new one
        conversation = (
            Conversation.objects.filter(
                sender_id=sender_id,
                channel=channel,
            )
            .exclude(status="resolved")
            .order_by("-created_at")
            .first()
        )
        if conversation is None:
            conversation = Conversation.objects.create(
                sender_id=sender_id,
                channel=channel,
                sender_name=sender_name or sender_id,
            )

        # 2. Save the customer message
        Message.objects.create(
            conversation=conversation,
            role="customer",
            content=message,
        )

        # 3. Classify the ticket
        classification = classify_ticket(message)
        category = classification["category"]

        # 4. Check for escalation
        try:
            from escalation.detector import should_escalate

            escalation_result = should_escalate(message, classification)
        except ImportError:
            logger.warning("escalation.detector not available, skipping escalation check")
            escalation_result = {"should_escalate": False}
        except Exception as e:
            logger.error("Escalation check failed: %s", str(e))
            escalation_result = {"should_escalate": False}

        if escalation_result.get("should_escalate"):
            conversation.status = "escalated"
            conversation.save(update_fields=["status", "updated_at"])

            ai_response = (
                "I understand this needs special attention. "
                "I'm connecting you with a human agent who can help further. "
                "Please hold on."
            )
            Message.objects.create(
                conversation=conversation,
                role="ai",
                content=ai_response,
                metadata={"escalated": True, "reason": escalation_result.get("reason", "")},
            )

            return Response(
                {
                    "conversation_id": str(conversation.id),
                    "classification": classification,
                    "escalated": True,
                    "escalation_reason": escalation_result.get("reason", ""),
                    "response": ai_response,
                },
                status=status.HTTP_200_OK,
            )

        # 5. Generate embedding and retrieve knowledge base chunks
        query_embedding = generate_embedding(message)
        knowledge_chunks = search_knowledge_base(
            query_embedding=query_embedding,
            category=category,
            limit=3,
        )

        # 6. Build conversation history
        history = list(
            Message.objects.filter(conversation=conversation)
            .order_by("created_at")
            .values("role", "content")
        )
        # Exclude the message we just saved (it's included in the prompt directly)
        history = history[:-1]

        # 7. Generate response with Sonnet
        response_result = generate_response(
            message=message,
            conversation_history=history,
            knowledge_chunks=knowledge_chunks,
        )

        # 8. Run guardrails
        guardrail_result = check_response(
            response=response_result["response"],
            knowledge_chunks=knowledge_chunks,
        )

        ai_response = response_result["response"]

        # If guardrails flag the response, add a disclaimer
        if not guardrail_result["is_safe"]:
            logger.warning(
                "Guardrails flagged response for conversation %s: %s",
                conversation.id,
                guardrail_result["flagged_terms"],
            )

        # 9. Save the AI response
        Message.objects.create(
            conversation=conversation,
            role="ai",
            content=ai_response,
            metadata={
                "confidence": response_result["confidence"],
                "guardrails": guardrail_result,
                "classification": classification,
            },
        )

        return Response(
            {
                "conversation_id": str(conversation.id),
                "classification": classification,
                "escalated": False,
                "response": ai_response,
                "confidence": response_result["confidence"],
                "guardrails": guardrail_result,
            },
            status=status.HTTP_200_OK,
        )


class KnowledgeBaseListCreateView(generics.ListCreateAPIView):
    """List all knowledge base entries or add a new one."""

    queryset = KnowledgeBase.objects.all()
    serializer_class = KnowledgeBaseSerializer

    def perform_create(self, serializer):
        content = serializer.validated_data["content"]
        embedding = generate_embedding(content)
        serializer.save(embedding=embedding)


class ConversationListView(generics.ListAPIView):
    """List all conversations."""

    queryset = Conversation.objects.all()
    serializer_class = ConversationListSerializer


class ConversationDetailView(generics.RetrieveAPIView):
    """Get a single conversation with all its messages."""

    queryset = Conversation.objects.prefetch_related("messages").all()
    serializer_class = ConversationSerializer
