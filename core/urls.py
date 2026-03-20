from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("process/", views.ProcessMessageView.as_view(), name="process-message"),
    path("knowledge/", views.KnowledgeBaseListCreateView.as_view(), name="knowledge-list-create"),
    path("conversations/", views.ConversationListView.as_view(), name="conversation-list"),
    path("conversations/<uuid:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<uuid:pk>/toggle-human-only/", views.ToggleHumanOnlyView.as_view(), name="toggle-human-only"),
    # Scale features
    path("tags/", views.TagListCreateView.as_view(), name="tag-list-create"),
    path("tags/<uuid:pk>/", views.TagDeleteView.as_view(), name="tag-delete"),
    path("conversations/<uuid:conversation_id>/notes/", views.InternalNoteCreateView.as_view(), name="internal-note-create"),
    path("canned-responses/", views.CannedResponseListCreateView.as_view(), name="canned-response-list-create"),
    path("canned-responses/<uuid:pk>/", views.CannedResponseUpdateDeleteView.as_view(), name="canned-response-update-delete"),
    path("search/", views.ConversationSearchView.as_view(), name="conversation-search"),
    path("bulk-actions/", views.BulkActionView.as_view(), name="bulk-actions"),
    path("knowledge-base/upload/", views.KnowledgeBaseUploadView.as_view(), name="knowledge-base-upload"),
]
