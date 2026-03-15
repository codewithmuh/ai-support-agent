import logging

logger = logging.getLogger(__name__)

# Weighted keyword dictionaries — higher weight = stronger signal
NEGATIVE_KEYWORDS: dict[str, float] = {
    "angry": 2.0,
    "furious": 2.5,
    "frustrated": 1.5,
    "ridiculous": 1.5,
    "terrible": 2.0,
    "worst": 2.0,
    "unacceptable": 2.0,
    "lawsuit": 3.0,
    "complaint": 1.0,
    "disappointed": 1.0,
    "horrible": 2.0,
    "awful": 2.0,
    "incompetent": 2.5,
    "useless": 2.0,
    "scam": 3.0,
    "fraud": 3.0,
    "steal": 2.5,
}

POSITIVE_KEYWORDS: dict[str, float] = {
    "thank": 1.0,
    "great": 1.0,
    "awesome": 1.5,
    "excellent": 1.5,
    "perfect": 1.5,
    "helpful": 1.0,
    "amazing": 1.5,
    "wonderful": 1.5,
    "appreciate": 1.0,
    "love": 1.0,
}


def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of a text string using weighted keyword matching.

    Uses a simple but effective keyword-based approach where each keyword
    carries a weight reflecting how strongly it signals positive or negative
    sentiment. The final score is normalized to the range [-1.0, 1.0].

    Args:
        text: The text to analyze.

    Returns:
        A dict with:
        - sentiment: "positive", "neutral", or "negative"
        - score: float in [-1.0, 1.0] where -1.0 is most negative
        - keywords_found: list of matched keywords
    """
    text_lower = text.lower()
    keywords_found: list[str] = []

    negative_score = 0.0
    for keyword, weight in NEGATIVE_KEYWORDS.items():
        if keyword in text_lower:
            negative_score += weight
            keywords_found.append(keyword)

    positive_score = 0.0
    for keyword, weight in POSITIVE_KEYWORDS.items():
        if keyword in text_lower:
            positive_score += weight
            keywords_found.append(keyword)

    # Compute a normalized score in [-1.0, 1.0]
    total_weight = positive_score + negative_score
    if total_weight == 0:
        score = 0.0
    else:
        # Positive pulls toward +1, negative pulls toward -1
        score = (positive_score - negative_score) / total_weight

    # Clamp to [-1.0, 1.0] (should already be, but defensive)
    score = max(-1.0, min(1.0, score))

    # Determine sentiment label
    if score > 0.1:
        sentiment = "positive"
    elif score < -0.1:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    logger.debug(
        "Sentiment analysis: score=%.2f sentiment=%s keywords=%s",
        score,
        sentiment,
        keywords_found,
    )

    return {
        "sentiment": sentiment,
        "score": round(score, 3),
        "keywords_found": keywords_found,
    }
