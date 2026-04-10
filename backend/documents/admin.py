from django.contrib import admin

from .models import Document, Pipeline, ProcessingJob


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "doc_type", "status", "uploaded_at")
    list_filter = ("status", "doc_type")
    search_fields = ("name",)


@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "created_at")
    search_fields = ("name",)


@admin.register(ProcessingJob)
class ProcessingJobAdmin(admin.ModelAdmin):
    list_display = ("document", "pipeline", "status", "confidence_score", "created_at", "completed_at")
    list_filter = ("status",)
