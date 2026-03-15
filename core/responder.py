import logging

import anthropic
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_response(
    message: str,
    conversation_history: list,
    knowledge_chunks: list,
) -> dict:
    """Generate a support response using Claude Sonnet with RAG context.

    Args:
        message: The current customer message.
        conversation_history: List of dicts with 'role' and 'content' keys.
        knowledge_chunks: List of relevant knowledge base content strings.

    Returns:
        Dict with 'response' (str) and 'confidence' (float).
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = """<role>
You are a helpful, professional customer support agent. You represent the company
and must provide accurate, empathetic responses.
</role>

<rules>
- ONLY answer based on the provided knowledge base context below.
- If the knowledge base context does not contain enough information to answer
  confidently, say so honestly and offer to connect the customer with a human agent.
- Never fabricate policies, prices, guarantees, or technical details.
- Be concise but thorough. Use a warm, professional tone.
- If the customer seems frustrated, acknowledge their feelings before solving.
- Always end with a clear next step or offer for further help.
</rules>"""

    # Build the user message with knowledge context
    kb_context = "\n---\n".join(knowledge_chunks) if knowledge_chunks else "No relevant knowledge base entries found."

    user_content = f"""<knowledge_base_context>
{kb_context}
</knowledge_base_context>

<customer_message>
{message}
</customer_message>"""

    # Build messages list from conversation history + current message
    messages = []
    for entry in conversation_history:
        role = "assistant" if entry["role"] == "ai" else "user"
        messages.append({"role": role, "content": entry["content"]})
    messages.append({"role": "user", "content": user_content})

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )

        response_text = response.content[0].text.strip()
        stop_reason = response.stop_reason

        # Heuristic confidence: lower if the model hedged or offered handoff
        confidence = 0.9
        hedge_phrases = [
            "i'm not sure",
            "i don't have enough information",
            "connect you with",
            "human agent",
            "i cannot confirm",
        ]
        for phrase in hedge_phrases:
            if phrase in response_text.lower():
                confidence = 0.5
                break

        if stop_reason != "end_turn":
            confidence = max(confidence - 0.2, 0.1)

        return {
            "response": response_text,
            "confidence": confidence,
        }

    except Exception as e:
        logger.error("Responder error: %s", str(e))
        return {
            "response": (
                "I apologize, but I'm experiencing a temporary issue. "
                "Let me connect you with a human agent who can help right away."
            ),
            "confidence": 0.0,
        }
