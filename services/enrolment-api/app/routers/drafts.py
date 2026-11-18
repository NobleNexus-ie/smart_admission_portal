from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import DbSession, get_current_parent, parent_id_from
from app.models.application import Application
from app.utils.errors import AppError

router = APIRouter(prefix="/applications", tags=["applications"])


class AutoSaveRequest(BaseModel):
    form_data: dict[str, Any]


@router.put("/{application_id}/auto-save")
async def auto_save_draft(
    application_id: UUID,
    body: AutoSaveRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.parent_id == parent_id_from(current),
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise AppError(404, "Application not found")
    if app.status != "draft":
        raise AppError(400, "Only draft applications can be auto-saved")

    app.form_data = {**(app.form_data or {}), **body.form_data}
    await db.flush()

    return {
        "message": "Draft saved",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
