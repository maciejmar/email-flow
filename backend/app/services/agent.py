from decimal import Decimal
from typing import TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.estimate import Estimate, EstimateLine
from app.models.inquiry import Inquiry, InquiryStatus
from app.models.product import Product
from app.models.user import User
from app.services.email_mcp import EmailMessage, MCPEmailClient, UserMailboxSettings
from app.services.pricing import find_matching_products


class AgentState(TypedDict):
    user: User
    inbox: list[EmailMessage]
    inquiries_created: int
    estimates_created: int
    replies_prepared: int


def is_customer_inquiry(message: EmailMessage) -> tuple[bool, str]:
    content = f"{message.subject}\n{message.body}".lower()
    keywords = ["wycena", "oferta", "kosztorys", "prosze o wycene", "zapytanie"]
    if any(keyword in content for keyword in keywords):
        return True, "Wiadomosc zawiera slowa kluczowe wskazujace na zapytanie ofertowe."
    return False, "Brak wzorcow sugerujacych zapytanie klienta."


def build_email_client(user: User) -> MCPEmailClient:
    mailbox_settings = UserMailboxSettings.from_user(user)
    return MCPEmailClient(mailbox_settings=mailbox_settings, poll_limit=settings.email_poll_limit)


def fetch_inbox(state: AgentState) -> AgentState:
    client = build_email_client(state["user"])
    state["inbox"] = client.fetch_messages()
    return state


def process_messages(state: AgentState, db: Session) -> AgentState:
    client = build_email_client(state["user"])
    for message in state["inbox"]:
        exists = db.scalar(
            select(Inquiry).where(
                Inquiry.user_id == state["user"].id,
                Inquiry.source_message_id == message.message_id,
            )
        )
        if exists:
            continue

        is_inquiry, reason = is_customer_inquiry(message)
        if not is_inquiry:
            continue

        inquiry = Inquiry(
            user_id=state["user"].id,
            email_from=message.sender,
            email_subject=message.subject,
            email_body=message.body,
            source_message_id=message.message_id,
            classification_reason=reason,
            status=InquiryStatus.new,
        )
        db.add(inquiry)
        db.flush()
        state["inquiries_created"] += 1

        matched_products = find_matching_products(db, state["user"].id, message.body)
        if matched_products:
            estimate = build_estimate(inquiry, matched_products)
            db.add(estimate)
            inquiry.status = InquiryStatus.estimated
            inquiry.draft_reply = compose_reply(estimate)
            client.prepare_reply(message, inquiry.draft_reply)
            state["estimates_created"] += 1
            state["replies_prepared"] += 1

    db.commit()
    return state


def build_estimate(inquiry: Inquiry, products: list[Product]) -> Estimate:
    estimate = Estimate(inquiry=inquiry, notes="Automatyczny kosztorys wygenerowany z cennika.")
    total = Decimal("0.00")
    for product in products:
        quantity = extract_quantity(inquiry.email_body, product.sku)
        line_total = product.price * quantity
        total += line_total
        estimate.lines.append(
            EstimateLine(
                product_name=product.name,
                sku=product.sku,
                quantity=quantity,
                unit=product.unit,
                unit_price=product.price,
                line_total=line_total,
            )
        )
    estimate.total_net = total
    return estimate


def extract_quantity(body: str, token: str) -> int:
    words = body.replace(",", " ").split()
    for index, word in enumerate(words[:-1]):
        if words[index + 1].lower() == token.lower():
            try:
                return max(int(word), 1)
            except ValueError:
                return 1
    return 1


def compose_reply(estimate: Estimate) -> str:
    lines = [
        "Dzien dobry,",
        "",
        "Dziekujemy za zapytanie. Ponizej przesylamy wstepny kosztorys:",
        "",
    ]
    for line in estimate.lines:
        lines.append(
            f"- {line.product_name} ({line.sku}): {line.quantity} x {line.unit_price} PLN = {line.line_total} PLN"
        )
    lines.extend(
        [
            "",
            f"Suma netto: {estimate.total_net} {estimate.currency}",
            "",
            "W razie potrzeby mozemy doprecyzowac zakres oferty.",
        ]
    )
    return "\n".join(lines)


def build_graph(db: Session):
    graph = StateGraph(AgentState)
    graph.add_node("fetch_inbox", fetch_inbox)
    graph.add_node("process_messages", lambda state: process_messages(state, db))
    graph.set_entry_point("fetch_inbox")
    graph.add_edge("fetch_inbox", "process_messages")
    graph.add_edge("process_messages", END)
    return graph.compile()


def process_inbox(db: Session, user: User) -> dict[str, int]:
    app = build_graph(db)
    result = app.invoke(
        {
            "user": user,
            "inbox": [],
            "inquiries_created": 0,
            "estimates_created": 0,
            "replies_prepared": 0,
        }
    )
    return {
        "processed_messages": len(result["inbox"]),
        "inquiries_created": result["inquiries_created"],
        "estimates_created": result["estimates_created"],
        "replies_prepared": result["replies_prepared"],
    }

