from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_preference import NotificationPreference


class NotificationPreferenceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_or_create(self, parent_id: UUID) -> NotificationPreference:
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.parent_id == parent_id
            )
        )
        pref = result.scalar_one_or_none()
        if not pref:
            pref = NotificationPreference(parent_id=parent_id)
            self.db.add(pref)
            await self.db.flush()
        return pref

    async def update(
        self, parent_id: UUID, data: dict
    ) -> NotificationPreference:
        pref = await self.get_or_create(parent_id)
        for key, value in data.items():
            if value is not None and hasattr(pref, key):
                setattr(pref, key, value)
        await self.db.flush()
        return pref
