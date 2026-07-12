from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.pricing import PricingUploadResponse
from app.services.pricing import import_price_list

router = APIRouter()


@router.post("/upload", response_model=PricingUploadResponse)
async def upload_pricing(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PricingUploadResponse:
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")

    content = await file.read()
    count = import_price_list(db, content, current_user.id)
    return PricingUploadResponse(imported_products=count)

