"""SMTP email client (Mailpit locally; Resend-compatible interface)."""

from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)


class EmailClient:
    """Resend-compatible send interface over SMTP."""

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str | None = None,
    ) -> str | None:
        """Send email via SMTP. Returns a message id-like string on success."""
        settings = get_settings()
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        try:
            response = await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                start_tls=False,
            )
            # aiosmtplib returns (response_dict, message_id) or similar
            message_id = None
            if isinstance(response, tuple) and len(response) >= 2:
                message_id = str(response[1]) if response[1] else None
            logger.info("Email sent to %s subject=%s", to, subject)
            return message_id or f"smtp-{to}"
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to, exc)
            raise


_email_client: EmailClient | None = None


def get_email_client() -> EmailClient:
    global _email_client
    if _email_client is None:
        _email_client = EmailClient()
    return _email_client
