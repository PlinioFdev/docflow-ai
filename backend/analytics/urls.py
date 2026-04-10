from rest_framework.routers import DefaultRouter

from .views import AnalyticsEventViewSet

router = DefaultRouter()
router.register(r"events", AnalyticsEventViewSet, basename="analytics-event")

urlpatterns = router.urls
