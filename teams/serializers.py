from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import serializers

from .models import Team, TeamGmailConfig, TeamMessengerConfig, TeamTelegramConfig, TeamWhatsAppConfig


# ---------------------------------------------------------------------------
# Team
# ---------------------------------------------------------------------------


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "slug", "plan", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeamAIConfigSerializer(serializers.Serializer):
    anthropic_api_key = serializers.CharField(required=False, allow_blank=True)
    openai_api_key = serializers.CharField(required=False, allow_blank=True)
    has_anthropic_key = serializers.SerializerMethodField(read_only=True)
    has_openai_key = serializers.SerializerMethodField(read_only=True)

    def get_has_anthropic_key(self, obj) -> bool:
        return bool(getattr(obj, "anthropic_api_key", ""))

    def get_has_openai_key(self, obj) -> bool:
        return bool(getattr(obj, "openai_api_key", ""))


# ---------------------------------------------------------------------------
# Channel configs
# ---------------------------------------------------------------------------


class TeamWhatsAppConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamWhatsAppConfig
        fields = [
            "id",
            "phone_number_id",
            "access_token",
            "verify_token",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeamGmailConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamGmailConfig
        fields = [
            "id",
            "google_client_id",
            "google_client_secret",
            "credentials_json",
            "watch_email",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class TeamTelegramConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamTelegramConfig
        fields = [
            "id",
            "bot_token",
            "bot_username",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeamMessengerConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMessengerConfig
        fields = [
            "id",
            "page_access_token",
            "page_id",
            "verify_token",
            "instagram_enabled",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    team_name = serializers.CharField(max_length=255)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_team_name(self, value: str) -> str:
        slug = slugify(value)
        if Team.objects.filter(slug=slug).exists():
            raise serializers.ValidationError("A team with this name already exists.")
        return value

    def create(self, validated_data: dict) -> dict:
        """Create the team, user, and membership in one transaction."""
        from .models import TeamMembership

        email = validated_data["email"]
        password = validated_data["password"]
        team_name = validated_data["team_name"]

        # Create team
        team = Team.objects.create(
            name=team_name,
            slug=slugify(team_name),
        )

        # Create user (username = email for simplicity)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
        )

        # Link user to team as owner
        TeamMembership.objects.create(
            user=user,
            team=team,
            role="owner",
        )

        return {"user": user, "team": team}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        email = attrs["email"].lower()
        password = attrs["password"]

        user = authenticate(username=email, password=password)
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs["user"] = user
        return attrs


class TokenSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
