from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.application_school import ApplicationSchool
from app.models.school import School
from app.utils.errors import AppError


class CompareService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def compare_schools(self, school_ids: list[UUID]) -> list[dict]:
        if len(school_ids) > 4:
            raise AppError(400, "Maximum 4 schools can be compared")
        if not school_ids:
            raise AppError(400, "At least one school ID is required")

        result = await self.db.execute(
            select(School).where(School.id.in_(school_ids))
        )
        schools = result.scalars().all()

        return [
            {
                "id": str(s.id),
                "name": s.name,
                "board": s.board,
                "area": s.area,
                "city": s.city,
                "status": s.status,
                "facilities": s.facilities or [],
                "fee_range": s.fee_range,
                "student_teacher_ratio": s.student_teacher_ratio,
                "grades_offered": s.grades_offered or [],
                "contact_email": s.contact_email,
                "phone": s.phone,
            }
            for s in schools
        ]

    async def get_eligible_schools(
        self, grade: str | None, parent_id: UUID
    ) -> list[dict]:
        result = await self.db.execute(
            select(School).where(School.status.in_(["active", "inactive"]))
        )
        schools = result.scalars().all()

        app_result = await self.db.execute(
            select(ApplicationSchool.school_id).join(Application).where(
                Application.parent_id == parent_id
            )
        )
        applied_school_ids = {row[0] for row in app_result.all()}

        items = []
        for s in schools:
            grades = s.grades_offered or []
            grade_available = not grade or grade in grades or not grades
            items.append(
                {
                    "id": str(s.id),
                    "name": s.name,
                    "board": s.board,
                    "area": s.area,
                    "city": s.city,
                    "status": s.status,
                    "fee_range": s.fee_range,
                    "grades_offered": grades,
                    "already_applied": s.id in applied_school_ids,
                    "grade_available": grade_available,
                }
            )
        return items
