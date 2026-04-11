import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def process_document_task(document_id: str, job_id: str = None):
    from documents.models import Document, ProcessingJob
    from ai.processor import DocumentProcessor
    from documents.pipeline_runner import PipelineRunner

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error("Document %s not found", document_id)
        return

    document.status = Document.DocumentStatus.PROCESSING
    document.save(update_fields=["status", "updated_at"])

    if job_id:
        try:
            job = ProcessingJob.objects.get(id=job_id)
        except ProcessingJob.DoesNotExist:
            logger.error("ProcessingJob %s not found", job_id)
            document.status = Document.DocumentStatus.FAILED
            document.save(update_fields=["status", "updated_at"])
            return
        job.status = ProcessingJob.JobStatus.PROCESSING
        job.save(update_fields=["status"])
    else:
        job = ProcessingJob.objects.create(
            document=document,
            status=ProcessingJob.JobStatus.PROCESSING,
        )

    try:
        if job.pipeline:
            runner = PipelineRunner(job.pipeline, document)
            result = runner.run()
        else:
            processor = DocumentProcessor()
            result = processor.extract_fields(document.file.path, document.doc_type)

        overall_confidence = result.get("overall_confidence", 0.0)
        needs_review = overall_confidence < 0.8

        job.status = ProcessingJob.JobStatus.COMPLETED
        job.result = result
        job.confidence_score = overall_confidence
        job.needs_review = needs_review
        job.completed_at = timezone.now()
        job.save()

        document.status = (
            Document.DocumentStatus.REVIEW if needs_review else Document.DocumentStatus.COMPLETED
        )
        document.save(update_fields=["status", "updated_at"])

    except Exception:
        logger.exception("Error processing document %s", document_id)
        job.status = ProcessingJob.JobStatus.FAILED
        job.completed_at = timezone.now()
        job.save()

        document.status = Document.DocumentStatus.FAILED
        document.save(update_fields=["status", "updated_at"])
