from django.contrib import admin

from .models import Team, TeamAPIKey, TeamGmailConfig, TeamMembership, TeamTelegramConfig, TeamWhatsAppConfig


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "plan", "created_at"]
    list_filter = ["plan"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "team", "role", "created_at"]
    list_filter = ["role"]
    search_fields = ["user__email", "team__name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(TeamWhatsAppConfig)
class TeamWhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = ["team", "phone_number_id", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(TeamGmailConfig)
class TeamGmailConfigAdmin(admin.ModelAdmin):
    list_display = ["team", "watch_email", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(TeamTelegramConfig)
class TeamTelegramConfigAdmin(admin.ModelAdmin):
    list_display = ["team", "bot_username", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(TeamAPIKey)
class TeamAPIKeyAdmin(admin.ModelAdmin):
    list_display = ["name", "team", "prefix", "is_active", "created_at", "last_used_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "prefix", "team__name"]
    readonly_fields = ["id", "key_hash", "prefix", "created_at", "last_used_at"]
