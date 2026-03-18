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
    path("team/whatsapp/", views.WhatsAppConfigView.as_view(), name="whatsapp-config"),
    path("team/gmail/", views.GmailConfigView.as_view(), name="gmail-config"),
    path("team/telegram/", views.TelegramConfigView.as_view(), name="telegram-config"),
]
