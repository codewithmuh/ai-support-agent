from django.urls import path

from .views import EmailWebhookView, GmailPollView, WhatsAppWebhookView

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
]
