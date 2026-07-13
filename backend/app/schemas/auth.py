from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=512)


class MailboxSettingsRead(BaseModel):
    integration_mode: str
    email_imap_host: str | None
    email_imap_port: int
    email_imap_username: str | None
    email_imap_mailbox: str
    email_imap_use_ssl: bool
    email_imap_search: str
    email_smtp_host: str | None
    email_smtp_port: int
    email_smtp_username: str | None
    email_smtp_use_ssl: bool
    email_smtp_from: str | None
    has_imap_password: bool
    has_smtp_password: bool


class MailboxSettingsUpdate(BaseModel):
    integration_mode: str = Field(default="disabled", pattern="^(disabled|imap)$")
    email_imap_host: str | None = Field(default=None, max_length=255)
    email_imap_port: int = Field(default=993, ge=1, le=65535)
    email_imap_username: str | None = Field(default=None, max_length=255)
    email_imap_password: str | None = Field(default=None, max_length=512)
    email_imap_mailbox: str = Field(default="INBOX", min_length=1, max_length=255)
    email_imap_use_ssl: bool = True
    email_imap_search: str = Field(default="UNSEEN", min_length=1, max_length=255)
    email_smtp_host: str | None = Field(default=None, max_length=255)
    email_smtp_port: int = Field(default=465, ge=1, le=65535)
    email_smtp_username: str | None = Field(default=None, max_length=255)
    email_smtp_password: str | None = Field(default=None, max_length=512)
    email_smtp_use_ssl: bool = True
    email_smtp_from: str | None = Field(default=None, max_length=255)


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    mailbox_settings: MailboxSettingsRead

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
