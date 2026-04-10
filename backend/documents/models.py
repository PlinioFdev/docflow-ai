import uuid

from django.db import models
from django.utils import timezone


class Document(models.Model):
    class DocumentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        REVIEW = "review", "Review"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="documents")
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    doc_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.PENDING)
    uploaded_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Pipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="pipelines")
    name = models.CharField(max_length=255)
    stages = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProcessingJob(models.Model):
    class JobStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        REVIEW = "review", "Review"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="processing_jobs")
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="jobs")
    status = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING)
    result = models.JSONField(default=dict, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Job {self.id} - {self.status}"
