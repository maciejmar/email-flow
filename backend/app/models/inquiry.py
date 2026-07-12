from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InquiryStatus(str, Enum):
    new = "new"
    estimated = "estimated"
    answered = "answered"
    ignored = "ignored"


class Inquiry(Base):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    email_from: Mapped[str] = mapped_column(String(255))
    email_subject: Mapped[str] = mapped_column(String(500))
    email_body: Mapped[str] = mapped_column(Text)
    source_message_id: Mapped[str] = mapped_column(String(255), index=True)
    classification_reason: Mapped[str] = mapped_column(Text, default="")
    draft_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[InquiryStatus] = mapped_column(
        SqlEnum(InquiryStatus), default=InquiryStatus.new
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user = relationship("User", back_populates="inquiries")
    estimate = relationship("Estimate", back_populates="inquiry", uselist=False)
