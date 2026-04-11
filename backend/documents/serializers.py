from rest_framework import serializers

from .models import Document, Pipeline, ProcessingJob


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ("id", "status", "uploaded_at", "updated_at")


class PipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = "__all__"


class ProcessingJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingJob
        fields = "__all__"
        read_only_fields = (
            "id",
            "document",
            "pipeline",
            "status",
            "result",
            "confidence_score",
            "needs_review",
            "created_at",
            "completed_at",
        )
