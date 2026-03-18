from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import serializers

from .models import Team, TeamGmailConfig, TeamTelegramConfig, TeamWhatsAppConfig


# ---------------------------------------------------------------------------
# Team
# ---------------------------------------------------------------------------


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "slug", "plan", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Channel configs
# ---------------------------------------------------------------------------


class TeamWhatsAppConfigSerializer(serializers.ModelSerializer):
    access_token = serializers.CharField(write_only=True, required=True)
    access_token_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TeamWhatsAppConfig
        fields = [
            "id",
            "phone_number_id",
            "access_token",
            "access_token_display",
            "verify_token",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_access_token_display(self, obj: TeamWhatsAppConfig) -> str:
        """Mask the access token — show only the last 8 characters."""
        if obj.access_token and len(obj.access_token) > 8:
            return f"{'*' * 12}{obj.access_token[-8:]}"
        return "********"


class TeamGmailConfigSerializer(serializers.ModelSerializer):
    credentials_json = serializers.CharField(write_only=True, required=True)
    credentials_json_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TeamGmailConfig
        fields = [
            "id",
            "credentials_json",
            "credentials_json_display",
            "watch_email",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_credentials_json_display(self, obj: TeamGmailConfig) -> str:
        """Mask the credentials JSON on read."""
        if obj.credentials_json:
            return "***** (credentials stored)"
        return ""


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class TeamTelegramConfigSerializer(serializers.ModelSerializer):
    bot_token = serializers.CharField(write_only=True, required=True)
    bot_token_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TeamTelegramConfig
        fields = [
            "id",
            "bot_token",
            "bot_token_display",
            "bot_username",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_bot_token_display(self, obj: TeamTelegramConfig) -> str:
        if obj.bot_token and len(obj.bot_token) > 8:
            return f"{'*' * 12}{obj.bot_token[-8:]}"
        return "********"


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
