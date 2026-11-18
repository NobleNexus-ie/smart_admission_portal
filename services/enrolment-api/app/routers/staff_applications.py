from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.deps import DbSession, get_current_staff, school_id_from, staff_id_from
from app.schemas.common import PaginatedResponse
from app.schemas.review import (
    ApproveRequest,
    RejectRequest,
    RequestInfoBody,
    StaffApplicationDetail,
    StaffApplicationListItem,
)
from app.services.review_service import ReviewService

router = APIRouter(prefix="/staff/applications", tags=["staff-applications"])


@router.get("", response_model=PaginatedResponse[StaffApplicationListItem])
async def list_staff_applications(
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    items, total = await ReviewService(db).list_applications(
        school_id=school_id_from(staff),
        status=status,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(
        items=[StaffApplicationListItem(**i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{application_id}", response_model=StaffApplicationDetail)
async def get_staff_application(
    application_id: UUID,
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
):
    data = await ReviewService(db).get_application(
        application_id, school_id_from(staff)
    )
    return StaffApplicationDetail(**data)


@router.post("/{application_id}/approve", response_model=StaffApplicationDetail)
async def approve(
    application_id: UUID,
    body: ApproveRequest,
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
):
    data = await ReviewService(db).approve(
        application_id=application_id,
        school_id=school_id_from(staff),
        staff_id=staff_id_from(staff),
        permissions=staff.get("permissions"),
        notes=body.notes,
    )
    return StaffApplicationDetail(**data)


@router.post("/{application_id}/reject", response_model=StaffApplicationDetail)
async def reject(
    application_id: UUID,
    body: RejectRequest,
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
):
    data = await ReviewService(db).reject(
        application_id=application_id,
        school_id=school_id_from(staff),
        staff_id=staff_id_from(staff),
        permissions=staff.get("permissions"),
        reason=body.reason,
        notes=body.notes,
    )
    return StaffApplicationDetail(**data)


@router.post("/{application_id}/request-info", response_model=StaffApplicationDetail)
async def request_info(
    application_id: UUID,
    body: RequestInfoBody,
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
):
    data = await ReviewService(db).request_info(
        application_id=application_id,
        school_id=school_id_from(staff),
        staff_id=staff_id_from(staff),
        permissions=staff.get("permissions"),
        fields_requested=body.fields_requested,
        documents_requested=body.documents_requested,
        message=body.message,
    )
    return StaffApplicationDetail(**data)
