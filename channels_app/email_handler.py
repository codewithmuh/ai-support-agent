import base64
import logging
from email.mime.text import MIMEText
from typing import Optional

from django.conf import settings
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .unified import UnifiedMessage

logger = logging.getLogger(__name__)

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]


def get_gmail_service():
    """
    Create and return an authenticated Gmail API service instance.

    Tries database credentials first (from team Gmail config via OAuth),
    then falls back to file-based credentials from .env.
    """
    import json

    # Try database credentials first (OAuth tokens from dashboard)
    try:
        from teams.models import TeamGmailConfig

        gmail_config = TeamGmailConfig.objects.filter(is_active=True).first()
        if gmail_config and gmail_config.credentials_json:
            token_data = json.loads(gmail_config.credentials_json)
            creds = Credentials(
                token=token_data.get("access_token"),
                refresh_token=token_data.get("refresh_token"),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=gmail_config.google_client_id or getattr(settings, "GOOGLE_CLIENT_ID", ""),
                client_secret=gmail_config.google_client_secret or getattr(settings, "GOOGLE_CLIENT_SECRET", ""),
                scopes=GMAIL_SCOPES,
            )

            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                # Update stored token
                new_token_data = {
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "token_uri": creds.token_uri,
                    "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                    "scopes": list(creds.scopes or []),
                }
                gmail_config.credentials_json = json.dumps(new_token_data)
                gmail_config.save(update_fields=["credentials_json", "updated_at"])

            service = build("gmail", "v1", credentials=creds)
            return service
    except Exception as exc:
        logger.warning("Failed to use database Gmail credentials: %s", exc)

    # Fall back to file-based credentials
    credentials_path = getattr(settings, "GOOGLE_CREDENTIALS_PATH", "")
    token_path = getattr(settings, "GOOGLE_TOKEN_PATH", "token.json")

    if not credentials_path:
        raise ValueError(
            "Gmail not configured. Connect Gmail via Settings > Gmail in the dashboard, "
            "or set GOOGLE_CREDENTIALS_PATH in your .env file."
        )

    creds = None
    try:
        creds = Credentials.from_authorized_user_file(token_path, GMAIL_SCOPES)
    except (FileNotFoundError, ValueError):
        pass

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception:
            logger.warning("Token refresh failed, re-authenticating.")
            creds = None

    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(credentials_path, GMAIL_SCOPES)
        creds = flow.run_local_server(port=0)
        with open(token_path, "w") as token_file:
            token_file.write(creds.to_json())

    service = build("gmail", "v1", credentials=creds)
    return service


def parse_email(email_data: dict) -> UnifiedMessage:
    """
    Convert a Gmail API message resource into a UnifiedMessage.

    Expects the full message resource as returned by
    gmail.users().messages().get(userId="me", id=..., format="full").
    """
    headers = email_data.get("payload", {}).get("headers", [])
    header_map = {h["name"].lower(): h["value"] for h in headers}

    sender_raw = header_map.get("from", "")
    subject = header_map.get("subject", "")
    message_id = email_data.get("id", "")
    thread_id = email_data.get("threadId", "")

    # Parse sender name and email
    sender_name, sender_email = _parse_sender(sender_raw)

    # Extract body text
    body = _extract_body(email_data.get("payload", {}))

    return UnifiedMessage(
        channel="email",
        sender_id=sender_email,
        sender_name=sender_name,
        message=body,
        conversation_id=thread_id,
        metadata={
            "message_id": message_id,
            "thread_id": thread_id,
            "subject": subject,
            "from": sender_raw,
            "to": header_map.get("to", ""),
        },
    )


def send_email_reply(to: str, subject: str, body: str, thread_id: str) -> bool:
    """
    Send an email reply within an existing thread via the Gmail API.

    Args:
        to: Recipient email address.
        subject: Email subject line (will be prefixed with "Re: " if not already).
        body: Plain-text email body.
        thread_id: Gmail thread ID to associate the reply with.

    Returns:
        True on success, False on failure.
    """
    try:
        service = get_gmail_service()

        # Ensure subject has Re: prefix for replies
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"

        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject

        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        email_body = {
            "raw": raw_message,
            "threadId": thread_id,
        }

        sent_message = (
            service.users()
            .messages()
            .send(userId="me", body=email_body)
            .execute()
        )
        logger.info("Email reply sent, message ID: %s", sent_message.get("id"))
        return True

    except HttpError as exc:
        logger.exception("Gmail API error while sending reply: %s", exc)
        return False
    except Exception as exc:
        logger.exception("Failed to send email reply: %s", exc)
        return False


def fetch_unread_emails(max_results: int = 10) -> list[dict]:
    """
    Fetch unread emails from the inbox that arrived since the last poll.

    Uses a timestamp stored in the database (TeamGmailConfig.last_poll_at)
    to only fetch new emails. Falls back to last 5 minutes if no timestamp.

    Returns a list of full Gmail message resources.
    """
    import time
    from django.utils import timezone

    # Get the last poll timestamp
    after_epoch = None
    gmail_config = None
    try:
        from teams.models import TeamGmailConfig

        gmail_config = TeamGmailConfig.objects.filter(is_active=True).first()
        if gmail_config and hasattr(gmail_config, "last_poll_at") and gmail_config.last_poll_at:
            after_epoch = int(gmail_config.last_poll_at.timestamp())
    except Exception:
        pass

    # Default: only check last 5 minutes
    if not after_epoch:
        after_epoch = int(time.time()) - 300

    try:
        service = get_gmail_service()

        # Gmail search query with time filter — "after:" uses epoch seconds
        query = f"is:unread category:primary after:{after_epoch}"

        results = (
            service.users()
            .messages()
            .list(
                userId="me",
                q=query,
                maxResults=max_results,
            )
            .execute()
        )
        messages = results.get("messages", [])

        # Update last poll timestamp
        if gmail_config:
            try:
                gmail_config.last_poll_at = timezone.now()
                gmail_config.save(update_fields=["last_poll_at", "updated_at"])
            except Exception:
                pass  # Field might not exist yet

        if not messages:
            return []

        full_messages = []
        for msg_ref in messages:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=msg_ref["id"], format="full")
                .execute()
            )
            full_messages.append(msg)

        return full_messages

    except HttpError as exc:
        logger.exception("Gmail API error while fetching emails: %s", exc)
        return []
    except Exception as exc:
        logger.exception("Failed to fetch emails: %s", exc)
        return []


def mark_as_read(message_id: str) -> bool:
    """Mark a Gmail message as read by removing the UNREAD label."""
    try:
        service = get_gmail_service()
        service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()
        return True
    except Exception as exc:
        logger.exception("Failed to mark message %s as read: %s", message_id, exc)
        return False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _parse_sender(sender_raw: str) -> tuple[str, str]:
    """
    Parse a raw 'From' header into (name, email).
    Handles formats like:
      - "John Doe <john@example.com>"
      - "john@example.com"
    """
    if "<" in sender_raw and ">" in sender_raw:
        name_part = sender_raw.split("<")[0].strip().strip('"')
        email_part = sender_raw.split("<")[1].split(">")[0].strip()
        return name_part or email_part, email_part
    return sender_raw.strip(), sender_raw.strip()


def _extract_body(payload: dict) -> str:
    """
    Recursively extract plain-text body from a Gmail message payload.
    Falls back to HTML body if no plain text is available.
    """
    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data")

    if mime_type == "text/plain" and body_data:
        return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")

    # Check parts recursively
    parts = payload.get("parts", [])
    plain_text = ""
    html_text = ""

    for part in parts:
        part_mime = part.get("mimeType", "")
        part_data = part.get("body", {}).get("data")

        if part_mime == "text/plain" and part_data:
            plain_text = base64.urlsafe_b64decode(part_data).decode(
                "utf-8", errors="replace"
            )
        elif part_mime == "text/html" and part_data:
            html_text = base64.urlsafe_b64decode(part_data).decode(
                "utf-8", errors="replace"
            )
        elif part.get("parts"):
            # Nested multipart
            nested = _extract_body(part)
            if nested:
                plain_text = plain_text or nested

    return plain_text or html_text or ""
