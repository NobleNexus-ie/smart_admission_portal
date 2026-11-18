from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.deps import DbSession, get_current_parent, parent_id_from
from app.schemas.parent import ParentProfileResponse, ParentProfileUpdate
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/parents", tags=["parents"])


@router.get("/profile", response_model=ParentProfileResponse)
async def get_profile(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ProfileService(db).get_profile(parent_id_from(current))


@router.put("/profile", response_model=ParentProfileResponse)
async def update_profile(
    body: ParentProfileUpdate,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ProfileService(db).update_profile(parent_id_from(current), body)


@router.post("/profile/id-proof", response_model=ParentProfileResponse)
async def upload_id_proof(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
    file: UploadFile = File(...),
    id_proof_type: str | None = Form(default=None),
):
    return await ProfileService(db).upload_id_proof(
        parent_id_from(current), file, id_proof_type
    )


@router.get("/dashboard")
async def dashboard(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ProfileService(db).dashboard(parent_id_from(current))
