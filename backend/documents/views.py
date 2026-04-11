from rest_framework import permissions, viewsets

from .models import Document, Pipeline, ProcessingJob
from .serializers import DocumentSerializer, PipelineSerializer, ProcessingJobSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_workspace_ids = self.request.user.workspace_memberships.values_list(
            "workspace_id", flat=True
        )
        return Document.objects.filter(workspace_id__in=user_workspace_ids)

    def perform_create(self, serializer):
        document = serializer.save(uploaded_by=self.request.user)
        from ai.tasks import process_document_task
        process_document_task.delay(str(document.id))


class PipelineViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_workspace_ids = self.request.user.workspace_memberships.values_list(
            "workspace_id", flat=True
        )
        return Pipeline.objects.filter(workspace_id__in=user_workspace_ids)


class ProcessingJobViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_workspace_ids = self.request.user.workspace_memberships.values_list(
            "workspace_id", flat=True
        )
        return ProcessingJob.objects.filter(
            document__workspace_id__in=user_workspace_ids
        )
