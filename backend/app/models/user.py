from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    email_integration_mode: Mapped[str] = mapped_column(String(20), default="disabled", server_default="disabled")
    email_imap_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_imap_port: Mapped[int] = mapped_column(Integer, default=993, server_default="993")
    email_imap_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_imap_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_imap_mailbox: Mapped[str] = mapped_column(String(255), default="INBOX", server_default="INBOX")
    email_imap_use_ssl: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    email_imap_search: Mapped[str] = mapped_column(String(255), default="UNSEEN", server_default="UNSEEN")
    email_smtp_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_smtp_port: Mapped[int] = mapped_column(Integer, default=465, server_default="465")
    email_smtp_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_smtp_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_smtp_use_ssl: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    email_smtp_from: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inquiries = relationship("Inquiry", back_populates="user")
    products = relationship("Product", back_populates="user")
