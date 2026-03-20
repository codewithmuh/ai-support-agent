import json
import logging
import urllib.parse
from typing import Optional

import requests as http_requests
from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Team, TeamGmailConfig, TeamMembership, TeamMessengerConfig, TeamTelegramConfig, TeamWhatsAppConfig

logger = logging.getLogger(__name__)
from .serializers import (
    LoginSerializer,
    SignupSerializer,
    TeamAIConfigSerializer,
    TeamGmailConfigSerializer,
    TeamMessengerConfigSerializer,
    TeamSerializer,
    TeamTelegramConfigSerializer,
    TeamWhatsAppConfigSerializer,
    TokenSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_team_for_user(user) -> Optional[Team]:
    """Return the first team the user belongs to (most users have one)."""
    membership = (
        TeamMembership.objects.filter(user=user)
        .select_related("team")
        .first()
    )
    return membership.team if membership else None


def _get_tokens_for_user(user) -> dict:
    """Generate JWT access + refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------


class SignupView(generics.GenericAPIView):
    """POST — Create a new team + admin user, return JWT tokens."""

    serializer_class = SignupSerializer
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        user = result["user"]
        tokens = _get_tokens_for_user(user)

        return Response(
            {
                "token": tokens["access"],
                "refresh": tokens["refresh"],
                "user": {"id": user.id, "email": user.email},
                "team": TeamSerializer(result["team"]).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(generics.GenericAPIView):
    """POST — Authenticate and return JWT tokens."""

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        tokens = _get_tokens_for_user(user)

        team = _get_team_for_user(user)

        return Response(
            {
                "token": tokens["access"],
                "refresh": tokens["refresh"],
                "user": {"id": user.id, "email": user.email},
                "team": TeamSerializer(team).data if team else None,
            },
            status=status.HTTP_200_OK,
        )


class MeView(generics.GenericAPIView):
    """GET — Return the currently authenticated user + team."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        return Response(
            {
                "user": {"id": request.user.id, "email": request.user.email},
                "team": TeamSerializer(team).data if team else None,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Team views
# ---------------------------------------------------------------------------


class TeamDetailView(generics.GenericAPIView):
    """GET/PUT — Retrieve or update the current user's team."""

    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TeamSerializer(team).data)

    def put(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TeamSerializer(team, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# AI config view
# ---------------------------------------------------------------------------


class AIConfigView(generics.GenericAPIView):
    """GET/POST — Manage AI API keys for the current team."""

    serializer_class = TeamAIConfigSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response({"detail": "No team."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TeamAIConfigSerializer(team).data)

    def post(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response({"detail": "No team."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TeamAIConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = []
        if "anthropic_api_key" in serializer.validated_data:
            team.anthropic_api_key = serializer.validated_data["anthropic_api_key"]
            updated.append("anthropic_api_key")
        if "openai_api_key" in serializer.validated_data:
            team.openai_api_key = serializer.validated_data["openai_api_key"]
            updated.append("openai_api_key")

        if updated:
            team.save(update_fields=updated + ["updated_at"])

        return Response(TeamAIConfigSerializer(team).data)

    def put(self, request: Request) -> Response:
        return self.post(request)


# ---------------------------------------------------------------------------
# Channel config views
# ---------------------------------------------------------------------------


class WhatsAppConfigView(generics.GenericAPIView):
    """GET/POST/PUT — Manage WhatsApp config for the current team."""

    serializer_class = TeamWhatsAppConfigSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            config = team.whatsapp_config
        except TeamWhatsAppConfig.DoesNotExist:
            return Response(
                {"detail": "WhatsApp config not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(TeamWhatsAppConfigSerializer(config).data)

    def post(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Upsert: create or update — auto-activate when credentials are saved
        try:
            config = team.whatsapp_config
            serializer = TeamWhatsAppConfigSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(is_active=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TeamWhatsAppConfig.DoesNotExist:
            serializer = TeamWhatsAppConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(team=team, is_active=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
        return self.post(request)


class WhatsAppTestView(generics.GenericAPIView):
    """POST — Test WhatsApp connection by verifying the access token."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        import requests as http_requests

        team = _get_team_for_user(request.user)
        if team is None:
            return Response({"detail": "No team."}, status=status.HTTP_404_NOT_FOUND)

        try:
            config = team.whatsapp_config
        except TeamWhatsAppConfig.DoesNotExist:
            return Response(
                {"detail": "WhatsApp config not found. Save config first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Test by calling the WhatsApp Business API to get phone number info
        try:
            resp = http_requests.get(
                f"https://graph.facebook.com/v22.0/{config.phone_number_id}",
                headers={"Authorization": f"Bearer {config.access_token}"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return Response({
                    "status": "connected",
                    "phone_number": data.get("display_phone_number", ""),
                    "quality_rating": data.get("quality_rating", ""),
                    "verified_name": data.get("verified_name", ""),
                })
            else:
                error = resp.json().get("error", {})
                return Response(
                    {
                        "status": "failed",
                        "detail": error.get("message", f"HTTP {resp.status_code}"),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response(
                {"status": "failed", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GmailConfigView(generics.GenericAPIView):
    """GET/POST/PUT/DELETE — Manage Gmail config for the current team."""

    serializer_class = TeamGmailConfigSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            config = team.gmail_config
        except TeamGmailConfig.DoesNotExist:
            return Response(
                {"detail": "Gmail config not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(TeamGmailConfigSerializer(config).data)

    def post(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            config = team.gmail_config
            serializer = TeamGmailConfigSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TeamGmailConfig.DoesNotExist:
            serializer = TeamGmailConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(team=team)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
        return self.post(request)

    def delete(self, request: Request) -> Response:
        """Disconnect Gmail — clear credentials and deactivate."""
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            config = team.gmail_config
        except TeamGmailConfig.DoesNotExist:
            return Response(
                {"detail": "Gmail config not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        config.credentials_json = ""
        config.is_active = False
        config.save(update_fields=["credentials_json", "is_active", "updated_at"])
        return Response({"detail": "Gmail disconnected."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Gmail OAuth views
# ---------------------------------------------------------------------------

GMAIL_OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]


class GmailOAuthInitView(generics.GenericAPIView):
    """GET — Generate Google OAuth URL for Gmail authorization."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check team's Gmail config first, then fall back to .env
        client_id = ""
        try:
            gmail_config = team.gmail_config
            client_id = gmail_config.google_client_id
        except TeamGmailConfig.DoesNotExist:
            pass

        if not client_id:
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")

        if not client_id:
            return Response(
                {"detail": "Google Client ID is not configured. Enter it in Settings > Gmail."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        redirect_uri = f"{request.scheme}://{request.get_host()}/api/auth/gmail/callback/"

        params = urllib.parse.urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(GMAIL_OAUTH_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": str(team.id),
        })

        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
        return Response({"auth_url": auth_url})


class GmailOAuthCallbackView(generics.GenericAPIView):
    """GET — Handle the OAuth callback redirect from Google."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        dashboard_url = "http://localhost:3000/settings/gmail"
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        error = request.query_params.get("error")

        if error:
            logger.warning("Gmail OAuth error from Google: %s", error)
            return HttpResponseRedirect(f"{dashboard_url}?error={urllib.parse.quote(error)}")

        if not code or not state:
            return HttpResponseRedirect(f"{dashboard_url}?error=missing_code_or_state")

        # Look up the team from the state parameter
        try:
            team = Team.objects.get(id=state)
        except Team.DoesNotExist:
            return HttpResponseRedirect(f"{dashboard_url}?error=invalid_team")

        # Get client credentials from team config or .env
        client_id = ""
        client_secret = ""
        try:
            gmail_config = team.gmail_config
            client_id = gmail_config.google_client_id
            client_secret = gmail_config.google_client_secret
        except TeamGmailConfig.DoesNotExist:
            pass

        if not client_id:
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        if not client_secret:
            client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "")

        # Exchange authorization code for tokens
        redirect_uri = f"{request.scheme}://{request.get_host()}/api/auth/gmail/callback/"

        try:
            token_resp = http_requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=15,
            )
            if token_resp.status_code != 200:
                logger.error("Gmail OAuth token exchange failed: %s", token_resp.text)
                return HttpResponseRedirect(f"{dashboard_url}?error=token_exchange_failed")

            token_data = token_resp.json()
        except Exception as exc:
            logger.exception("Gmail OAuth token exchange error: %s", exc)
            return HttpResponseRedirect(f"{dashboard_url}?error=token_exchange_error")

        # Fetch the user's email address using the access token
        watch_email = ""
        try:
            userinfo_resp = http_requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
                timeout=10,
            )
            if userinfo_resp.status_code == 200:
                watch_email = userinfo_resp.json().get("email", "")
        except Exception as exc:
            logger.warning("Failed to fetch Gmail user info: %s", exc)

        # Store the tokens in the database
        try:
            config = team.gmail_config
            config.credentials_json = json.dumps(token_data)
            config.is_active = True
            if watch_email:
                config.watch_email = watch_email
            config.save(update_fields=["credentials_json", "is_active", "watch_email", "updated_at"])
        except TeamGmailConfig.DoesNotExist:
            TeamGmailConfig.objects.create(
                team=team,
                credentials_json=json.dumps(token_data),
                watch_email=watch_email,
                is_active=True,
            )

        return HttpResponseRedirect(f"{dashboard_url}?connected=true")


class TelegramConfigView(generics.GenericAPIView):
    """GET/POST/PUT — Manage Telegram config for the current team."""

    serializer_class = TeamTelegramConfigSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response({"detail": "No team."}, status=status.HTTP_404_NOT_FOUND)
        try:
            config = team.telegram_config
        except TeamTelegramConfig.DoesNotExist:
            return Response({"detail": "Telegram config not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TeamTelegramConfigSerializer(config).data)

    def post(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response({"detail": "No team."}, status=status.HTTP_404_NOT_FOUND)
        try:
            config = team.telegram_config
            serializer = TeamTelegramConfigSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TeamTelegramConfig.DoesNotExist:
            serializer = TeamTelegramConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(team=team)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
        return self.post(request)


class MessengerConfigView(generics.GenericAPIView):
    """GET/POST/PUT — Manage Messenger/Instagram config for the current team."""

    serializer_class = TeamMessengerConfigSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            config = team.messenger_config
        except TeamMessengerConfig.DoesNotExist:
            return Response(
                {"detail": "Messenger config not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(TeamMessengerConfigSerializer(config).data)

    def post(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response(
                {"detail": "You are not a member of any team."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Upsert: create or update — auto-activate when credentials are saved
        try:
            config = team.messenger_config
            serializer = TeamMessengerConfigSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(is_active=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TeamMessengerConfig.DoesNotExist:
            serializer = TeamMessengerConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(team=team, is_active=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
        return self.post(request)
