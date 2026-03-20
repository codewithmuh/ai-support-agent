from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "teams"

urlpatterns = [
    # Auth
    path("auth/signup/", views.SignupView.as_view(), name="signup"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    # Team
    path("team/", views.TeamDetailView.as_view(), name="team-detail"),
    path("team/ai/", views.AIConfigView.as_view(), name="ai-config"),
    path("team/whatsapp/", views.WhatsAppConfigView.as_view(), name="whatsapp-config"),
    path("team/whatsapp/test/", views.WhatsAppTestView.as_view(), name="whatsapp-test"),
    path("team/gmail/", views.GmailConfigView.as_view(), name="gmail-config"),
    path("team/telegram/", views.TelegramConfigView.as_view(), name="telegram-config"),
    path("team/messenger/", views.MessengerConfigView.as_view(), name="messenger-config"),
    # Gmail OAuth
    path("auth/gmail/init/", views.GmailOAuthInitView.as_view(), name="gmail-oauth-init"),
    path("auth/gmail/callback/", views.GmailOAuthCallbackView.as_view(), name="gmail-oauth-callback"),
]
