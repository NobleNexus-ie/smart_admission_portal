from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.application import Application
from app.models.application_school import ApplicationSchool
from app.models.enums import ApplicationSchoolStatus, ReviewActionType
from app.models.info_request import InfoRequest
from app.models.parent import Parent
from app.models.parent_profile import ParentProfile
from app.models.review_action import ReviewAction
from app.models.school import School
from app.models.school_staff import SchoolStaff
from app.services.document_service import DocumentService
from app.services.notification_service import notify
from app.utils.errors import AppError
from app.utils.signed_urls import generate_signed_url

settings = get_settings()


class ReviewService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _require_act_permission(self, permissions: list[str] | None) -> None:
        perms = permissions or []
        allowed = {"applications:act", "approve", "reject", "request_info", "review"}
        if not allowed.intersection(perms):
            raise AppError(403, "You do not have permission to perform this action")

    async def _get_scoped_app_school(
        self, application_id: UUID, school_id: UUID
    ) -> ApplicationSchool:
        """School scope enforced at SERVICE layer."""
        asch = await self.db.scalar(
            select(ApplicationSchool)
            .options(
                selectinload(ApplicationSchool.application).selectinload(Application.parent).selectinload(Parent.profile),
                selectinload(ApplicationSchool.application).selectinload(Application.documents),
                selectinload(ApplicationSchool.school),
                selectinload(ApplicationSchool.review_actions).selectinload(ReviewAction.performer),
                selectinload(ApplicationSchool.info_requests).selectinload(InfoRequest.response),
            )
            .where(
                ApplicationSchool.application_id == application_id,
                ApplicationSchool.school_id == school_id,
            )
        )
        if not asch:
            raise AppError(403, "You do not have access to this application")
        return asch

    async def list_applications(
        self,
        school_id: UUID,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        q = (
            select(ApplicationSchool)
            .options(
                selectinload(ApplicationSchool.application).selectinload(Application.parent),
            )
            .where(ApplicationSchool.school_id == school_id)
        )
        if status:
            q = q.where(ApplicationSchool.status == status)

        rows = list((await self.db.scalars(q.order_by(ApplicationSchool.submitted_at.desc().nullslast()))).all())
        total = len(rows)
        page = rows[offset : offset + limit]

        items = []
        for asch in page:
            form = (asch.application.form_data or {}) if asch.application else {}
            items.append(
                {
                    "application_school_id": asch.id,
                    "application_id": asch.application_id,
                    "school_id": asch.school_id,
                    "status": asch.status,
                    "submitted_at": asch.submitted_at,
                    "student_name": form.get("student_full_name"),
                    "grade": form.get("grade_applying_for"),
                    "parent_email": asch.application.parent.email if asch.application and asch.application.parent else None,
                }
            )
        return items, total

    async def get_application(self, application_id: UUID, school_id: UUID) -> dict:
        asch = await self._get_scoped_app_school(application_id, school_id)
        app = asch.application
        parent = app.parent
        profile = parent.profile if parent else None

        profile_out = None
        if profile:
            id_url = None
            if profile.id_proof_url:
                try:
                    id_url = generate_signed_url(profile.id_proof_url)
                except Exception:
                    id_url = profile.id_proof_url
            profile_out = {
                "id": profile.id,
                "parent_id": profile.parent_id,
                "full_name": profile.full_name,
                "phone": profile.phone,
                "address": profile.address,
                "city": profile.city,
                "state": profile.state,
                "id_proof_type": profile.id_proof_type,
                "id_proof_url": id_url,
                "profile_complete": profile.profile_complete,
                "updated_at": profile.updated_at,
            }

        history = [
            {
                "id": ra.id,
                "action": ra.action,
                "reason": ra.reason,
                "notes": ra.notes,
                "performed_by": ra.performed_by,
                "performer_name": ra.performer.name if ra.performer else None,
                "performed_at": ra.performed_at,
            }
            for ra in sorted(asch.review_actions, key=lambda x: x.performed_at or datetime.min.replace(tzinfo=timezone.utc))
        ]

        info_reqs = [
            {
                "id": ir.id,
                "fields_requested": ir.fields_requested,
                "documents_requested": ir.documents_requested,
                "message": ir.message,
                "status": ir.status,
                "created_at": ir.created_at,
                "has_response": ir.response is not None,
                "response_data": ir.response.response_data if ir.response else None,
            }
            for ir in asch.info_requests
        ]

        docs = [DocumentService.to_out(d) for d in (app.documents or [])]

        return {
            "application": {
                "id": app.id,
                "parent_id": app.parent_id,
                "form_data": app.form_data or {},
                "status": app.status,
                "method": app.method,
                "created_at": app.created_at,
                "submitted_at": app.submitted_at,
                "updated_at": app.updated_at,
                "schools": [
                    {
                        "id": asch.id,
                        "school_id": asch.school_id,
                        "school_name": asch.school.name if asch.school else None,
                        "status": asch.status,
                        "submitted_at": asch.submitted_at,
                        "reviewed_at": asch.reviewed_at,
                    }
                ],
                "documents": docs,
            },
            "parent_email": parent.email if parent else "",
            "parent_profile": profile_out,
            "review_history": history,
            "info_requests": info_reqs,
            "documents": docs,
        }

    async def approve(
        self,
        application_id: UUID,
        school_id: UUID,
        staff_id: UUID,
        permissions: list[str] | None,
        notes: str | None = None,
    ) -> dict:
        self._require_act_permission(permissions)
        asch = await self._get_scoped_app_school(application_id, school_id)
        if asch.status not in (
            ApplicationSchoolStatus.PENDING.value,
            ApplicationSchoolStatus.INFO_REQUESTED.value,
        ):
            raise AppError(409, "Application status has changed")

        now = datetime.now(timezone.utc)
        asch.status = ApplicationSchoolStatus.APPROVED.value
        asch.reviewed_at = now

        action = ReviewAction(
            application_school_id=asch.id,
            performed_by=staff_id,
            action=ReviewActionType.APPROVED.value,
            notes=notes,
        )
        self.db.add(action)
        await self.db.flush()

        app = asch.application
        school = asch.school
        parent = app.parent
        student_name = (app.form_data or {}).get("student_full_name", "Student")
        if parent and school:
            await notify(
                self.db,
                template="app_approved",
                recipient_email=parent.email,
                variables={
                    "student_name": student_name,
                    "school_name": school.name,
                    "app_url": f"{settings.FRONTEND_URL}/enrolment/applications/{app.id}",
                },
                metadata={
                    "application_id": str(app.id),
                    "school_id": str(school.id),
                    "event_type": "app_approved",
                },
            )
        return await self.get_application(application_id, school_id)

    async def reject(
        self,
        application_id: UUID,
        school_id: UUID,
        staff_id: UUID,
        permissions: list[str] | None,
        reason: str,
        notes: str | None = None,
    ) -> dict:
        self._require_act_permission(permissions)
        if len(reason.strip()) < 10:
            raise AppError(
                422,
                "Please provide a more detailed reason (at least 10 characters)",
            )

        asch = await self._get_scoped_app_school(application_id, school_id)
        if asch.status not in (
            ApplicationSchoolStatus.PENDING.value,
            ApplicationSchoolStatus.INFO_REQUESTED.value,
        ):
            raise AppError(409, "Application status has changed")

        now = datetime.now(timezone.utc)
        asch.status = ApplicationSchoolStatus.REJECTED.value
        asch.reviewed_at = now

        action = ReviewAction(
            application_school_id=asch.id,
            performed_by=staff_id,
            action=ReviewActionType.REJECTED.value,
            reason=reason.strip(),
            notes=notes,
        )
        self.db.add(action)
        await self.db.flush()

        app = asch.application
        school = asch.school
        parent = app.parent
        student_name = (app.form_data or {}).get("student_full_name", "Student")
        if parent and school:
            await notify(
                self.db,
                template="app_rejected",
                recipient_email=parent.email,
                variables={
                    "student_name": student_name,
                    "school_name": school.name,
                    "reason": reason.strip(),
                    "app_url": f"{settings.FRONTEND_URL}/enrolment/applications/{app.id}",
                },
                metadata={
                    "application_id": str(app.id),
                    "school_id": str(school.id),
                    "event_type": "app_rejected",
                },
            )
        return await self.get_application(application_id, school_id)

    async def request_info(
        self,
        application_id: UUID,
        school_id: UUID,
        staff_id: UUID,
        permissions: list[str] | None,
        fields_requested: list[str],
        documents_requested: list[str],
        message: str,
    ) -> dict:
        self._require_act_permission(permissions)
        asch = await self._get_scoped_app_school(application_id, school_id)
        if asch.status not in (
            ApplicationSchoolStatus.PENDING.value,
            ApplicationSchoolStatus.INFO_REQUESTED.value,
        ):
            raise AppError(409, "Application status has changed")

        now = datetime.now(timezone.utc)
        asch.status = ApplicationSchoolStatus.INFO_REQUESTED.value
        asch.reviewed_at = now

        info_req = InfoRequest(
            application_school_id=asch.id,
            created_by=staff_id,
            fields_requested=fields_requested or [],
            documents_requested=documents_requested or [],
            message=message,
        )
        self.db.add(info_req)

        action = ReviewAction(
            application_school_id=asch.id,
            performed_by=staff_id,
            action=ReviewActionType.REQUEST_INFO.value,
            notes=message,
        )
        self.db.add(action)
        await self.db.flush()

        app = asch.application
        school = asch.school
        parent = app.parent
        student_name = (app.form_data or {}).get("student_full_name", "Student")
        if parent and school:
            await notify(
                self.db,
                template="info_requested",
                recipient_email=parent.email,
                variables={
                    "student_name": student_name,
                    "school_name": school.name,
                    "message": message,
                    "fields": ", ".join(fields_requested) or "N/A",
                    "documents": ", ".join(documents_requested) or "N/A",
                    "respond_url": f"{settings.FRONTEND_URL}/enrolment/applications/{app.id}/respond-info",
                },
                metadata={
                    "application_id": str(app.id),
                    "school_id": str(school.id),
                    "info_request_id": str(info_req.id),
                    "event_type": "info_requested",
                },
            )
        return await self.get_application(application_id, school_id)
