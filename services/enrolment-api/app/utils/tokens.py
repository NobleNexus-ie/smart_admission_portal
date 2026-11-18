import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def validate_password_strength(password: str) -> list[str]:
    errors: list[str] = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number")
    return errors


def create_access_token(claims: dict[str, Any], expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {**claims, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(sub: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": sub, "role": role, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def create_verification_token(parent_id: UUID | str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {
        "sub": str(parent_id),
        "email": email,
        "purpose": "email_verify",
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_staff_setup_token() -> str:
    return secrets.token_urlsafe(32)


def create_embed_token(school_id: UUID | str) -> str:
    """HMAC-signed embed token: school_id.issued_at.signature"""
    issued_at = str(int(datetime.now(timezone.utc).timestamp()))
    sid = str(school_id)
    message = f"{sid}.{issued_at}"
    signature = hmac.new(
        settings.JWT_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{sid}.{issued_at}.{signature}"


def verify_embed_token(token: str) -> str | None:
    """Return school_id if token is valid, else None."""
    parts = token.split(".")
    if len(parts) != 3:
        return None
    sid, issued_at, signature = parts
    message = f"{sid}.{issued_at}"
    expected = hmac.new(
        settings.JWT_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    return sid


def create_password_reset_token(parent_id: UUID | str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {
        "sub": str(parent_id),
        "email": email,
        "purpose": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def safe_decode_token(token: str) -> dict[str, Any] | None:
    try:
        return decode_token(token)
    except JWTError:
        return None
