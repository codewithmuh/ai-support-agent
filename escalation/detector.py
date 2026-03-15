import logging

logger = logging.getLogger(__name__)

NEGATIVE_SENTIMENT_KEYWORDS = [
    "frustrated",
    "angry",
    "ridiculous",
    "terrible",
    "worst",
    "unacceptable",
    "furious",
    "lawsuit",
    "complaint",
    "disappointed",
    "horrible",
    "awful",
    "incompetent",
    "useless",
    "scam",
    "fraud",
    "steal",
]

HUMAN_REQUEST_PHRASES = [
    "talk to a human",
    "speak to a person",
    "real person",
    "speak to manager",
    "human agent",
    "customer service representative",
    "talk to someone",
    "speak to a human",
    "real agent",
    "talk to a manager",
    "speak with a manager",
    "speak with a human",
    "connect me to a human",
    "transfer to agent",
]


def should_escalate(message: str, classification: dict) -> dict:
    """Determine whether a customer message should be escalated to a human agent.

    Checks three conditions in order and returns the first matching reason:
    1. Low AI classification confidence (< 0.7)
    2. Negative sentiment keywords detected in the message
    3. Explicit request for a human agent

    Args:
        message: The customer's message text.
        classification: Dict from the classifier containing at least a
            ``confidence`` key (float 0.0–1.0).

    Returns:
        A dict with ``should_escalate`` (bool), ``reason`` (str), and
        ``details`` (str).
    """
    message_lower = message.lower()

    # Check 1: Low confidence from the AI classifier
    confidence = classification.get("confidence", 1.0)
    if confidence < 0.7:
        logger.info(
            "Escalation triggered: low confidence (%.2f) for message: %s",
            confidence,
            message[:80],
        )
        return {
            "should_escalate": True,
            "reason": "low_confidence",
            "details": (
                f"AI classification confidence is {confidence:.2f}, "
                f"below the 0.7 threshold. "
                f"Category: {classification.get('category', 'unknown')}."
            ),
        }

    # Check 2: Negative sentiment keywords
    found_keywords = [kw for kw in NEGATIVE_SENTIMENT_KEYWORDS if kw in message_lower]
    if found_keywords:
        logger.info(
            "Escalation triggered: negative sentiment keywords %s in message: %s",
            found_keywords,
            message[:80],
        )
        return {
            "should_escalate": True,
            "reason": "negative_sentiment",
            "details": (
                f"Negative sentiment detected. "
                f"Keywords found: {', '.join(found_keywords)}."
            ),
        }

    # Check 3: Explicit human request
    for phrase in HUMAN_REQUEST_PHRASES:
        if phrase in message_lower:
            logger.info(
                "Escalation triggered: human request phrase '%s' in message: %s",
                phrase,
                message[:80],
            )
            return {
                "should_escalate": True,
                "reason": "customer_request",
                "details": f"Customer explicitly requested a human agent: '{phrase}'.",
            }

    return {
        "should_escalate": False,
        "reason": "",
        "details": "",
    }
