import logging

from django.contrib.postgres.search import SearchQuery, SearchVector
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .classifier import classify_ticket
from .embeddings import chunk_text, generate_embedding
from .guardrails import check_response
from .knowledge_base import search_knowledge_base
from .models import (
    CannedResponse,
    Conversation,
    ConversationTag,
    InternalNote,
    KnowledgeBase,
    Message,
    Tag,
)
from .responder import generate_response
from .serializers import (
    CannedResponseSerializer,
    ConversationListSerializer,
    ConversationSearchSerializer,
    ConversationSerializer,
    InternalNoteSerializer,
    KnowledgeBaseSerializer,
    ProcessMessageSerializer,
    TagSerializer,
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
    # Find existing open conversation or create a new one (race-condition safe)
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
        try:
            conversation = Conversation.objects.create(
                sender_id=sender_id,
                channel=channel,
                sender_name=sender_name or sender_id,
            )
        except Exception:
            # Race condition: another request created it first
            conversation = (
                Conversation.objects.filter(
                    sender_id=sender_id, channel=channel,
                )
                .exclude(status="resolved")
                .order_by("-created_at")
                .first()
            )

    # Save customer message
    Message.objects.create(
        conversation=conversation,
        role="customer",
        content=message,
    )

    # If human-only mode is on, skip AI entirely — wait for human agent
    if conversation.human_only:
        logger.info(
            "Human-only mode for conversation %s — skipping AI pipeline",
            conversation.id,
        )
        return {
            "response": None,
            "classification": {"category": "human_only", "confidence": 1.0, "reasoning": "Human-only mode enabled"},
            "conversation_id": str(conversation.id),
            "escalated": False,
            "human_only": True,
        }

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

        # 1. Find existing open conversation or create a new one (race-condition safe)
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
            try:
                conversation = Conversation.objects.create(
                    sender_id=sender_id,
                    channel=channel,
                    sender_name=sender_name or sender_id,
                )
            except Exception:
                conversation = (
                    Conversation.objects.filter(
                        sender_id=sender_id, channel=channel,
                    )
                    .exclude(status="resolved")
                    .order_by("-created_at")
                    .first()
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


class ToggleHumanOnlyView(APIView):
    """POST — Toggle human-only mode on a conversation.

    When enabled, AI will not respond to new messages — only human agents can reply.
    """

    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Toggle or set explicitly
        human_only = request.data.get("human_only")
        if human_only is not None:
            conversation.human_only = bool(human_only)
        else:
            conversation.human_only = not conversation.human_only

        conversation.save(update_fields=["human_only", "updated_at"])

        return Response({
            "conversation_id": str(conversation.id),
            "human_only": conversation.human_only,
        })


class ConversationDetailView(generics.RetrieveAPIView):
    """Get a single conversation with all its messages."""

    queryset = Conversation.objects.prefetch_related("messages", "tags", "internal_notes").all()
    serializer_class = ConversationSerializer


# ---------------------------------------------------------------------------
# Scale features
# ---------------------------------------------------------------------------


class TagListCreateView(generics.ListCreateAPIView):
    """List all tags or create a new one."""

    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]


class TagDeleteView(generics.DestroyAPIView):
    """Delete a tag by ID."""

    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]


class InternalNoteCreateView(APIView):
    """Create an internal note on a conversation."""

    permission_classes = [AllowAny]

    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(pk=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = InternalNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(conversation=conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CannedResponseListCreateView(generics.ListCreateAPIView):
    """List all canned responses or create a new one."""

    queryset = CannedResponse.objects.filter(is_active=True)
    serializer_class = CannedResponseSerializer
    permission_classes = [AllowAny]


class CannedResponseUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """Update or delete a canned response."""

    queryset = CannedResponse.objects.all()
    serializer_class = CannedResponseSerializer
    permission_classes = [AllowAny]


class ConversationSearchView(APIView):
    """Full-text search across messages and conversation sender names.

    Query param: ?q=<search term>
    """

    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"error": "Search query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        search_query = SearchQuery(query)

        # Find conversations where messages match the search query
        message_conversation_ids = (
            Message.objects.annotate(search=SearchVector("content"))
            .filter(search=search_query)
            .values_list("conversation_id", flat=True)
            .distinct()
        )

        # Find conversations where sender_name matches
        sender_conversation_ids = (
            Conversation.objects.annotate(search=SearchVector("sender_name"))
            .filter(search=search_query)
            .values_list("id", flat=True)
            .distinct()
        )

        # Combine both sets of IDs
        all_ids = set(message_conversation_ids) | set(sender_conversation_ids)

        conversations = (
            Conversation.objects.filter(id__in=all_ids)
            .prefetch_related("tags")
            .order_by("-updated_at")
        )

        serializer = ConversationSearchSerializer(conversations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BulkActionView(APIView):
    """Perform bulk actions on conversations.

    Accepts JSON body:
        {
            "conversation_ids": ["uuid1", "uuid2"],
            "action": "resolve" | "tag",
            "tag_id": "uuid"  (required when action is "tag")
        }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        conversation_ids = request.data.get("conversation_ids", [])
        action = request.data.get("action", "")

        if not conversation_ids:
            return Response(
                {"error": "conversation_ids is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action not in ("resolve", "tag"):
            return Response(
                {"error": "action must be 'resolve' or 'tag'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversations = Conversation.objects.filter(id__in=conversation_ids)
        matched_count = conversations.count()

        if matched_count == 0:
            return Response(
                {"error": "No matching conversations found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action == "resolve":
            updated = conversations.update(status="resolved")
            return Response(
                {"message": f"Resolved {updated} conversation(s)."},
                status=status.HTTP_200_OK,
            )

        if action == "tag":
            tag_id = request.data.get("tag_id")
            if not tag_id:
                return Response(
                    {"error": "tag_id is required for 'tag' action."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                tag = Tag.objects.get(pk=tag_id)
            except Tag.DoesNotExist:
                return Response(
                    {"error": "Tag not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            created_count = 0
            for conversation in conversations:
                _, created = ConversationTag.objects.get_or_create(
                    conversation=conversation, tag=tag
                )
                if created:
                    created_count += 1

            return Response(
                {
                    "message": f"Tagged {created_count} conversation(s) with '{tag.name}'.",
                    "already_tagged": matched_count - created_count,
                },
                status=status.HTTP_200_OK,
            )


class KnowledgeBaseUploadView(APIView):
    """Upload a file (text or PDF) to the knowledge base.

    The file is chunked, embedded, and stored as KnowledgeBase entries.
    Accepts multipart form data with:
        - file: the uploaded file
        - category: one of billing, technical, account, general (default: general)
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = request.data.get("category", "general")
        valid_categories = [c[0] for c in KnowledgeBase.CATEGORY_CHOICES]
        if category not in valid_categories:
            return Response(
                {"error": f"category must be one of: {', '.join(valid_categories)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract text from file
        filename = uploaded_file.name.lower()
        try:
            if filename.endswith(".pdf"):
                text = self._extract_pdf_text(uploaded_file)
            else:
                text = uploaded_file.read().decode("utf-8")
        except Exception as e:
            logger.error("Failed to read uploaded file: %s", str(e))
            return Response(
                {"error": f"Failed to read file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not text.strip():
            return Response(
                {"error": "File contains no extractable text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Chunk and embed
        chunks = chunk_text(text)
        entries_created = 0

        for chunk in chunks:
            embedding = generate_embedding(chunk)
            KnowledgeBase.objects.create(
                content=chunk,
                embedding=embedding,
                category=category,
                metadata={"source_file": uploaded_file.name},
            )
            entries_created += 1

        return Response(
            {
                "message": f"Successfully processed '{uploaded_file.name}'.",
                "chunks_created": entries_created,
                "category": category,
            },
            status=status.HTTP_201_CREATED,
        )

    def _extract_pdf_text(self, uploaded_file) -> str:
        """Extract text from a PDF file using pypdf."""
        from pypdf import PdfReader

        reader = PdfReader(uploaded_file)
        pages_text = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages_text.append(page_text)
        return "\n\n".join(pages_text)
