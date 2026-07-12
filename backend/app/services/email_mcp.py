from dataclasses import dataclass

from app.core.config import settings


@dataclass
class EmailMessage:
    message_id: str
    sender: str
    subject: str
    body: str


class MCPEmailClient:
    def fetch_messages(self) -> list[EmailMessage]:
        if settings.email_mcp_mode == "mock":
            return [
                EmailMessage(
                    message_id="mock-1",
                    sender="klient@example.com",
                    subject="Prośba o wycenę regałów magazynowych",
                    body=(
                        "Dzień dobry, proszę o wycenę 3 regałów RACK-01 "
                        "oraz 10 półek SHELF-02. Proszę o odpowiedź mailową."
                    ),
                ),
                EmailMessage(
                    message_id="mock-2",
                    sender="newsletter@example.com",
                    subject="Nowości produktowe",
                    body="To nie jest zapytanie ofertowe.",
                ),
            ]
        return []

    def prepare_reply(self, message: EmailMessage, reply_body: str) -> dict[str, str]:
        return {
            "message_id": message.message_id,
            "recipient": message.sender,
            "subject": f"Re: {message.subject}",
            "body": reply_body,
        }

