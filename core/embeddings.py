import hashlib
import logging
import math

logger = logging.getLogger(__name__)


def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimensional embedding vector for the given text.

    TODO: Replace this placeholder with a real embedding model. Options:
      - OpenAI text-embedding-3-small (1536 dims)
      - Voyage AI voyage-3 via the voyageai SDK
      - Local sentence-transformers model
    The current implementation produces a deterministic pseudo-embedding
    based on a hash of the input text. It is NOT suitable for production
    semantic search — only for development and testing.
    """
    # Deterministic pseudo-embedding from text hash
    digest = hashlib.sha512(text.encode("utf-8")).hexdigest()
    # Extend the hash to cover 1536 floats
    extended = digest
    while len(extended) < 1536 * 2:
        extended += hashlib.sha512(extended.encode("utf-8")).hexdigest()

    raw = []
    for i in range(1536):
        byte_val = int(extended[i * 2 : i * 2 + 2], 16)
        raw.append((byte_val / 255.0) * 2 - 1)  # normalize to [-1, 1]

    # L2-normalize so cosine distance is meaningful
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

        # Try to break at a sentence or word boundary
        if end < len(text):
            # Look for sentence boundary
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
