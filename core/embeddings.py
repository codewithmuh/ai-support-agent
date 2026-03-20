import hashlib
import logging
import math

from django.conf import settings

logger = logging.getLogger(__name__)

_openai_client = None


def _get_openai_client():
    """Lazy-initialize the OpenAI client."""
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI

        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimensional embedding vector for the given text.

    Uses OpenAI text-embedding-3-small (1536 dims) for production-quality
    semantic search. Falls back to hash-based pseudo-embeddings if the
    OpenAI API key is not configured.
    """
    from .ai_keys import get_openai_api_key

    openai_key = get_openai_api_key()
    if not openai_key:
        logger.warning("OPENAI_API_KEY not set — using pseudo-embeddings (not suitable for production)")
        return _pseudo_embedding(text)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=openai_key)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error("OpenAI embedding failed, falling back to pseudo: %s", e)
        return _pseudo_embedding(text)


def _pseudo_embedding(text: str) -> list[float]:
    """Deterministic pseudo-embedding from text hash. Dev/testing only."""
    digest = hashlib.sha512(text.encode("utf-8")).hexdigest()
    extended = digest
    while len(extended) < 1536 * 2:
        extended += hashlib.sha512(extended.encode("utf-8")).hexdigest()

    raw = []
    for i in range(1536):
        byte_val = int(extended[i * 2 : i * 2 + 2], 16)
        raw.append((byte_val / 255.0) * 2 - 1)

    magnitude = math.sqrt(sum(v * v for v in raw))
    if magnitude > 0:
        raw = [v / magnitude for v in raw]

    return raw


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks for embedding.

    Args:
        text: The full text to split.
        chunk_size: Maximum number of characters per chunk.
        overlap: Number of characters to overlap between consecutive chunks.

    Returns:
        List of text chunks.
    """
    if not text or not text.strip():
        return []

    text = text.strip()

    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end < len(text):
            for sep in [". ", ".\n", "\n\n", "\n", " "]:
                boundary = text.rfind(sep, start + chunk_size // 2, end)
                if boundary != -1:
                    end = boundary + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks
