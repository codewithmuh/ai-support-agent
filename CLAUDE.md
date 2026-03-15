# AI Support Agent — Multi-Channel Customer Support System

## Project Overview
A production-ready AI customer support agent that handles WhatsApp, Email (Gmail), and Web Chat — all feeding into one AI brain. Built for a CodeWithMuh YouTube tutorial demonstrating how to replace expensive SaaS tools ($990-$1500/mo) with a self-hosted solution (~$85/mo).

The core principle: **80/20 hybrid approach** — AI handles 80% of routine tickets, humans handle the complex 20%. This is NOT a full replacement for human agents; it's a force multiplier.

## Tech Stack
- **Backend:** Python, Django (Django REST Framework for APIs, Django Channels for WebSockets)
- **AI:** Anthropic Claude API
  - Claude Haiku — ticket classification/routing (fast, cheap, ~$1/M tokens)
  - Claude Sonnet — response generation with RAG context (~$3/M tokens)
- **Database:** PostgreSQL + pgvector (self-hosted via Docker)
- **Channels:**
  - WhatsApp Business Cloud API (Meta)
  - Gmail API (Google Cloud, service account)
  - Custom WebSocket-based web chat widget
- **Dashboard:** Next.js (agent dashboard for escalated tickets + analytics)
- **Infrastructure:** Docker Compose (PostgreSQL, Django backend, Next.js frontend, Redis for Django Channels)
- **Tunneling:** ngrok (for WhatsApp/Gmail webhooks during development)

## Project Structure
```
ai-support-agent/
├── manage.py
├── config/                          # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py                      # ASGI entry (Django Channels)
│   └── wsgi.py
├── core/                            # AI brain app
│   ├── models.py                    # Conversation, Message, Ticket, KnowledgeBase models
│   ├── classifier.py                # Haiku-based ticket routing
│   ├── responder.py                 # Sonnet-based response generation
│   ├── knowledge_base.py            # pgvector RAG retrieval
│   ├── embeddings.py                # Text chunking & embedding generation
│   ├── guardrails.py                # Anti-hallucination checks
│   ├── serializers.py               # DRF serializers
│   ├── urls.py
│   └── admin.py
├── channels_app/                    # Multi-channel integration app
│   ├── models.py
│   ├── views.py                     # Webhook endpoints (WhatsApp, Email)
│   ├── consumers.py                 # Django Channels WebSocket consumer (web chat)
│   ├── routing.py                   # WebSocket URL routing
│   ├── unified.py                   # UnifiedMessage normalization
│   ├── whatsapp.py                  # WhatsApp Cloud API helpers
│   ├── email_handler.py             # Gmail API polling & reply
│   ├── serializers.py
│   └── urls.py
├── escalation/                      # Escalation & handoff app
│   ├── models.py
│   ├── detector.py                  # Escalation trigger logic
│   ├── handoff.py                   # Context packaging for human agents
│   ├── sentiment.py                 # Sentiment analysis helper
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── dashboard/                       # Next.js agent dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx             # Dashboard overview
│   │   │   ├── tickets/             # Ticket queue & detail views
│   │   │   └── analytics/           # Analytics panel
│   │   └── components/
│   │       ├── TicketQueue.tsx
│   │       ├── ConversationThread.tsx
│   │       ├── AISidebar.tsx        # Classification + suggested response
│   │       └── ChatWidget.tsx       # Embeddable web chat widget
│   └── package.json
├── scripts/
│   └── seed_knowledge_base.py       # Load FAQ/docs into knowledge base
├── tests/
├── docker-compose.yml               # PostgreSQL, Django, Next.js, Redis, (ngrok optional)
├── Dockerfile                       # Django backend
├── dashboard/Dockerfile             # Next.js frontend
├── .env.example
├── requirements.txt
├── CLAUDE.md
└── README.md
```

## Architecture Flow
```
Customer Message (WhatsApp / Email / Web Chat)
    ↓
Django Backend → Normalize to UnifiedMessage
    ↓
Claude Haiku → Classify (billing | technical | account | complaint | escalate)
    ↓                                    ↓ (confidence < 0.7 OR angry OR asks for human)
    ↓                                    → ESCALATE → Dashboard (human agent)
    ↓
PostgreSQL pgvector → Retrieve relevant knowledge base chunks
    ↓
Claude Sonnet → Generate response (constrained to KB context only)
    ↓
Guardrail Check → Verify no hallucinated policies/prices/guarantees
    ↓
Send Response via original channel
    ↓
Store in PostgreSQL (conversations + messages tables)
```

## Key Design Decisions

### Ticket Classification (Haiku)
- Uses Anthropic's official XML tag pattern for structured output
- Categories: `billing`, `technical`, `account`, `complaint`, `escalate`
- Returns confidence score (0.0-1.0) — auto-escalate below 0.7

### Response Generation (Sonnet)
- RAG-based: only answers from knowledge base context
- System prompt explicitly prohibits answering without KB match
- If no relevant chunks found → graceful decline + offer human handoff

### Escalation Triggers (3 conditions)
1. Haiku confidence < 0.7
2. Negative sentiment detected (frustrated/angry customer)
3. Explicit human request ("talk to a human", "speak to manager", etc.)

### Anti-Hallucination Guardrails (3 layers)
1. System prompt: "only answer based on provided context"
2. Empty RAG results → don't attempt to answer
3. Post-generation check: flag mentions of policies/prices/guarantees not in KB

## Coding Conventions
- Use Django ORM models for database (PostgreSQL via Docker Compose)
- Use Django REST Framework serializers for API request/response validation
- Django Channels for WebSocket (web chat)
- Type hints on all functions
- Environment variables via django-environ (never hardcode secrets)
- Use `requests` for HTTP calls (WhatsApp API, Gmail API)
- Structured logging with conversation IDs for traceability
- Follow standard Django app separation (core, channels_app, escalation)

## Database Schema (Django ORM → PostgreSQL + pgvector)
- `KnowledgeBase` — FAQ/doc chunks with pgvector embeddings
- `Conversation` — conversation threads with channel, status, assigned agent
- `Message` — individual messages linked to conversations
- `Escalation` — escalation events with reason, context snapshot, suggested response
- Django manages migrations; pgvector extension enabled via raw SQL migration
- PostgreSQL runs as a Docker container using `pgvector/pgvector:pg16` image

## Docker Compose Services
- **db** — `pgvector/pgvector:pg16` (PostgreSQL with vector search)
- **redis** — `redis:7-alpine` (channel layer for Django Channels WebSockets)
- **backend** — Django app (DRF APIs + Django Channels ASGI)
- **frontend** — Next.js agent dashboard
- **ngrok** — (optional) tunnel for WhatsApp/Gmail webhooks in dev

## Environment Variables
```
# Django
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=

# Database (Docker PostgreSQL)
POSTGRES_DB=support_agent
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
DATABASE_URL=postgres://postgres:<password>@db:5432/support_agent

# AI
ANTHROPIC_API_KEY=

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# Gmail
GOOGLE_CREDENTIALS_PATH=
GMAIL_WATCH_ADDRESS=

# Ngrok (optional, for webhook tunneling)
NGROK_AUTHTOKEN=
```

## Important Notes
- This project is for a YouTube tutorial (CodeWithMuh channel) — code should be clean, well-structured, and easy to follow
- Prioritize readability over cleverness — viewers will be reading this code
- Keep functions focused and well-named so they're self-documenting
- WhatsApp Business API service messages are free within the 24-hour customer-initiated window
- The dashboard is intentionally simple — not a full-featured helpdesk, just enough to demonstrate the concept
- Target monthly cost: ~$85 (Claude API + small VPS for Docker hosting)
- Everything runs via `docker-compose up` — one command to start the full stack
