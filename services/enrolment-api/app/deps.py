from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db
from app.utils.errors import AppError
from app.utils.tokens import safe_decode_token

security = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def _extract_payload(
    credentials: HTTPAuthorizationCredentials | None,
) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise AppError(401, "Not authenticated")
    payload = safe_decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise AppError(401, "Invalid or expired token")
    return payload


async def get_current_parent(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict[str, Any]:
    payload = _extract_payload(credentials)
    if payload.get("role") != "parent":
        raise AppError(403, "Parent access required")
    return payload


async def get_current_staff(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict[str, Any]:
    payload = _extract_payload(credentials)
    role = payload.get("role")
    if role not in ("school_admin", "reviewer", "viewer"):
        raise AppError(403, "Staff access required")
    if not payload.get("school_id"):
        raise AppError(403, "Staff school scope missing")
    return payload


async def get_staff_admin(
    staff: Annotated[dict[str, Any], Depends(get_current_staff)],
) -> dict[str, Any]:
    if staff.get("role") != "school_admin":
        raise AppError(403, "School admin access required")
    return staff


async def require_platform_api_key(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> None:
    settings = get_settings()
    if not x_api_key or x_api_key != settings.PLATFORM_API_KEY:
        raise AppError(401, "Invalid platform API key")


def parent_id_from(payload: dict[str, Any]) -> UUID:
    return UUID(payload["sub"])


def staff_id_from(payload: dict[str, Any]) -> UUID:
    return UUID(payload["sub"])


def school_id_from(payload: dict[str, Any]) -> UUID:
    return UUID(payload["school_id"])
