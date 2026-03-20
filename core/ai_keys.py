"""Centralized AI API key resolution.

Reads from team config in database first, falls back to Django settings (.env).
"""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def get_anthropic_api_key() -> str:
    """Get Anthropic API key from database (first active team) or .env."""
    try:
        from teams.models import Team

        team = Team.objects.exclude(anthropic_api_key="").first()
        if team and team.anthropic_api_key:
            return team.anthropic_api_key
    except Exception:
        pass

    return getattr(settings, "ANTHROPIC_API_KEY", "")


def get_openai_api_key() -> str:
    """Get OpenAI API key from database (first active team) or .env."""
    try:
        from teams.models import Team

        team = Team.objects.exclude(openai_api_key="").first()
        if team and team.openai_api_key:
            return team.openai_api_key
    except Exception:
        pass

    return getattr(settings, "OPENAI_API_KEY", "")
