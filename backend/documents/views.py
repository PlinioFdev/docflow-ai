from rest_framework import permissions, viewsets

from .models import Document, Pipeline, ProcessingJob
from .serializers import DocumentSerializer, PipelineSerializer, ProcessingJobSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]


class PipelineViewSet(viewsets.ModelViewSet):
    queryset = Pipeline.objects.all()
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProcessingJobViewSet(viewsets.ModelViewSet):
    queryset = ProcessingJob.objects.all()
    serializer_class = ProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]
