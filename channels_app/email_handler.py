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

    Requires the following Django settings:
      - GOOGLE_CREDENTIALS_PATH: path to the OAuth2 credentials JSON file
      - GOOGLE_TOKEN_PATH: path to store/retrieve the token JSON file

    On first run, this will trigger an OAuth2 consent flow. Subsequent calls
    will use the stored token, refreshing it if expired.
    """
    credentials_path = getattr(settings, "GOOGLE_CREDENTIALS_PATH", "")
    token_path = getattr(settings, "GOOGLE_TOKEN_PATH", "token.json")

    if not credentials_path:
        raise ValueError(
            "GOOGLE_CREDENTIALS_PATH not set in Django settings. "
            "Provide the path to your OAuth2 credentials JSON file."
        )

    creds = None

    # Load existing token
    try:
        creds = Credentials.from_authorized_user_file(token_path, GMAIL_SCOPES)
    except (FileNotFoundError, ValueError):
        pass

    # Refresh or create credentials
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception:
            logger.warning("Token refresh failed, re-authenticating.")
            creds = None

    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(credentials_path, GMAIL_SCOPES)
        creds = flow.run_local_server(port=0)

        # Save the token for future use
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
    Fetch unread emails from the inbox.

    Returns a list of full Gmail message resources.
    """
    try:
        service = get_gmail_service()
        results = (
            service.users()
            .messages()
            .list(
                userId="me",
                q="is:unread category:primary",
                maxResults=max_results,
            )
            .execute()
        )
        messages = results.get("messages", [])
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
