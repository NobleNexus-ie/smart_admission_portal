from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import DbSession, get_current_staff, require_platform_api_key, school_id_from
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["analytics"])


@router.get("/staff/analytics")
async def staff_analytics(
    db: DbSession,
    staff: Annotated[dict, Depends(get_current_staff)],
):
    data = await AnalyticsService(db).get_school_analytics(school_id_from(staff))
    return data


@router.get("/platform/analytics")
async def platform_analytics(
    db: DbSession,
    _: Annotated[None, Depends(require_platform_api_key)],
):
    data = await AnalyticsService(db).get_platform_analytics()
    return data
