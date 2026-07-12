from pydantic import BaseModel


class PricingUploadResponse(BaseModel):
    imported_products: int

