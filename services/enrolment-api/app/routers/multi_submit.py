from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.deps import DbSession, get_current_parent, parent_id_from
from app.services.multi_submit_service import MultiSubmitService

router = APIRouter(prefix="/applications", tags=["applications"])


class MultiSubmitRequest(BaseModel):
    application_id: UUID
    school_ids: list[UUID] = Field(max_length=10)


@router.post("/submit-multi")
async def submit_multi(
    body: MultiSubmitRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    result = await MultiSubmitService(db).submit_to_multiple(
        body.application_id, body.school_ids, parent_id_from(current)
    )
    return {"message": "Application submitted successfully", "schools": result}
