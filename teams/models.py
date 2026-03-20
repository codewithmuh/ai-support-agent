import uuid

from django.conf import settings
from django.db import models


class Team(models.Model):
    """A tenant/organization that owns conversations, configs, and agents."""

    PLAN_CHOICES = [
        ("free", "Free"),
        ("pro", "Pro"),
        ("enterprise", "Enterprise"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    # AI API keys (optional — falls back to .env if not set)
    anthropic_api_key = models.TextField(blank=True, default="")
    openai_api_key = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teams"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class TeamMembership(models.Model):
    """Links Django's built-in User to a Team with a role."""

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("agent", "Agent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="agent")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "team_memberships"
        unique_together = [("user", "team")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.email} — {self.team.name} ({self.role})"


class TeamWhatsAppConfig(models.Model):
    """WhatsApp Business API credentials for a team."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.OneToOneField(
        Team,
        on_delete=models.CASCADE,
        related_name="whatsapp_config",
    )
    phone_number_id = models.CharField(max_length=255)
    access_token = models.TextField(help_text="Will be encrypted in a future release.")
    verify_token = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "team_whatsapp_configs"

    def __str__(self) -> str:
        return f"WhatsApp config for {self.team.name}"


class TeamGmailConfig(models.Model):
    """Gmail API credentials for a team."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.OneToOneField(
        Team,
        on_delete=models.CASCADE,
        related_name="gmail_config",
    )
    google_client_id = models.CharField(max_length=255, blank=True, default="")
    google_client_secret = models.TextField(blank=True, default="")
    credentials_json = models.TextField(
        blank=True, default="",
        help_text="OAuth token JSON. Will be encrypted in a future release."
    )
    watch_email = models.EmailField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=False)
    last_poll_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "team_gmail_configs"

    def __str__(self) -> str:
        return f"Gmail config for {self.team.name}"


class TeamTelegramConfig(models.Model):
    """Telegram Bot API credentials for a team."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.OneToOneField(
        Team,
        on_delete=models.CASCADE,
        related_name="telegram_config",
    )
    bot_token = models.TextField(help_text="Bot token from @BotFather.")
    bot_username = models.CharField(max_length=100, blank=True, default="")
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "team_telegram_configs"

    def __str__(self) -> str:
        return f"Telegram config for {self.team.name}"


class TeamMessengerConfig(models.Model):
    """Facebook Messenger & Instagram DM credentials for a team.

    Both Messenger and Instagram DMs use the same Meta Graph API.
    When instagram_enabled is True and the page_id matches the webhook
    entry, incoming messages are treated as Instagram DMs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.OneToOneField(
        Team,
        on_delete=models.CASCADE,
        related_name="messenger_config",
    )
    page_access_token = models.TextField(
        help_text="Page Access Token from Facebook Developer Portal."
    )
    page_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Facebook Page ID. Used to route webhooks.",
    )
    verify_token = models.CharField(max_length=255)
    instagram_enabled = models.BooleanField(
        default=False,
        help_text="When True, messages from this page are treated as Instagram DMs.",
    )
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "team_messenger_configs"

    def __str__(self) -> str:
        return f"Messenger config for {self.team.name}"


class TeamAPIKey(models.Model):
    """API key for programmatic access, scoped to a team."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    key_hash = models.CharField(max_length=64, unique=True)
    prefix = models.CharField(max_length=8, help_text="First 8 chars of key, for display.")
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "team_api_keys"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.prefix}...)"
