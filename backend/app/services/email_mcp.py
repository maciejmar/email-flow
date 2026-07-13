from dataclasses import dataclass
from email import message_from_bytes
from email.header import decode_header, make_header
from email.message import EmailMessage as SMTPEmailMessage
from email.utils import parseaddr
import imaplib
import smtplib

from app.models.user import User


@dataclass
class EmailMessage:
    message_id: str
    sender: str
    subject: str
    body: str


@dataclass
class UserMailboxSettings:
    integration_mode: str
    email_imap_host: str | None
    email_imap_port: int
    email_imap_username: str | None
    email_imap_password: str | None
    email_imap_mailbox: str
    email_imap_use_ssl: bool
    email_imap_search: str
    email_smtp_host: str | None
    email_smtp_port: int
    email_smtp_username: str | None
    email_smtp_password: str | None
    email_smtp_use_ssl: bool
    email_smtp_from: str | None

    @classmethod
    def from_user(cls, user: User) -> "UserMailboxSettings":
        return cls(
            integration_mode=(user.email_integration_mode or "disabled").lower(),
            email_imap_host=user.email_imap_host,
            email_imap_port=user.email_imap_port or 993,
            email_imap_username=user.email_imap_username,
            email_imap_password=user.email_imap_password,
            email_imap_mailbox=user.email_imap_mailbox or "INBOX",
            email_imap_use_ssl=True if user.email_imap_use_ssl is None else bool(user.email_imap_use_ssl),
            email_imap_search=user.email_imap_search or "UNSEEN",
            email_smtp_host=user.email_smtp_host,
            email_smtp_port=user.email_smtp_port or 465,
            email_smtp_username=user.email_smtp_username,
            email_smtp_password=user.email_smtp_password,
            email_smtp_use_ssl=True if user.email_smtp_use_ssl is None else bool(user.email_smtp_use_ssl),
            email_smtp_from=user.email_smtp_from,
        )


class MCPEmailClient:
    def __init__(self, mailbox_settings: UserMailboxSettings, poll_limit: int) -> None:
        self.mailbox_settings = mailbox_settings
        self.poll_limit = poll_limit

    def fetch_messages(self) -> list[EmailMessage]:
        if self.mailbox_settings.integration_mode == "imap":
            return self._fetch_imap_messages()
        return []

    def prepare_reply(self, message: EmailMessage, reply_body: str) -> dict[str, str]:
        payload = {
            "message_id": message.message_id,
            "recipient": message.sender,
            "subject": f"Re: {message.subject}",
            "body": reply_body,
        }
        if self.mailbox_settings.integration_mode == "imap" and self.mailbox_settings.email_smtp_host:
            self._send_smtp_reply(payload)
        return payload

    def _fetch_imap_messages(self) -> list[EmailMessage]:
        self._validate_imap_settings()
        if self.mailbox_settings.email_imap_use_ssl:
            mailbox = imaplib.IMAP4_SSL(self.mailbox_settings.email_imap_host, self.mailbox_settings.email_imap_port)
        else:
            mailbox = imaplib.IMAP4(self.mailbox_settings.email_imap_host, self.mailbox_settings.email_imap_port)
        try:
            mailbox.login(self.mailbox_settings.email_imap_username, self.mailbox_settings.email_imap_password)
            status, _ = mailbox.select(self.mailbox_settings.email_imap_mailbox)
            if status != "OK":
                raise RuntimeError(f"Cannot open mailbox {self.mailbox_settings.email_imap_mailbox}")

            status, data = mailbox.search(None, self.mailbox_settings.email_imap_search)
            if status != "OK":
                raise RuntimeError("Cannot search mailbox")

            message_ids = data[0].split()[-self.poll_limit :]
            messages: list[EmailMessage] = []
            for message_id in message_ids:
                status, payload = mailbox.fetch(message_id, "(RFC822)")
                if status != "OK" or not payload or not payload[0]:
                    continue

                raw_bytes = payload[0][1]
                parsed = message_from_bytes(raw_bytes)
                subject = self._decode_mime_header(parsed.get("Subject", "Bez tematu"))
                sender = parseaddr(parsed.get("From", ""))[1] or parsed.get("From", "unknown")
                body = self._extract_body(parsed)
                external_id = parsed.get("Message-ID") or message_id.decode("ascii", errors="ignore")

                messages.append(
                    EmailMessage(
                        message_id=external_id,
                        sender=sender,
                        subject=subject,
                        body=body,
                    )
                )
            return messages
        finally:
            try:
                mailbox.close()
            except Exception:
                pass
            mailbox.logout()

    def _send_smtp_reply(self, payload: dict[str, str]) -> None:
        self._validate_smtp_settings()
        email_message = SMTPEmailMessage()
        email_message["From"] = self.mailbox_settings.email_smtp_from or self.mailbox_settings.email_smtp_username
        email_message["To"] = payload["recipient"]
        email_message["Subject"] = payload["subject"]
        email_message.set_content(payload["body"])

        if self.mailbox_settings.email_smtp_use_ssl:
            server = smtplib.SMTP_SSL(self.mailbox_settings.email_smtp_host, self.mailbox_settings.email_smtp_port)
        else:
            server = smtplib.SMTP(self.mailbox_settings.email_smtp_host, self.mailbox_settings.email_smtp_port)

        try:
            if not self.mailbox_settings.email_smtp_use_ssl:
                server.starttls()
            server.login(self.mailbox_settings.email_smtp_username, self.mailbox_settings.email_smtp_password)
            server.send_message(email_message)
        finally:
            server.quit()

    def _extract_body(self, parsed_message) -> str:
        if parsed_message.is_multipart():
            html_fallback = ""
            for part in parsed_message.walk():
                content_type = part.get_content_type()
                disposition = str(part.get("Content-Disposition", ""))
                if "attachment" in disposition.lower():
                    continue
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                charset = part.get_content_charset() or "utf-8"
                decoded = payload.decode(charset, errors="replace").strip()
                if content_type == "text/plain" and decoded:
                    return decoded
                if content_type == "text/html" and decoded and not html_fallback:
                    html_fallback = self._strip_html(decoded)
            return html_fallback

        payload = parsed_message.get_payload(decode=True)
        if payload is None:
            return ""
        charset = parsed_message.get_content_charset() or "utf-8"
        decoded = payload.decode(charset, errors="replace").strip()
        if parsed_message.get_content_type() == "text/html":
            return self._strip_html(decoded)
        return decoded

    def _decode_mime_header(self, value: str) -> str:
        try:
            return str(make_header(decode_header(value)))
        except Exception:
            return value

    def _strip_html(self, value: str) -> str:
        text = value.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
        chunks = []
        inside_tag = False
        for char in text:
            if char == "<":
                inside_tag = True
                continue
            if char == ">":
                inside_tag = False
                continue
            if not inside_tag:
                chunks.append(char)
        return "".join(chunks).strip()

    def _validate_imap_settings(self) -> None:
        required = {
            "email_imap_host": self.mailbox_settings.email_imap_host,
            "email_imap_username": self.mailbox_settings.email_imap_username,
            "email_imap_password": self.mailbox_settings.email_imap_password,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Missing mailbox settings for user: {', '.join(missing)}")

    def _validate_smtp_settings(self) -> None:
        required = {
            "email_smtp_host": self.mailbox_settings.email_smtp_host,
            "email_smtp_username": self.mailbox_settings.email_smtp_username,
            "email_smtp_password": self.mailbox_settings.email_smtp_password,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Missing SMTP settings for user: {', '.join(missing)}")

