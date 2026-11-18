from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.deps import (
    DbSession,
    get_current_staff,
    get_staff_admin,
    require_platform_api_key,
    school_id_from,
)
from app.models.enums import Board
from app.schemas.school import (
    EmbedLinkResponse,
    EmbedResolveResponse,
    SchoolOnboardRequest,
    SchoolResponse,
    SchoolSearchResponse,
    SchoolUpdateRequest,
    StaffCreateRequest,
    StaffResponse,
)
from app.services.school_service import SchoolService

router = APIRouter(prefix="/schools", tags=["schools"])


@router.get("/search", response_model=SchoolSearchResponse)
async def search_schools(
    db: DbSession,
    board: Board | None = Query(default=None),
    area: str | None = Query(default=None),
    name: str | None = Query(default=None),
    school_type: str | None = Query(default=None),
    city: str | None = Query(default=None),
    state: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    board_val = board.value if board else None
    items, total = await SchoolService(db).search(
        board=board_val, area=area, name=name,
        school_type=school_type, city=city, state=state,
        limit=limit, offset=offset,
    )
    return SchoolSearchResponse(
        items=[SchoolResponse.model_validate(s) for s in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/resolve-embed", response_model=EmbedResolveResponse)
async def resolve_embed(token: str, db: DbSession):
    school, _ = await SchoolService(db).resolve_embed(token)
    return EmbedResolveResponse(
        school_id=school.id,
        school=SchoolResponse.model_validate(school),
    )


@router.post(
    "/onboard",
    response_model=SchoolResponse,
    dependencies=[Depends(require_platform_api_key)],
)
async def onboard_school(body: SchoolOnboardRequest, db: DbSession):
    school = await SchoolService(db).onboard(body)
    return SchoolResponse.model_validate(school)


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(school_id: UUID, db: DbSession):
    school = await SchoolService(db).get(school_id)
    return SchoolResponse.model_validate(school)


@router.post(
    "/{school_id}/staff",
    response_model=StaffResponse,
    dependencies=[Depends(require_platform_api_key)],
)
async def add_staff(school_id: UUID, body: StaffCreateRequest, db: DbSession):
    staff = await SchoolService(db).add_staff(school_id, body)
    return StaffResponse.model_validate(staff)


@router.put(
    "/{school_id}/activate",
    response_model=SchoolResponse,
    dependencies=[Depends(require_platform_api_key)],
)
async def activate_school(school_id: UUID, db: DbSession):
    school = await SchoolService(db).activate(school_id)
    return SchoolResponse.model_validate(school)


@router.get(
    "/{school_id}/embed-link",
    response_model=EmbedLinkResponse,
    dependencies=[Depends(require_platform_api_key)],
)
async def embed_link(school_id: UUID, db: DbSession):
    data = await SchoolService(db).get_embed_link(school_id)
    return EmbedLinkResponse(**data)


@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: UUID,
    body: SchoolUpdateRequest,
    db: DbSession,
    staff: Annotated[dict, Depends(get_staff_admin)],
):
    school = await SchoolService(db).update(school_id, body, school_id_from(staff))
    return SchoolResponse.model_validate(school)
