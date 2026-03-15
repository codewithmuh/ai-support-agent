import json
import logging

import anthropic
from django.conf import settings

logger = logging.getLogger(__name__)


def classify_ticket(message: str) -> dict:
    """Classify an incoming support message using Claude Haiku.

    Returns a dict with category, confidence, and reasoning.
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = """<role>
You are a customer support ticket classifier. Your job is to analyze incoming
messages and determine the correct category for routing.
</role>

<categories>
- billing: Payment issues, invoices, refunds, subscription changes, pricing questions
- technical: Bugs, errors, feature requests, integration issues, API problems
- account: Login issues, password resets, profile updates, account deletion, permissions
- general: General inquiries, feedback, complaints, anything that doesn't fit above
</categories>

<instructions>
Analyze the customer message and respond with ONLY a JSON object (no markdown fencing)
containing these fields:
- category: one of billing, technical, account, general
- confidence: a float between 0.0 and 1.0 indicating how confident you are
- reasoning: a brief explanation of why you chose this category
</instructions>"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=system_prompt,
            messages=[
                {"role": "user", "content": f"<message>{message}</message>"}
            ],
        )

        raw = response.content[0].text.strip()
        result = json.loads(raw)

        return {
            "category": result.get("category", "general"),
            "confidence": float(result.get("confidence", 0.5)),
            "reasoning": result.get("reasoning", ""),
        }

    except json.JSONDecodeError:
        logger.error("Failed to parse classifier response: %s", raw)
        return {
            "category": "general",
            "confidence": 0.0,
            "reasoning": "Classification failed — defaulting to general.",
        }
    except Exception as e:
        logger.error("Classifier error: %s", str(e))
        return {
            "category": "general",
            "confidence": 0.0,
            "reasoning": f"Classification error: {str(e)}",
        }
