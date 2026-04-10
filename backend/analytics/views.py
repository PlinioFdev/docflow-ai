from rest_framework import permissions, viewsets

from .models import AnalyticsEvent
from .serializers import AnalyticsEventSerializer


class AnalyticsEventViewSet(viewsets.ModelViewSet):
    queryset = AnalyticsEvent.objects.all()
    serializer_class = AnalyticsEventSerializer
    permission_classes = [permissions.IsAuthenticated]
