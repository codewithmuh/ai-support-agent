from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

urlpatterns = [
    path("privacy/", TemplateView.as_view(template_name="privacy.html"), name="privacy"),
    path("terms/", TemplateView.as_view(template_name="terms.html"), name="terms"),
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("channels_app.urls")),
    path("api/", include("escalation.urls")),
]
