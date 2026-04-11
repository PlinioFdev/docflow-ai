import logging

from asgiref.sync import async_to_sync
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


def _notify_ws(workspace_id: str, job) -> None:
    """Push a job status update to all WebSocket clients in the workspace group."""
    from documents.consumers import DocumentConsumer

    job_data = {
        "id": str(job.id),
        "document_id": str(job.document_id),
        "pipeline_id": str(job.pipeline_id) if job.pipeline_id else None,
        "status": job.status,
        "confidence_score": job.confidence_score,
        "needs_review": job.needs_review,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }
    try:
        async_to_sync(DocumentConsumer.send_job_update)(workspace_id, job_data)
    except Exception:
        logger.warning("WebSocket notify failed for job %s", job.id)


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

    workspace_id = str(document.workspace_id)

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

    _notify_ws(workspace_id, job)

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

        _notify_ws(workspace_id, job)

    except Exception:
        logger.exception("Error processing document %s", document_id)
        job.status = ProcessingJob.JobStatus.FAILED
        job.completed_at = timezone.now()
        job.save()

        document.status = Document.DocumentStatus.FAILED
        document.save(update_fields=["status", "updated_at"])

        _notify_ws(workspace_id, job)
