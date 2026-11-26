from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.deps import DbSession, get_current_staff, get_staff_admin, school_id_from, staff_id_from
from app.schemas.school import SchoolResponse, SchoolUpdateRequest, StaffCreateRequest, StaffResponse
from app.services.school_service import SchoolService
from app.utils.errors import AppError

from sqlalchemy import select
from app.models.school_staff import SchoolStaff

router = APIRouter(prefix="/staff/school", tags=["staff-school"])


@router.get("", response_model=SchoolResponse)
async def get_own_school(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_staff)],
):
    return await SchoolService(db).get(school_id_from(current))


@router.put("", response_model=SchoolResponse)
async def update_own_school(
    body: SchoolUpdateRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_staff_admin)],
):
    sid = school_id_from(current)
    return await SchoolService(db).update(sid, body, sid)


@router.get("/members", response_model=list[StaffResponse])
async def list_staff(
    db: DbSession,
    current: Annotated[dict, Depends(get_staff_admin)],
):
    sid = school_id_from(current)
    members = (
        await db.scalars(
            select(SchoolStaff)
            .where(SchoolStaff.school_id == sid)
            .order_by(SchoolStaff.created_at.desc())
        )
    ).all()
    return members


@router.post("/members", response_model=StaffResponse, status_code=201)
async def invite_staff(
    body: StaffCreateRequest,
    db: DbSession,
    current: Annotated[dict, Depends(get_staff_admin)],
):
    sid = school_id_from(current)
    return await SchoolService(db).add_staff(sid, body)


@router.delete("/members/{member_id}", status_code=204)
async def remove_staff(
    member_id: UUID,
    db: DbSession,
    current: Annotated[dict, Depends(get_staff_admin)],
):
    sid = school_id_from(current)
    my_id = staff_id_from(current)
    staff = await db.scalar(
        select(SchoolStaff).where(
            SchoolStaff.id == member_id,
            SchoolStaff.school_id == sid,
        )
    )
    if not staff:
        raise AppError(404, "Staff member not found")
    if staff.id == my_id:
        raise AppError(400, "You cannot remove yourself")
    await db.delete(staff)
    await db.flush()
