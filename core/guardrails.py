import logging
import re

logger = logging.getLogger(__name__)

# Terms that require grounding in the knowledge base
SENSITIVE_PATTERNS = [
    (r"\b\d+%\s*(off|discount)", "discount percentage"),
    (r"\$\d+", "price/amount"),
    (r"\b(refund|money.?back)\b", "refund policy"),
    (r"\b(guarantee|guaranteed|warranty)\b", "guarantee/warranty"),
    (r"\b(free\s+(?:trial|plan|tier))\b", "free offering"),
    (r"\b(SLA|uptime)\b", "SLA/uptime commitment"),
    (r"\b(\d+[\s-]?day|\d+[\s-]?hour).*(?:response|resolution|turnaround)\b", "response time commitment"),
    (r"\b(policy|policies)\b", "policy reference"),
    (r"\b(cancel(?:lation)?.*(?:fee|charge|penalty))\b", "cancellation terms"),
]


def check_response(response: str, knowledge_chunks: list[str]) -> dict:
    """Check an AI-generated response for potential hallucinations.

    Scans the response for sensitive terms (prices, policies, guarantees)
    and verifies they are grounded in the provided knowledge base chunks.

    Args:
        response: The AI-generated response text.
        knowledge_chunks: The knowledge base content used as context.

    Returns:
        Dict with:
          - is_safe (bool): True if no ungrounded sensitive claims found.
          - flagged_terms (list): List of flagged term descriptions.
          - recommendation (str): Action recommendation.
    """
    if not response:
        return {
            "is_safe": True,
            "flagged_terms": [],
            "recommendation": "Empty response — nothing to check.",
        }

    kb_text = " ".join(knowledge_chunks).lower() if knowledge_chunks else ""
    response_lower = response.lower()
    flagged_terms = []

    for pattern, label in SENSITIVE_PATTERNS:
        matches = re.findall(pattern, response_lower, re.IGNORECASE)
        if not matches:
            continue

        # Check if the matched content appears in the knowledge base
        for match in matches:
            match_str = match if isinstance(match, str) else match[0] if match else ""
            if match_str and match_str.lower() not in kb_text:
                flagged_terms.append(label)
                break

    # Deduplicate
    flagged_terms = list(dict.fromkeys(flagged_terms))

    if not flagged_terms:
        return {
            "is_safe": True,
            "flagged_terms": [],
            "recommendation": "Response appears grounded in knowledge base.",
        }

    if len(flagged_terms) >= 3:
        recommendation = (
            "High risk of hallucination. Multiple ungrounded claims detected. "
            "Recommend escalating to a human agent."
        )
    else:
        recommendation = (
            f"Potential ungrounded claims detected: {', '.join(flagged_terms)}. "
            "Review before sending or add a disclaimer."
        )

    return {
        "is_safe": False,
        "flagged_terms": flagged_terms,
        "recommendation": recommendation,
    }
