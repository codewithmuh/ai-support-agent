from django.urls import path

from .views import EmailWebhookView, GmailPollView, MessengerWebhookView, TelegramWebhookView, WhatsAppWebhookView

app_name = "channels_app"

urlpatterns = [
    path(
        "webhooks/whatsapp/",
        WhatsAppWebhookView.as_view(),
        name="whatsapp-webhook",
    ),
    path(
        "webhooks/email/",
        EmailWebhookView.as_view(),
        name="email-webhook",
    ),
    path(
        "email/poll/",
        GmailPollView.as_view(),
        name="gmail-poll",
    ),
    path(
        "webhooks/telegram/",
        TelegramWebhookView.as_view(),
        name="telegram-webhook",
    ),
    path(
        "webhooks/messenger/",
        MessengerWebhookView.as_view(),
        name="messenger-webhook",
    ),
]
