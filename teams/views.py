from typing import Optional

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Team, TeamGmailConfig, TeamMembership, TeamTelegramConfig, TeamWhatsAppConfig
from .serializers import (
    LoginSerializer,
    SignupSerializer,
    TeamGmailConfigSerializer,
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

        if TeamWhatsAppConfig.objects.filter(team=team).exists():
            return Response(
                {"detail": "WhatsApp config already exists. Use PUT to update."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = TeamWhatsAppConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(team=team)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
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
                {"detail": "WhatsApp config not found. Use POST to create."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TeamWhatsAppConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GmailConfigView(generics.GenericAPIView):
    """GET/POST/PUT — Manage Gmail config for the current team."""

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

        if TeamGmailConfig.objects.filter(team=team).exists():
            return Response(
                {"detail": "Gmail config already exists. Use PUT to update."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = TeamGmailConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(team=team)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
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
                {"detail": "Gmail config not found. Use POST to create."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TeamGmailConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
        if TeamTelegramConfig.objects.filter(team=team).exists():
            return Response({"detail": "Config exists. Use PUT."}, status=status.HTTP_409_CONFLICT)
        serializer = TeamTelegramConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(team=team)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request: Request) -> Response:
        team = _get_team_for_user(request.user)
        if team is None:
            return Response({"detail": "No team."}, status=status.HTTP_404_NOT_FOUND)
        try:
            config = team.telegram_config
        except TeamTelegramConfig.DoesNotExist:
            return Response({"detail": "Config not found. Use POST."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TeamTelegramConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
