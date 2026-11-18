from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import case, cast, func, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.application_school import ApplicationSchool
from app.models.parent import Parent
from app.models.review_action import ReviewAction
from app.models.school import School

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_school_analytics(self, school_id: UUID) -> dict:
        base = select(ApplicationSchool).where(ApplicationSchool.school_id == school_id)

        total_q = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(total_q)).scalar() or 0

        counts = {}
        for status in ("pending", "approved", "rejected", "info_requested"):
            q = select(func.count()).where(
                ApplicationSchool.school_id == school_id,
                ApplicationSchool.status == status,
            )
            counts[status] = (await self.db.execute(q)).scalar() or 0

        decided = counts["approved"] + counts["rejected"]
        approval_rate = round(counts["approved"] / decided, 2) if decided > 0 else 0.0

        grade_q = (
            select(
                Application.form_data["grade_applying_for"].astext.label("grade"),
                func.count().label("cnt"),
            )
            .join(ApplicationSchool, ApplicationSchool.application_id == Application.id)
            .where(ApplicationSchool.school_id == school_id)
            .group_by("grade")
        )
        grade_result = await self.db.execute(grade_q)
        applications_by_grade = {
            row.grade or "Unknown": row.cnt for row in grade_result.all()
        }

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        daily_q = (
            select(
                cast(ApplicationSchool.submitted_at, String).label("day"),
                func.count().label("cnt"),
            )
            .where(
                ApplicationSchool.school_id == school_id,
                ApplicationSchool.submitted_at >= thirty_days_ago,
            )
            .group_by("day")
            .order_by("day")
        )
        daily_result = await self.db.execute(daily_q)
        applications_over_time = [
            {"date": str(row.day)[:10], "count": row.cnt}
            for row in daily_result.all()
            if row.day
        ]

        avg_q = (
            select(
                func.avg(
                    func.extract(
                        "epoch",
                        ReviewAction.performed_at - ApplicationSchool.submitted_at,
                    )
                    / 3600
                )
            )
            .join(
                ApplicationSchool,
                ReviewAction.application_school_id == ApplicationSchool.id,
            )
            .where(ApplicationSchool.school_id == school_id)
        )
        avg_hours = (await self.db.execute(avg_q)).scalar()

        return {
            "total": total,
            "pending": counts["pending"],
            "approved": counts["approved"],
            "rejected": counts["rejected"],
            "info_requested": counts["info_requested"],
            "approval_rate": approval_rate,
            "avg_response_time_hours": round(avg_hours, 1) if avg_hours else 0,
            "applications_by_grade": applications_by_grade,
            "applications_over_time": applications_over_time,
        }

    async def get_platform_analytics(self) -> dict:
        total_schools = (
            await self.db.execute(select(func.count()).select_from(School))
        ).scalar() or 0
        total_parents = (
            await self.db.execute(select(func.count()).select_from(Parent))
        ).scalar() or 0
        total_apps = (
            await self.db.execute(select(func.count()).select_from(Application))
        ).scalar() or 0

        status_q = select(
            ApplicationSchool.status, func.count()
        ).group_by(ApplicationSchool.status)
        status_result = await self.db.execute(status_q)
        apps_by_status = {row[0]: row[1] for row in status_result.all()}

        school_status_q = select(School.status, func.count()).group_by(School.status)
        school_status_result = await self.db.execute(school_status_q)
        schools_by_status = {row[0]: row[1] for row in school_status_result.all()}

        now = datetime.now(timezone.utc)
        weekly_growth = []
        for i in range(4):
            week_end = now - timedelta(weeks=i)
            week_start = week_end - timedelta(weeks=1)
            new_schools = (
                await self.db.execute(
                    select(func.count()).where(
                        School.created_at >= week_start,
                        School.created_at < week_end,
                    )
                )
            ).scalar() or 0
            new_parents = (
                await self.db.execute(
                    select(func.count()).where(
                        Parent.created_at >= week_start,
                        Parent.created_at < week_end,
                    )
                )
            ).scalar() or 0
            new_apps = (
                await self.db.execute(
                    select(func.count()).where(
                        Application.created_at >= week_start,
                        Application.created_at < week_end,
                    )
                )
            ).scalar() or 0
            weekly_growth.append(
                {
                    "week": f"W-{i}",
                    "week_start": week_start.strftime("%Y-%m-%d"),
                    "new_schools": new_schools,
                    "new_parents": new_parents,
                    "new_applications": new_apps,
                }
            )

        top_q = (
            select(School.name, func.count().label("cnt"))
            .join(ApplicationSchool, ApplicationSchool.school_id == School.id)
            .group_by(School.name)
            .order_by(func.count().desc())
            .limit(10)
        )
        top_result = await self.db.execute(top_q)
        top_schools = [
            {"name": row.name, "applications": row.cnt} for row in top_result.all()
        ]

        return {
            "total_schools": total_schools,
            "total_parents": total_parents,
            "total_applications": total_apps,
            "applications_by_status": apps_by_status,
            "schools_by_status": schools_by_status,
            "weekly_growth": weekly_growth,
            "top_schools_by_applications": top_schools,
        }
