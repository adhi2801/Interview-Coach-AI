# backend/mailer.py
# Sends plain-text email over SMTP, so any provider works (Resend, Postmark,
# SendGrid, SES, a Gmail app password). Configure with SMTP_HOST, SMTP_PORT
# (default 587, STARTTLS), SMTP_USERNAME, SMTP_PASSWORD and MAIL_FROM.

import os
import smtplib
from email.message import EmailMessage

import structlog

logger = structlog.get_logger()


def is_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("MAIL_FROM"))


def send_email(to: str, subject: str, body: str) -> bool:
    """Returns whether the message was handed to the SMTP server. Never
    raises: callers run this in the background after responding."""
    if not is_configured():
        logger.warning("email_not_configured", subject=subject)
        return False
    message = EmailMessage()
    message["From"] = os.getenv("MAIL_FROM")
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", "587")), timeout=15) as smtp:
            smtp.starttls()
            if os.getenv("SMTP_USERNAME"):
                smtp.login(os.getenv("SMTP_USERNAME"), os.getenv("SMTP_PASSWORD", ""))
            smtp.send_message(message)
        return True
    except Exception as e:  # noqa: BLE001 — logged, and the user can ask again
        logger.error("email_send_failed", subject=subject, error=str(e))
        return False
