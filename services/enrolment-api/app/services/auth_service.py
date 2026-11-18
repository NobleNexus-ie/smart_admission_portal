from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.enums import ROLE_PERMISSIONS
from app.models.parent import Parent
from app.models.parent_profile import ParentProfile
from app.models.school_staff import SchoolStaff
from app.services.notification_service import notify
from app.utils.errors import AppError
from app.utils.tokens import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    create_staff_setup_token,
    create_verification_token,
    hash_password,
    safe_decode_token,
    validate_password_strength,
    verify_password,
)

settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, email: str, password: str) -> Parent:
        errors = validate_password_strength(password)
        if errors:
            raise AppError(422, "; ".join(errors))

        existing = await self.db.scalar(select(Parent).where(Parent.email == email.lower()))
        if existing:
            raise AppError(409, "An account with this email already exists")

        parent = Parent(
            email=email.lower(),
            password_hash=hash_password(password),
            is_verified=False,
        )
        self.db.add(parent)
        await self.db.flush()

        token = create_verification_token(parent.id, parent.email)
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        await notify(
            self.db,
            template="verify_email",
            recipient_email=parent.email,
            variables={"verify_url": verify_url},
            metadata={"parent_id": str(parent.id), "event_type": "verify_email"},
        )
        return parent

    async def verify_email(self, token: str) -> Parent:
        payload = safe_decode_token(token)
        if not payload or payload.get("purpose") != "email_verify":
            raise AppError(410, "Verification link expired. Request a new one.")

        parent_id = payload.get("sub")
        parent = await self.db.get(Parent, UUID(parent_id))
        if not parent:
            raise AppError(404, "Parent not found")
        if parent.is_verified:
            return parent

        parent.is_verified = True
        parent.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return parent

    async def login_parent(self, email: str, password: str) -> dict:
        parent = await self.db.scalar(
            select(Parent)
            .options(selectinload(Parent.profile))
            .where(Parent.email == email.lower())
        )
        if not parent or not verify_password(password, parent.password_hash):
            raise AppError(401, "Invalid email or password")
        if not parent.is_verified:
            raise AppError(403, "Please verify your email first")

        profile_complete = bool(parent.profile and parent.profile.profile_complete)
        claims = {
            "sub": str(parent.id),
            "role": "parent",
            "email": parent.email,
            "profile_complete": profile_complete,
        }
        return {
            "access_token": create_access_token(claims),
            "refresh_token": create_refresh_token(str(parent.id), "parent"),
            "token_type": "bearer",
            "user": {
                "id": str(parent.id),
                "email": parent.email,
                "is_verified": parent.is_verified,
                "role": "parent",
            },
        }

    async def refresh(self, refresh_token: str) -> dict:
        payload = safe_decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise AppError(401, "Invalid refresh token")

        role = payload.get("role")
        sub = payload.get("sub")
        if role == "parent":
            parent = await self.db.scalar(
                select(Parent)
                .options(selectinload(Parent.profile))
                .where(Parent.id == UUID(sub))
            )
            if not parent:
                raise AppError(401, "Invalid refresh token")
            profile_complete = bool(parent.profile and parent.profile.profile_complete)
            claims = {
                "sub": str(parent.id),
                "role": "parent",
                "email": parent.email,
                "profile_complete": profile_complete,
            }
            return {
                "access_token": create_access_token(claims),
                "refresh_token": create_refresh_token(str(parent.id), "parent"),
                "token_type": "bearer",
            }

        staff = await self.db.get(SchoolStaff, UUID(sub))
        if not staff or not staff.password_hash:
            raise AppError(401, "Invalid refresh token")
        claims = {
            "sub": str(staff.id),
            "role": staff.role,
            "school_id": str(staff.school_id),
            "permissions": staff.permissions or ROLE_PERMISSIONS.get(staff.role, []),
            "email": staff.email,
        }
        return {
            "access_token": create_access_token(claims),
            "refresh_token": create_refresh_token(str(staff.id), staff.role),
            "token_type": "bearer",
        }

    async def login_staff(self, email: str, password: str) -> dict:
        staff = await self.db.scalar(
            select(SchoolStaff).where(SchoolStaff.email == email.lower())
        )
        if not staff or not staff.password_hash:
            raise AppError(401, "Invalid email or password")
        if not verify_password(password, staff.password_hash):
            raise AppError(401, "Invalid email or password")

        permissions = staff.permissions or ROLE_PERMISSIONS.get(staff.role, [])
        claims = {
            "sub": str(staff.id),
            "role": staff.role,
            "school_id": str(staff.school_id),
            "permissions": permissions,
            "email": staff.email,
        }
        return {
            "access_token": create_access_token(claims),
            "refresh_token": create_refresh_token(str(staff.id), staff.role),
            "token_type": "bearer",
            "user": {
                "id": str(staff.id),
                "email": staff.email,
                "name": staff.name,
                "school_id": str(staff.school_id),
                "role": staff.role,
            },
        }

    async def setup_staff(self, token: str, password: str) -> SchoolStaff:
        staff = await self.db.scalar(
            select(SchoolStaff).where(SchoolStaff.setup_token == token)
        )
        if not staff:
            raise AppError(410, "Setup link expired or invalid")
        if staff.setup_token_expires_at and staff.setup_token_expires_at < datetime.now(
            timezone.utc
        ):
            raise AppError(410, "Setup link expired or invalid")

        staff.password_hash = hash_password(password)
        staff.setup_token = None
        staff.setup_token_expires_at = None
        await self.db.flush()
        return staff

    async def forgot_password(self, email: str) -> None:
        parent = await self.db.scalar(select(Parent).where(Parent.email == email.lower()))
        if not parent:
            return
        token = create_password_reset_token(parent.id, parent.email)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await notify(
            self.db,
            template="password_reset",
            recipient_email=parent.email,
            variables={"reset_url": reset_url},
            metadata={"parent_id": str(parent.id), "event_type": "password_reset"},
        )

    async def reset_password(self, token: str, new_password: str) -> Parent:
        payload = safe_decode_token(token)
        if not payload or payload.get("purpose") != "password_reset":
            raise AppError(410, "Password reset link is invalid or has expired")

        errors = validate_password_strength(new_password)
        if errors:
            raise AppError(422, "; ".join(errors))

        parent_id = payload.get("sub")
        parent = await self.db.get(Parent, UUID(parent_id))
        if not parent:
            raise AppError(404, "Account not found")

        parent.password_hash = hash_password(new_password)
        parent.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return parent

    @staticmethod
    def issue_setup_token() -> tuple[str, datetime]:
        token = create_staff_setup_token()
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        return token, expires
