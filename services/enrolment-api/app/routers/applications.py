from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.deps import DbSession, get_current_parent, parent_id_from
from app.models.enums import DocumentCategory
from app.schemas.application import (
    ApplicationCreateRequest,
    ApplicationResponse,
    ApplicationUpdateRequest,
    DocumentOut,
    InfoRequestOut,
    RespondInfoRequest,
)
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationResponse)
async def create_application(
    body: ApplicationCreateRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ApplicationService(db).create(
        parent_id_from(current), body.school_id, body.form_data
    )


@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ApplicationService(db).list_for_parent(parent_id_from(current))


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ApplicationService(db).get(application_id, parent_id_from(current))


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    body: ApplicationUpdateRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ApplicationService(db).update(
        application_id, parent_id_from(current), body.form_data
    )


@router.post("/{application_id}/documents", response_model=DocumentOut)
async def upload_document(
    application_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
    file: UploadFile = File(...),
    category: DocumentCategory = Form(...),
):
    return await ApplicationService(db).upload_document(
        application_id, parent_id_from(current), category, file
    )


@router.put("/{application_id}/submit", response_model=ApplicationResponse)
async def submit_application(
    application_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ApplicationService(db).submit(application_id, parent_id_from(current))


@router.post("/{application_id}/respond-info", response_model=ApplicationResponse)
async def respond_info(
    application_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
    info_request_id: UUID = Form(...),
    response_data: str = Form(default="{}"),
    files: list[UploadFile] | None = File(default=None),
    categories: list[str] | None = Form(default=None),
):
    import json

    try:
        data = json.loads(response_data) if response_data else {}
    except json.JSONDecodeError:
        data = {}

    file_pairs: list[tuple[str, UploadFile]] = []
    if files:
        if len(files) > 5:
            from app.utils.errors import AppError
            raise AppError(422, "Maximum 5 files per response")
        cats = categories or ["other"] * len(files)
        for i, f in enumerate(files):
            cat = cats[i] if i < len(cats) else "other"
            file_pairs.append((cat, f))

    return await ApplicationService(db).respond_info(
        application_id,
        parent_id_from(current),
        info_request_id,
        data,
        file_pairs or None,
    )


@router.get("/{application_id}/info-requests", response_model=list[InfoRequestOut])
async def list_info_requests(
    application_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await ApplicationService(db).list_info_requests(
        application_id, parent_id_from(current)
    )
