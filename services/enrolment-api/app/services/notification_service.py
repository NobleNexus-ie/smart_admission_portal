from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import NotificationStatus
from app.models.notification import Notification
from app.services.email_client import get_email_client
from app.utils.email_templates import render_template

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.email = get_email_client()

    async def send(
        self,
        *,
        template: str,
        recipient_email: str,
        variables: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> Notification:
        subject, html, text = render_template(template, variables)
        notification = Notification(
            recipient_email=recipient_email,
            template=template,
            status=NotificationStatus.QUEUED.value,
            metadata_=metadata or {},
        )
        self.db.add(notification)
        await self.db.flush()

        statuses = [
            NotificationStatus.SENT.value,
            NotificationStatus.RETRY_1.value,
            NotificationStatus.RETRY_2.value,
            NotificationStatus.RETRY_3.value,
            NotificationStatus.FAILED.value,
        ]
        last_error: Exception | None = None
        for attempt, status in enumerate(statuses):
            try:
                msg_id = await self.email.send(
                    to=recipient_email,
                    subject=subject,
                    html=html,
                    text=text,
                )
                notification.status = NotificationStatus.SENT.value
                notification.resend_id = msg_id
                notification.sent_at = datetime.now(timezone.utc)
                await self.db.flush()
                return notification
            except Exception as exc:
                last_error = exc
                notification.status = status if attempt < 3 else NotificationStatus.FAILED.value
                await self.db.flush()
                if attempt < 3:
                    await asyncio.sleep(1)
                else:
                    logger.error(
                        "Email failed after retries template=%s to=%s: %s",
                        template,
                        recipient_email,
                        last_error,
                    )
        return notification


async def notify(
    db: AsyncSession,
    template: str,
    recipient_email: str,
    variables: dict[str, Any],
    metadata: dict[str, Any] | None = None,
) -> Notification:
    return await NotificationService(db).send(
        template=template,
        recipient_email=recipient_email,
        variables=variables,
        metadata=metadata,
    )
