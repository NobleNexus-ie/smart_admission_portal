from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.deps import DbSession, get_current_parent, parent_id_from
from app.services.compare_service import CompareService

router = APIRouter(prefix="/schools", tags=["schools"])


@router.get("/compare")
async def compare_schools(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
    ids: str = Query(..., description="Comma-separated school UUIDs"),
):
    school_ids = [UUID(s.strip()) for s in ids.split(",") if s.strip()]
    return await CompareService(db).compare_schools(school_ids)


@router.get("/eligible")
async def get_eligible_schools(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
    grade: str | None = Query(default=None),
):
    return await CompareService(db).get_eligible_schools(grade, parent_id_from(current))
