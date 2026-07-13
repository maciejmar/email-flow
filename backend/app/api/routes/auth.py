from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import MailboxSettingsRead, MailboxSettingsUpdate, TokenResponse, UserCreate, UserRead
from app.services.auth import create_access_token, get_password_hash, verify_password

router = APIRouter()


def serialize_mailbox_settings(user: User) -> MailboxSettingsRead:
    return MailboxSettingsRead(
        integration_mode=user.email_integration_mode or "disabled",
        email_imap_host=user.email_imap_host,
        email_imap_port=user.email_imap_port or 993,
        email_imap_username=user.email_imap_username,
        email_imap_mailbox=user.email_imap_mailbox or "INBOX",
        email_imap_use_ssl=True if user.email_imap_use_ssl is None else bool(user.email_imap_use_ssl),
        email_imap_search=user.email_imap_search or "UNSEEN",
        email_smtp_host=user.email_smtp_host,
        email_smtp_port=user.email_smtp_port or 465,
        email_smtp_username=user.email_smtp_username,
        email_smtp_use_ssl=True if user.email_smtp_use_ssl is None else bool(user.email_smtp_use_ssl),
        email_smtp_from=user.email_smtp_from,
        has_imap_password=bool(user.email_imap_password),
        has_smtp_password=bool(user.email_smtp_password),
    )


def serialize_user(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        mailbox_settings=serialize_mailbox_settings(user),
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == form_data.username.lower()))
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return serialize_user(current_user)


@router.get("/mailbox", response_model=MailboxSettingsRead)
def get_mailbox_settings(current_user: User = Depends(get_current_user)) -> MailboxSettingsRead:
    return serialize_mailbox_settings(current_user)


@router.put("/mailbox", response_model=MailboxSettingsRead)
def update_mailbox_settings(
    payload: MailboxSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MailboxSettingsRead:
    current_user.email_integration_mode = payload.integration_mode
    current_user.email_imap_host = payload.email_imap_host
    current_user.email_imap_port = payload.email_imap_port
    current_user.email_imap_username = payload.email_imap_username
    current_user.email_imap_mailbox = payload.email_imap_mailbox
    current_user.email_imap_use_ssl = payload.email_imap_use_ssl
    current_user.email_imap_search = payload.email_imap_search
    current_user.email_smtp_host = payload.email_smtp_host
    current_user.email_smtp_port = payload.email_smtp_port
    current_user.email_smtp_username = payload.email_smtp_username
    current_user.email_smtp_use_ssl = payload.email_smtp_use_ssl
    current_user.email_smtp_from = payload.email_smtp_from

    if payload.email_imap_password is not None and payload.email_imap_password != "":
        current_user.email_imap_password = payload.email_imap_password
    if payload.email_smtp_password is not None and payload.email_smtp_password != "":
        current_user.email_smtp_password = payload.email_smtp_password

    if payload.integration_mode == "imap":
        missing = []
        if not current_user.email_imap_host:
            missing.append("email_imap_host")
        if not current_user.email_imap_username:
            missing.append("email_imap_username")
        if not current_user.email_imap_password:
            missing.append("email_imap_password")
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing mailbox fields: {', '.join(missing)}")

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return serialize_mailbox_settings(current_user)

