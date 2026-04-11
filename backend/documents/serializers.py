from rest_framework import serializers

from .models import Document, Pipeline, ProcessingJob

_VALID_STAGE_TYPES = {"extract", "validate", "transform", "deliver"}


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = ("id", "status", "uploaded_at", "updated_at")


class PipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = ("id", "workspace", "name", "stages", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_stages(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("stages must be a list.")

        for i, stage in enumerate(value):
            if not isinstance(stage, dict):
                raise serializers.ValidationError(f"Stage {i} must be an object.")

            if "type" not in stage:
                raise serializers.ValidationError(f"Stage {i} is missing 'type'.")
            if stage["type"] not in _VALID_STAGE_TYPES:
                raise serializers.ValidationError(
                    f"Stage {i} type '{stage['type']}' must be one of: "
                    + ", ".join(sorted(_VALID_STAGE_TYPES)) + "."
                )

            if "name" not in stage or not isinstance(stage["name"], str) or not stage["name"].strip():
                raise serializers.ValidationError(f"Stage {i} must have a non-empty string 'name'.")

            if "config" not in stage or not isinstance(stage["config"], dict):
                raise serializers.ValidationError(f"Stage {i} must have a dict 'config'.")

        return value


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
