from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.estimate import Estimate
from app.models.inquiry import Inquiry
from app.models.user import User
from app.schemas.inquiry import InquiryRead

router = APIRouter()


@router.get("", response_model=list[InquiryRead])
def list_inquiries(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Inquiry]:
    query = (
        select(Inquiry)
        .where(Inquiry.user_id == current_user.id)
        .options(selectinload(Inquiry.estimate).selectinload(Estimate.lines))
        .order_by(Inquiry.created_at.desc())
    )
    return list(db.scalars(query).unique())
