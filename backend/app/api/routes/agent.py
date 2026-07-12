from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.agent import ProcessInboxResponse
from app.services.agent import process_inbox

router = APIRouter()


@router.post("/process-inbox", response_model=ProcessInboxResponse)
def process_inbox_route(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ProcessInboxResponse:
    result = process_inbox(db, current_user)
    return ProcessInboxResponse(**result)

