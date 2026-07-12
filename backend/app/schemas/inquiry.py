from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.inquiry import InquiryStatus


class EstimateLineRead(BaseModel):
    id: int
    product_name: str
    sku: str
    quantity: int
    unit: str
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class EstimateRead(BaseModel):
    id: int
    total_net: Decimal
    currency: str
    notes: str
    lines: list[EstimateLineRead]

    model_config = ConfigDict(from_attributes=True)


class InquiryRead(BaseModel):
    id: int
    email_from: str
    email_subject: str
    email_body: str
    classification_reason: str
    draft_reply: str | None
    status: InquiryStatus
    created_at: datetime
    estimate: EstimateRead | None

    model_config = ConfigDict(from_attributes=True)

