from rest_framework import serializers

from .models import Document, Pipeline, ProcessingJob


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = "__all__"


class PipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = "__all__"


class ProcessingJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingJob
        fields = "__all__"
