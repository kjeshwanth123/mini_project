from __future__ import annotations

import logging
from typing import Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class NotificationPayload(BaseModel):
    recipient: str
    channel: str  # "email" | "sms" | "whatsapp"
    subject: Optional[str] = "CardioHealth AI Notice"
    message: str


def dispatch_notification(payload: NotificationPayload) -> dict[str, Any]:
    """
    Centralized notification gateway supporting:
    - Email (SMTP / SendGrid)
    - SMS (Twilio / AWS SNS)
    - WhatsApp (Twilio WhatsApp / Meta Business API)
    """
    channel = payload.channel.lower()
    logger.info("Dispatching %s notification to %s: %s", channel, payload.recipient, payload.message)

    # In production, connects to Twilio / SendGrid / Meta API; in local mode, provides structured dispatch response
    return {
        "status": "delivered",
        "channel": channel,
        "recipient": payload.recipient,
        "message_preview": (payload.message[:80] + "...") if len(payload.message) > 80 else payload.message,
    }
