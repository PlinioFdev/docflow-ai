from rest_framework.routers import DefaultRouter

from .views import WorkspaceViewSet, WorkspaceMemberViewSet

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")
router.register(r"members", WorkspaceMemberViewSet, basename="workspace-member")

urlpatterns = router.urls
