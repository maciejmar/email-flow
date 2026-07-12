from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Estimate(Base):
    __tablename__ = "estimates"

    id: Mapped[int] = mapped_column(primary_key=True)
    inquiry_id: Mapped[int] = mapped_column(ForeignKey("inquiries.id"), unique=True)
    total_net: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="PLN")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    inquiry = relationship("Inquiry", back_populates="estimate")
    lines = relationship(
        "EstimateLine", back_populates="estimate", cascade="all, delete-orphan"
    )


class EstimateLine(Base):
    __tablename__ = "estimate_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    estimate_id: Mapped[int] = mapped_column(ForeignKey("estimates.id"), index=True)
    product_name: Mapped[str] = mapped_column(String(255))
    sku: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(default=1)
    unit: Mapped[str] = mapped_column(String(50), default="szt.")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    estimate = relationship("Estimate", back_populates="lines")

