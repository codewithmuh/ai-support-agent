import hashlib
import logging
from typing import Callable

from django.http import HttpRequest, HttpResponse
from django.utils import timezone

logger = logging.getLogger(__name__)


class TeamMiddleware:
    """
    Attach ``request.team`` to every request.

    Resolution order:
    1. Webhook endpoints (paths starting with /api/webhooks/) — skip, set None.
    2. API key auth — hash the X-API-Key header and look up TeamAPIKey.
    3. Authenticated user — look up the user's team via TeamMembership.
    4. Otherwise — set request.team = None.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.team = None  # type: ignore[attr-defined]

        # Skip team resolution for webhook endpoints
        if request.path.startswith("/api/webhooks/"):
            return self.get_response(request)

        # Try API key authentication via X-API-Key header
        api_key = request.META.get("HTTP_X_API_KEY")
        if api_key:
            team = self._resolve_team_from_api_key(api_key)
            if team is not None:
                request.team = team  # type: ignore[attr-defined]
                return self.get_response(request)

        # Try authenticated user
        if hasattr(request, "user") and request.user.is_authenticated:
            team = self._resolve_team_from_user(request.user)
            if team is not None:
                request.team = team  # type: ignore[attr-defined]

        return self.get_response(request)

    @staticmethod
    def _resolve_team_from_api_key(raw_key: str):
        """Hash the raw API key and look up the corresponding team."""
        from .models import TeamAPIKey

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        try:
            api_key = (
                TeamAPIKey.objects
                .filter(key_hash=key_hash, is_active=True)
                .select_related("team")
                .first()
            )
        except Exception:
            logger.exception("Error looking up API key")
            return None

        if api_key is None:
            return None

        # Update last_used_at timestamp
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=["last_used_at"])

        return api_key.team

    @staticmethod
    def _resolve_team_from_user(user):
        """Look up the user's team via TeamMembership."""
        from .models import TeamMembership

        membership = (
            TeamMembership.objects
            .filter(user=user)
            .select_related("team")
            .first()
        )
        return membership.team if membership else None
