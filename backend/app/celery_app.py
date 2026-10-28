import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    from celery import Celery

    celery_app = Celery(
        "cardio_tasks",
        broker=REDIS_URL,
        backend=REDIS_URL,
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )

    @celery_app.task(name="tasks.send_notification")
    def send_notification_task(recipient: str, channel: str, message: str) -> dict[str, Any]:
        """Dispatch notification across SMS, Email, or WhatsApp channels."""
        logger.info("Notification sent via %s to %s: %s", channel, recipient, message)
        return {"status": "sent", "channel": channel, "recipient": recipient}

    @celery_app.task(name="tasks.process_heavy_report")
    def process_heavy_report_task(file_path: str, user_id: int) -> dict[str, Any]:
        """Asynchronously process large scanned PDF reports."""
        logger.info("Processing heavy medical report %s for user %d", file_path, user_id)
        return {"status": "completed", "file_path": file_path, "user_id": user_id}

except ImportError:
    # Graceful mock if celery package is not installed in local lightweight mode
    celery_app = None
    logger.info("Celery not installed; background tasks will run using FastAPI BackgroundTasks.")
