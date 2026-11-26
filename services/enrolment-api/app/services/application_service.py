from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.application import Application
from app.models.application_document import ApplicationDocument
from app.models.application_school import ApplicationSchool
from app.models.enums import (
    ApplicationMethod,
    ApplicationSchoolStatus,
    ApplicationStatus,
    DocumentCategory,
    InfoRequestStatus,
    SchoolStatus,
)
from app.models.info_request import InfoRequest
from app.models.info_response import InfoResponse
from app.models.review_action import ReviewAction
from app.models.parent import Parent
from app.models.school import School
from app.services.document_service import DocumentService
from app.services.notification_service import notify
from app.services.profile_service import ProfileService
from app.utils.errors import AppError

settings = get_settings()


class ApplicationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _serialize(self, app: Application) -> dict:
        schools = []
        info_requests = []
        for asch in app.application_schools or []:
            last_action = None
            for ra in sorted(
                getattr(asch, "review_actions", []) or [],
                key=lambda x: x.performed_at or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            ):
                last_action = ra
                break
            schools.append(
                {
                    "id": asch.id,
                    "school_id": asch.school_id,
                    "school_name": asch.school.name if asch.school else None,
                    "status": asch.status,
                    "submitted_at": asch.submitted_at,
                    "reviewed_at": asch.reviewed_at,
                    "reason": last_action.reason if last_action else None,
                    "notes": last_action.notes if last_action else None,
                }
            )
            for ir in getattr(asch, "info_requests", []) or []:
                info_requests.append(
                    {
                        "id": ir.id,
                        "application_school_id": ir.application_school_id,
                        "fields": ir.fields_requested or [],
                        "documents": ir.documents_requested or [],
                        "message": ir.message,
                        "status": ir.status,
                        "created_at": ir.created_at,
                        "responded_at": ir.created_at if (ir.response is not None) else None,
                    }
                )
        docs = [DocumentService.to_out(d) for d in (app.documents or [])]
        return {
            "id": app.id,
            "parent_id": app.parent_id,
            "form_data": app.form_data or {},
            "status": app.status,
            "method": app.method,
            "created_at": app.created_at,
            "submitted_at": app.submitted_at,
            "updated_at": app.updated_at,
            "schools": schools,
            "documents": docs,
            "info_requests": info_requests,
        }

    async def create(self, parent_id: UUID, school_id: UUID, form_data: dict, *, method: str | None = None) -> dict:
        is_chatbot = method == ApplicationMethod.AGENTIC.value
        if not is_chatbot:
            await ProfileService(self.db).ensure_profile_complete(parent_id)

        school = await self.db.get(School, school_id)
        if not school:
            raise AppError(404, "School not found")
        if school.status != SchoolStatus.ACTIVE.value:
            raise AppError(403, "This school is not currently accepting applications")

        # One pending/submitted per parent+school+student
        student_name = (form_data or {}).get("student_full_name", "").strip().lower()
        existing = (
            await self.db.scalars(
                select(Application)
                .join(ApplicationSchool)
                .where(
                    Application.parent_id == parent_id,
                    ApplicationSchool.school_id == school_id,
                    ApplicationSchool.status.in_(
                        [
                            ApplicationSchoolStatus.PENDING.value,
                            ApplicationSchoolStatus.INFO_REQUESTED.value,
                        ]
                    ),
                )
            )
        ).all()
        for ex in existing:
            ex_name = (ex.form_data or {}).get("student_full_name", "").strip().lower()
            if ex_name == student_name:
                raise AppError(409, "You already have an application for this student at this school")

        app = Application(
            parent_id=parent_id,
            form_data=form_data or {},
            status=ApplicationStatus.DRAFT.value,
            method=ApplicationMethod.AGENTIC.value if is_chatbot else ApplicationMethod.SCHOOL_FIRST.value,
        )
        self.db.add(app)
        await self.db.flush()

        asch = ApplicationSchool(
            application_id=app.id,
            school_id=school_id,
            status=ApplicationSchoolStatus.PENDING.value,
        )
        self.db.add(asch)
        await self.db.flush()

        return await self.get(app.id, parent_id)

    def _app_load_options(self):
        return [
            selectinload(Application.application_schools).selectinload(
                ApplicationSchool.school
            ),
            selectinload(Application.application_schools).selectinload(
                ApplicationSchool.info_requests
            ).selectinload(InfoRequest.response),
            selectinload(Application.application_schools).selectinload(
                ApplicationSchool.review_actions
            ),
            selectinload(Application.documents),
        ]

    async def list_for_parent(self, parent_id: UUID) -> list[dict]:
        apps = (
            await self.db.scalars(
                select(Application)
                .options(*self._app_load_options())
                .where(Application.parent_id == parent_id)
                .order_by(Application.created_at.desc())
            )
        ).all()
        return [await self._serialize(a) for a in apps]

    async def get(self, application_id: UUID, parent_id: UUID) -> dict:
        app = await self.db.scalar(
            select(Application)
            .options(*self._app_load_options())
            .where(Application.id == application_id, Application.parent_id == parent_id)
        )
        if not app:
            raise AppError(404, "Application not found")
        return await self._serialize(app)

    async def update(self, application_id: UUID, parent_id: UUID, form_data: dict) -> dict:
        app = await self.db.scalar(
            select(Application)
            .options(selectinload(Application.application_schools))
            .where(Application.id == application_id, Application.parent_id == parent_id)
        )
        if not app:
            raise AppError(404, "Application not found")

        # Allow update only for draft, or when info_requested
        if app.status == ApplicationStatus.DRAFT.value:
            app.form_data = {**(app.form_data or {}), **form_data}
        else:
            info_requested = any(
                a.status == ApplicationSchoolStatus.INFO_REQUESTED.value
                for a in app.application_schools
            )
            if not info_requested:
                raise AppError(403, "Application is locked and cannot be edited")
            app.form_data = {**(app.form_data or {}), **form_data}

        app.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return await self.get(application_id, parent_id)

    async def upload_document(
        self,
        application_id: UUID,
        parent_id: UUID,
        category: DocumentCategory | str,
        file: UploadFile,
    ) -> dict:
        app = await self.db.scalar(
            select(Application)
            .options(selectinload(Application.application_schools))
            .where(Application.id == application_id, Application.parent_id == parent_id)
        )
        if not app:
            raise AppError(404, "Application not found")

        if app.status not in (ApplicationStatus.DRAFT.value, ApplicationStatus.SUBMITTED.value):
            raise AppError(403, "Cannot upload documents for this application")

        # Max 5 docs for draft uploads of key categories; allow more for info response
        existing_count = await self.db.scalar(
            select(ApplicationDocument).where(
                ApplicationDocument.application_id == application_id
            )
        )
        docs = (
            await self.db.scalars(
                select(ApplicationDocument).where(
                    ApplicationDocument.application_id == application_id
                )
            )
        ).all()
        if len(docs) >= 10:
            raise AppError(422, "Maximum number of documents reached")

        doc = await DocumentService(self.db).upload_application_document(
            application_id=application_id,
            category=category,
            file=file,
        )
        return DocumentService.to_out(doc)

    async def submit(self, application_id: UUID, parent_id: UUID) -> dict:
        app = await self.db.scalar(
            select(Application)
            .options(
                selectinload(Application.application_schools).selectinload(
                    ApplicationSchool.school
                ),
                selectinload(Application.documents),
                selectinload(Application.parent),
            )
            .where(Application.id == application_id, Application.parent_id == parent_id)
        )
        if not app:
            raise AppError(404, "Application not found")
        if app.status != ApplicationStatus.DRAFT.value:
            raise AppError(400, "Application has already been submitted")

        if app.method != ApplicationMethod.AGENTIC.value:
            await ProfileService(self.db).ensure_profile_complete(parent_id)

        form = app.form_data or {}
        required = ["student_full_name", "date_of_birth", "gender", "grade_applying_for"]
        missing = [f for f in required if not form.get(f)]
        if missing:
            raise AppError(
                422,
                "Application form incomplete",
                [{"field": f, "message": "Required"} for f in missing],
            )

        now = datetime.now(timezone.utc)
        app.status = ApplicationStatus.SUBMITTED.value
        app.submitted_at = now
        app.updated_at = now

        for asch in app.application_schools:
            school = asch.school
            if not school or school.status != SchoolStatus.ACTIVE.value:
                raise AppError(403, "This school is not currently accepting applications")
            asch.status = ApplicationSchoolStatus.PENDING.value
            asch.submitted_at = now

            student_name = form.get("student_full_name", "Student")
            grade = form.get("grade_applying_for", "")
            review_url = (
                f"{settings.FRONTEND_URL}/staff/applications/{app.id}"
            )
            await notify(
                self.db,
                template="app_received",
                recipient_email=school.contact_email,
                variables={
                    "student_name": student_name,
                    "grade": grade,
                    "review_url": review_url,
                },
                metadata={
                    "application_id": str(app.id),
                    "school_id": str(school.id),
                    "event_type": "app_received",
                },
            )

        await self.db.flush()
        return await self.get(application_id, parent_id)

    async def list_info_requests(self, application_id: UUID, parent_id: UUID) -> list[dict]:
        app = await self.db.scalar(
            select(Application).where(
                Application.id == application_id, Application.parent_id == parent_id
            )
        )
        if not app:
            raise AppError(404, "Application not found")

        rows = (
            await self.db.scalars(
                select(InfoRequest)
                .options(selectinload(InfoRequest.response))
                .join(ApplicationSchool)
                .where(ApplicationSchool.application_id == application_id)
                .order_by(InfoRequest.created_at.desc())
            )
        ).all()
        return [
            {
                "id": r.id,
                "application_school_id": r.application_school_id,
                "fields_requested": r.fields_requested,
                "documents_requested": r.documents_requested,
                "message": r.message,
                "status": r.status,
                "created_at": r.created_at,
                "has_response": r.response is not None,
            }
            for r in rows
        ]

    async def respond_info(
        self,
        application_id: UUID,
        parent_id: UUID,
        info_request_id: UUID,
        response_data: dict[str, Any],
        files: list[tuple[str, UploadFile]] | None = None,
    ) -> dict:
        app = await self.db.scalar(
            select(Application)
            .options(
                selectinload(Application.application_schools).selectinload(
                    ApplicationSchool.school
                ),
                selectinload(Application.parent),
            )
            .where(Application.id == application_id, Application.parent_id == parent_id)
        )
        if not app:
            raise AppError(404, "Application not found")

        info_req = await self.db.scalar(
            select(InfoRequest)
            .options(selectinload(InfoRequest.application_school))
            .where(InfoRequest.id == info_request_id)
        )
        if not info_req or info_req.application_school.application_id != application_id:
            raise AppError(404, "Info request not found")
        if info_req.status != InfoRequestStatus.PENDING.value:
            raise AppError(400, "Info request already responded to")

        asch = info_req.application_school
        if asch.status != ApplicationSchoolStatus.INFO_REQUESTED.value:
            raise AppError(400, "Application is not awaiting information")

        requested_fields = info_req.fields_requested or []
        requested_docs = info_req.documents_requested or []
        missing_fields = [f for f in requested_fields if not (response_data or {}).get(f, "").strip()]
        if missing_fields and not files:
            raise AppError(422, f"Please provide: {', '.join(f.replace('_', ' ') for f in missing_fields)}")

        # Merge response fields into form_data
        if response_data:
            app.form_data = {**(app.form_data or {}), **response_data}

        uploaded_docs: list[dict] = []
        if files:
            doc_svc = DocumentService(self.db)
            for category, file in files:
                doc = await doc_svc.upload_application_document(
                    application_id=application_id,
                    category=category,
                    file=file,
                )
                uploaded_docs.append(
                    {
                        "storage_key": doc.storage_key,
                        "category": doc.category,
                        "filename": doc.file_name,
                    }
                )

        response = InfoResponse(
            info_request_id=info_req.id,
            response_data=response_data or {},
            documents=uploaded_docs,
        )
        self.db.add(response)
        info_req.status = InfoRequestStatus.RESPONDED.value

        # info_requested → pending (submitted again for review)
        now = datetime.now(timezone.utc)
        asch.status = ApplicationSchoolStatus.PENDING.value
        asch.reviewed_at = None
        app.updated_at = now
        await self.db.flush()

        school = await self.db.get(School, asch.school_id)
        student_name = (app.form_data or {}).get("student_full_name", "Student")
        if school:
            await notify(
                self.db,
                template="info_provided",
                recipient_email=school.contact_email,
                variables={
                    "student_name": student_name,
                    "review_url": f"{settings.FRONTEND_URL}/staff/applications/{app.id}",
                },
                metadata={
                    "application_id": str(app.id),
                    "info_request_id": str(info_req.id),
                    "event_type": "info_provided",
                },
            )

        return await self.get(application_id, parent_id)
