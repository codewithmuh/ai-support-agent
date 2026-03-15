from django.urls import path

from .views import (
    ConversationReplyView,
    DashboardStatsView,
    EscalationDetailView,
    EscalationListView,
    EscalationResolveView,
)

urlpatterns = [
    path("escalations/", EscalationListView.as_view(), name="escalation-list"),
    path(
        "escalations/<uuid:pk>/",
        EscalationDetailView.as_view(),
        name="escalation-detail",
    ),
    path(
        "escalations/<uuid:pk>/resolve/",
        EscalationResolveView.as_view(),
        name="escalation-resolve",
    ),
    path(
        "conversations/<uuid:pk>/reply/",
        ConversationReplyView.as_view(),
        name="conversation-reply",
    ),
    path("escalations/dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
]
