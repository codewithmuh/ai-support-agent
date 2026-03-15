#!/usr/bin/env python
"""Seed the knowledge base with sample FAQ entries."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import KnowledgeBase
from core.embeddings import generate_embedding

SAMPLE_FAQS = [
    {
        "category": "billing",
        "content": "Our pricing plans are: Starter ($9/month) for up to 100 conversations, "
        "Professional ($29/month) for up to 1,000 conversations, and Enterprise ($99/month) "
        "for unlimited conversations. All plans include WhatsApp, Email, and Web Chat support. "
        "Annual billing saves 20%.",
    },
    {
        "category": "billing",
        "content": "To cancel your subscription, go to Settings > Billing > Cancel Plan. "
        "Your account will remain active until the end of your current billing period. "
        "We do not offer partial refunds for unused time. If you were charged in error, "
        "contact our billing team and we will review your case within 48 hours.",
    },
    {
        "category": "billing",
        "content": "We accept Visa, Mastercard, American Express, and PayPal. "
        "Invoices are generated on the 1st of each month and sent to your registered email. "
        "You can download past invoices from Settings > Billing > Invoice History.",
    },
    {
        "category": "technical",
        "content": "To reset your password: Click 'Forgot Password' on the login page, "
        "enter your registered email, and check your inbox for a reset link. The link expires "
        "in 30 minutes. If you don't receive it, check your spam folder or contact support.",
    },
    {
        "category": "technical",
        "content": "To integrate our API, generate an API key from Settings > API Keys. "
        "Use the key in the Authorization header as 'Bearer <your-key>'. "
        "Rate limits: 100 requests/minute for Starter, 500 for Professional, unlimited for Enterprise. "
        "Full API documentation is available at docs.example.com.",
    },
    {
        "category": "technical",
        "content": "If you're experiencing slow performance, try: 1) Clear your browser cache, "
        "2) Disable browser extensions, 3) Try a different browser (we recommend Chrome or Firefox), "
        "4) Check your internet connection. If the issue persists, contact technical support "
        "with your browser version and a screenshot of the issue.",
    },
    {
        "category": "account",
        "content": "To update your profile information, go to Settings > Profile. "
        "You can change your name, email, phone number, and company details. "
        "Email changes require verification via a confirmation link sent to both old and new emails. "
        "Username changes are limited to once every 30 days.",
    },
    {
        "category": "account",
        "content": "To add team members, go to Settings > Team > Invite Member. "
        "Enter their email and select a role: Admin (full access), Agent (can handle tickets), "
        "or Viewer (read-only). Each role has different permissions. "
        "Team member limits depend on your plan: Starter (2), Professional (10), Enterprise (unlimited).",
    },
    {
        "category": "general",
        "content": "Our support hours are Monday to Friday, 9 AM to 6 PM EST. "
        "AI support is available 24/7 for common questions. For urgent issues outside business hours, "
        "email urgent@example.com and our on-call team will respond within 1 hour. "
        "Average response time during business hours is under 15 minutes.",
    },
    {
        "category": "general",
        "content": "We take data security seriously. All data is encrypted at rest (AES-256) "
        "and in transit (TLS 1.3). We are SOC 2 Type II certified and GDPR compliant. "
        "You can request a data export or deletion at any time from Settings > Privacy. "
        "For our full privacy policy, visit privacy.example.com.",
    },
]


def seed():
    created_count = 0
    for faq in SAMPLE_FAQS:
        embedding = generate_embedding(faq["content"])
        KnowledgeBase.objects.create(
            content=faq["content"],
            embedding=embedding,
            category=faq["category"],
            metadata={"source": "seed_script", "type": "faq"},
        )
        created_count += 1
        print(f"  Created: {faq['category']} - {faq['content'][:60]}...")

    print(f"\nSeeded {created_count} knowledge base entries.")


if __name__ == "__main__":
    print("Seeding knowledge base...\n")
    seed()
