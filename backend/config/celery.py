import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("docflow")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks(['ai'])


@app.task(bind=True)
def debug_task(self):
    return f"Request: {self.request!r}"
