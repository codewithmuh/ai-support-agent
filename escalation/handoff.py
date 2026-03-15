import logging

import anthropic
from django.conf import settings
from django.utils import timezone

from core.models import Conversation, Message

from .models import Escalation
from .sentiment import analyze_sentiment

logger = logging.getLogger(__name__)


def _build_conversation_history(messages: list[Message]) -> list[dict]:
    """Format message queryset into a clean conversation history list."""
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.created_at.isoformat(),
        }
        for msg in messages
    ]


def _generate_ai_summary(conversation_history: list[dict]) -> str:
    """Generate a concise conversation summary using Claude Haiku.

    Uses the fast/cheap model since this is a straightforward summarization
    task and speed matters during escalation.
    """
    formatted_messages = "\n".join(
        f"[{entry['role']}] {entry['content']}" for entry in conversation_history
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=(
                "You are a support ticket summarizer. Provide a concise summary "
                "of the following customer support conversation. Include: "
                "1) What the customer's issue is, "
                "2) What has been tried so far, "
                "3) The customer's current emotional state. "
                "Keep it under 150 words."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"<conversation>\n{formatted_messages}\n</conversation>\n\n"
                        "Summarize this conversation for a human support agent."
                    ),
                }
            ],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error("Failed to generate AI summary: %s", str(e))
        return "AI summary unavailable — please review the conversation history."


def _generate_suggested_response(
    conversation_history: list[dict],
    summary: str,
) -> str:
    """Generate a suggested response for the human agent using Claude Sonnet.

    Uses the more capable model to craft a thoughtful response suggestion
    that the human agent can edit and send.
    """
    formatted_messages = "\n".join(
        f"[{entry['role']}] {entry['content']}" for entry in conversation_history
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=(
                "You are helping a human support agent draft a response to a "
                "customer. The conversation has been escalated from an AI agent. "
                "Write a professional, empathetic response that:\n"
                "1) Acknowledges the customer's frustration if applicable\n"
                "2) Addresses their specific issue\n"
                "3) Provides clear next steps\n"
                "4) Maintains a warm, human tone\n\n"
                "The human agent will review and edit your suggestion before sending."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"<conversation>\n{formatted_messages}\n</conversation>\n\n"
                        f"<summary>{summary}</summary>\n\n"
                        "Draft a response for the human agent to send to the customer."
                    ),
                }
            ],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error("Failed to generate suggested response: %s", str(e))
        return ""


def create_handoff_package(
    conversation_id: str,
    reason: str = "customer_request",
    details: str = "",
) -> dict:
    """Create a complete escalation handoff package for a human agent.

    Fetches the conversation, generates an AI summary and suggested response,
    creates an Escalation record, and updates the conversation status.

    Args:
        conversation_id: UUID of the conversation to escalate.
        reason: Escalation reason (from Escalation.REASON_CHOICES).
        details: Additional details about the escalation trigger.

    Returns:
        A dict containing everything a human agent needs to take over:
        - conversation_history: list of message dicts
        - classification: conversation metadata
        - customer_sentiment: sentiment analysis result
        - ai_summary: AI-generated conversation summary
        - suggested_response: AI-drafted response for the agent
        - escalation_id: UUID of the created Escalation record
    """
    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        logger.error("Conversation %s not found for escalation", conversation_id)
        raise ValueError(f"Conversation {conversation_id} not found.")

    # Fetch all messages in chronological order
    messages = conversation.messages.all().order_by("created_at")
    conversation_history = _build_conversation_history(list(messages))

    # Analyze customer sentiment from all customer messages
    customer_text = " ".join(
        msg.content for msg in messages if msg.role == "customer"
    )
    customer_sentiment = analyze_sentiment(customer_text)

    # Generate AI summary (Haiku — fast)
    ai_summary = _generate_ai_summary(conversation_history)

    # Generate suggested response (Sonnet — higher quality)
    suggested_response = _generate_suggested_response(conversation_history, ai_summary)

    # Create the Escalation record
    escalation = Escalation.objects.create(
        conversation=conversation,
        reason=reason,
        details=details,
        ai_summary=ai_summary,
        suggested_response=suggested_response,
    )

    # Update conversation status to escalated
    conversation.status = "escalated"
    conversation.save(update_fields=["status", "updated_at"])

    logger.info(
        "Escalation %s created for conversation %s (reason: %s)",
        escalation.id,
        conversation_id,
        reason,
    )

    return {
        "conversation_history": conversation_history,
        "classification": {
            "channel": conversation.channel,
            "sender_id": conversation.sender_id,
            "sender_name": conversation.sender_name,
            "status": conversation.status,
        },
        "customer_sentiment": customer_sentiment,
        "ai_summary": ai_summary,
        "suggested_response": suggested_response,
        "escalation_id": str(escalation.id),
    }
