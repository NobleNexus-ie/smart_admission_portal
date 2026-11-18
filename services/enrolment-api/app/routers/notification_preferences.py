from typing import Annotated

from fastapi import APIRouter, Depends

from app.deps import DbSession, get_current_parent, parent_id_from
from app.schemas.notification import NotificationPreferenceOut, NotificationPreferenceUpdate
from app.services.notification_preference_service import NotificationPreferenceService

router = APIRouter(prefix="/parents/notification-preferences", tags=["notifications"])


@router.get("", response_model=NotificationPreferenceOut)
async def get_preferences(
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await NotificationPreferenceService(db).get_or_create(parent_id_from(current))


@router.put("", response_model=NotificationPreferenceOut)
async def update_preferences(
    body: NotificationPreferenceUpdate,
    db: DbSession,
    current: Annotated[dict, Depends(get_current_parent)],
):
    return await NotificationPreferenceService(db).update(
        parent_id_from(current),
        body.model_dump(exclude_none=True),
    )
