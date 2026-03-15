from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("process/", views.ProcessMessageView.as_view(), name="process-message"),
    path("knowledge/", views.KnowledgeBaseListCreateView.as_view(), name="knowledge-list-create"),
    path("conversations/", views.ConversationListView.as_view(), name="conversation-list"),
    path("conversations/<uuid:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
]
