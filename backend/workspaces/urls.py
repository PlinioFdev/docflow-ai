from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import RegisterView, WorkspaceMemberViewSet, WorkspaceViewSet

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")
router.register(r"members", WorkspaceMemberViewSet, basename="workspace-member")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
] + router.urls
