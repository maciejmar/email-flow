from fastapi import APIRouter

from app.api.routes import agent, auth, inquiries, pricing

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(inquiries.router, prefix="/inquiries", tags=["inquiries"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])

