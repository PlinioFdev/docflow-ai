import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Document(models.Model):
    class DocType(models.TextChoices):
        INVOICE = "invoice", "Invoice"
        CONTRACT = "contract", "Contract"
        REPORT = "report", "Report"
        OTHER = "other", "Other"

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
    doc_type = models.CharField(max_length=20, choices=DocType.choices, default=DocType.OTHER)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.PENDING)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_documents",
    )
    uploaded_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Pipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="pipelines")
    name = models.CharField(max_length=255)
    stages = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProcessingJob(models.Model):
    class JobStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="processing_jobs")
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )
    status = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING)
    result = models.JSONField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    needs_review = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Job {self.id} - {self.status}"
