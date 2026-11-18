from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.application import Application
from app.models.application_school import ApplicationSchool
from app.models.enums import ApplicationSchoolStatus
from app.models.school import School
from app.models.school_staff import SchoolStaff
from app.services.notification_service import notify
from app.utils.errors import AppError

logger = logging.getLogger(__name__)
settings = get_settings()


class MultiSubmitService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def submit_to_multiple(
        self,
        application_id: UUID,
        school_ids: list[UUID],
        parent_id: UUID,
    ) -> list[dict]:
        result = await self.db.execute(
            select(Application).where(
                Application.id == application_id,
                Application.parent_id == parent_id,
            )
        )
        app = result.scalar_one_or_none()
        if not app:
            raise AppError(404, "Application not found")
        if app.status not in ("draft", "submitted"):
            raise AppError(400, "Application cannot be submitted in its current state")

        school_result = await self.db.execute(
            select(School).where(School.id.in_(school_ids), School.status == "active")
        )
        schools = {s.id: s for s in school_result.scalars().all()}

        if len(schools) != len(school_ids):
            missing = set(school_ids) - set(schools.keys())
            raise AppError(400, f"Some schools are not active or do not exist: {missing}")

        existing = await self.db.execute(
            select(ApplicationSchool.school_id).where(
                ApplicationSchool.application_id == application_id,
                ApplicationSchool.school_id.in_(school_ids),
            )
        )
        existing_ids = {row[0] for row in existing.all()}
        if existing_ids:
            raise AppError(
                400,
                f"Application already submitted to some schools",
            )

        now = datetime.now(timezone.utc)
        submitted = []
        for sid in school_ids:
            app_school = ApplicationSchool(
                application_id=application_id,
                school_id=sid,
                status=ApplicationSchoolStatus.PENDING.value,
                submitted_at=now,
            )
            self.db.add(app_school)
            submitted.append(
                {
                    "school_id": str(sid),
                    "school_name": schools[sid].name,
                    "status": "pending",
                }
            )

        app.status = "submitted"
        app.submitted_at = now
        await self.db.flush()

        student_name = app.form_data.get("student_name", "Student")
        grade = app.form_data.get("grade_applying_for", "N/A")

        for sid in school_ids:
            school = schools[sid]
            staff_result = await self.db.execute(
                select(SchoolStaff).where(SchoolStaff.school_id == sid)
            )
            staff_members = staff_result.scalars().all()
            for staff in staff_members:
                if staff.email:
                    await notify(
                        self.db,
                        template="app_received",
                        recipient_email=staff.email,
                        variables={
                            "student_name": student_name,
                            "grade": grade,
                            "review_url": f"{settings.FRONTEND_URL}/staff/applications",
                        },
                    )

        return submitted
