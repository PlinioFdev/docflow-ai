from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

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

    def perform_create(self, serializer):
        workspace = serializer.validated_data.get("workspace")
        user_workspace_ids = self.request.user.workspace_memberships.values_list(
            "workspace_id", flat=True
        )
        if workspace.id not in user_workspace_ids:
            raise PermissionDenied("You are not a member of this workspace.")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        pipeline = self.get_object()

        document_id = request.data.get("document_id")
        if not document_id:
            return Response(
                {"error": "document_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = Document.objects.get(id=document_id, workspace=pipeline.workspace)
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found in this workspace."},
                status=status.HTTP_404_NOT_FOUND,
            )

        job = ProcessingJob.objects.create(
            document=document,
            pipeline=pipeline,
            status=ProcessingJob.JobStatus.PENDING,
        )

        from ai.tasks import process_document_task
        process_document_task.delay(str(document.id), str(job.id))

        return Response(ProcessingJobSerializer(job).data, status=status.HTTP_201_CREATED)


class ProcessingJobViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'patch', 'head', 'options']
    serializer_class = ProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_workspace_ids = self.request.user.workspace_memberships.values_list(
            "workspace_id", flat=True
        )
        return ProcessingJob.objects.filter(
            document__workspace_id__in=user_workspace_ids
        )
