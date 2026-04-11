from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView
from workspaces.views import CustomTokenObtainPairView

from documents.urls import router as documents_router

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("workspaces.urls")),
    path("api/v1/auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/", include(documents_router.urls)),
    path("api/analytics/", include("analytics.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
