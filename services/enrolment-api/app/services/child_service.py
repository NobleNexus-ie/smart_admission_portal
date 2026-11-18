from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.schemas.parent import ChildCreate, ChildUpdate
from app.utils.errors import AppError


class ChildService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_children(self, parent_id: UUID) -> list[dict]:
        rows = (
            await self.db.scalars(
                select(Child)
                .where(Child.parent_id == parent_id)
                .order_by(Child.created_at)
            )
        ).all()
        return [self._to_dict(c) for c in rows]

    async def get_child(self, parent_id: UUID, child_id: UUID) -> dict:
        child = await self._get(parent_id, child_id)
        return self._to_dict(child)

    async def create_child(self, parent_id: UUID, data: ChildCreate) -> dict:
        child = Child(
            parent_id=parent_id,
            full_name=data.full_name,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            blood_group=data.blood_group,
            nationality=data.nationality,
            mother_tongue=data.mother_tongue,
            previous_school_name=data.previous_school_name,
            previous_board=data.previous_board,
            previous_grade=data.previous_grade,
            previous_marks=data.previous_marks,
            special_needs=data.special_needs,
            medical_conditions=data.medical_conditions,
            allergies=data.allergies,
        )
        self.db.add(child)
        await self.db.flush()
        return self._to_dict(child)

    async def update_child(self, parent_id: UUID, child_id: UUID, data: ChildUpdate) -> dict:
        child = await self._get(parent_id, child_id)
        payload = data.model_dump(exclude_unset=True)
        for key, value in payload.items():
            setattr(child, key, value)
        await self.db.flush()
        return self._to_dict(child)

    async def delete_child(self, parent_id: UUID, child_id: UUID) -> None:
        child = await self._get(parent_id, child_id)
        await self.db.delete(child)
        await self.db.flush()

    async def _get(self, parent_id: UUID, child_id: UUID) -> Child:
        child = await self.db.scalar(
            select(Child).where(Child.id == child_id, Child.parent_id == parent_id)
        )
        if not child:
            raise AppError(404, "Child not found")
        return child

    def _to_dict(self, c: Child) -> dict:
        return {
            "id": c.id,
            "parent_id": c.parent_id,
            "full_name": c.full_name,
            "date_of_birth": c.date_of_birth,
            "gender": c.gender,
            "blood_group": c.blood_group,
            "nationality": c.nationality,
            "mother_tongue": c.mother_tongue,
            "previous_school_name": c.previous_school_name,
            "previous_board": c.previous_board,
            "previous_grade": c.previous_grade,
            "previous_marks": c.previous_marks,
            "special_needs": c.special_needs,
            "medical_conditions": c.medical_conditions,
            "allergies": c.allergies,
            "created_at": c.created_at,
        }
