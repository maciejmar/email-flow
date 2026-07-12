from pydantic import BaseModel


class ProcessInboxResponse(BaseModel):
    processed_messages: int
    inquiries_created: int
    estimates_created: int
    replies_prepared: int

