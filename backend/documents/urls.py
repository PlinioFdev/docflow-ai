from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, PipelineViewSet, ProcessingJobViewSet

router = DefaultRouter()
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"pipelines", PipelineViewSet, basename="pipeline")
router.register(r"processing-jobs", ProcessingJobViewSet, basename="processingjob")

urlpatterns = router.urls
