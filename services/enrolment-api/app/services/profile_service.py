from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.application import Application
from app.models.application_school import ApplicationSchool
from app.models.child import Child
from app.models.enums import ApplicationSchoolStatus, ApplicationStatus
from app.models.parent import Parent
from app.models.parent_profile import ParentProfile
from app.models.school import School
from app.schemas.parent import (
    DashboardActivity,
    DashboardCounts,
    DashboardResponse,
    ParentProfileUpdate,
)
from app.services.document_service import DocumentService
from app.utils.errors import AppError
from app.utils.signed_urls import generate_signed_url

settings = get_settings()

NEW_PROFILE_FIELDS = [
    "address_line_2", "landmark", "pincode", "country",
    "spouse_name", "spouse_phone", "spouse_email", "spouse_occupation",
    "education_qualification", "occupation", "annual_income",
    "language_preference",
]


class ProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_profile(self, parent_id: UUID) -> dict:
        parent = await self.db.scalar(
            select(Parent)
            .options(selectinload(Parent.profile))
            .where(Parent.id == parent_id)
        )
        if not parent:
            raise AppError(404, "Parent not found")

        children = (await self.db.scalars(
            select(Child).where(Child.parent_id == parent_id).order_by(Child.created_at)
        )).all()

        profile = parent.profile
        if not profile:
            return {
                "id": None,
                "parent_id": parent_id,
                "full_name": None,
                "phone": None,
                "address": None,
                "address_line_2": None,
                "landmark": None,
                "city": None,
                "state": None,
                "pincode": None,
                "country": "India",
                "id_proof_type": None,
                "id_proof_url": None,
                "spouse_name": None,
                "spouse_phone": None,
                "spouse_email": None,
                "spouse_occupation": None,
                "education_qualification": None,
                "occupation": None,
                "annual_income": None,
                "language_preference": "en",
                "profile_complete": False,
                "updated_at": None,
                "children": [self._child_dict(c) for c in children],
            }

        id_url = None
        if profile.id_proof_url:
            try:
                id_url = generate_signed_url(profile.id_proof_url)
            except Exception:
                id_url = profile.id_proof_url

        return {
            "id": profile.id,
            "parent_id": profile.parent_id,
            "full_name": profile.full_name,
            "phone": profile.phone,
            "address": profile.address,
            "address_line_2": profile.address_line_2,
            "landmark": profile.landmark,
            "city": profile.city,
            "state": profile.state,
            "pincode": profile.pincode,
            "country": profile.country,
            "id_proof_type": profile.id_proof_type,
            "id_proof_url": id_url,
            "spouse_name": profile.spouse_name,
            "spouse_phone": profile.spouse_phone,
            "spouse_email": profile.spouse_email,
            "spouse_occupation": profile.spouse_occupation,
            "education_qualification": profile.education_qualification,
            "occupation": profile.occupation,
            "annual_income": profile.annual_income,
            "language_preference": profile.language_preference or "en",
            "profile_complete": profile.profile_complete,
            "updated_at": profile.updated_at,
            "children": [self._child_dict(c) for c in children],
        }

    def _child_dict(self, c: Child) -> dict:
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

    def _is_complete(self, profile: ParentProfile) -> bool:
        if not profile.full_name or len(profile.full_name.strip()) < 2:
            return False
        if settings.REQUIRE_ID_PROOF:
            if not profile.id_proof_type or not profile.id_proof_url:
                return False
            if not profile.phone:
                return False
        return True

    async def update_profile(self, parent_id: UUID, data: ParentProfileUpdate) -> dict:
        profile = await self.db.scalar(
            select(ParentProfile).where(ParentProfile.parent_id == parent_id)
        )
        if not profile:
            profile = ParentProfile(
                parent_id=parent_id,
                full_name=data.full_name,
            )
            self.db.add(profile)

        profile.full_name = data.full_name
        if data.phone is not None:
            profile.phone = data.phone
        if data.address is not None:
            profile.address = data.address
        if data.city is not None:
            profile.city = data.city
        if data.state is not None:
            profile.state = data.state
        if data.id_proof_type is not None:
            profile.id_proof_type = data.id_proof_type.value

        for field in NEW_PROFILE_FIELDS:
            val = getattr(data, field, None)
            if val is not None:
                setattr(profile, field, val)

        profile.profile_complete = self._is_complete(profile)
        profile.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return await self.get_profile(parent_id)

    async def upload_id_proof(self, parent_id: UUID, file, id_proof_type: str | None = None) -> dict:
        profile = await self.db.scalar(
            select(ParentProfile).where(ParentProfile.parent_id == parent_id)
        )
        if not profile:
            raise AppError(
                400,
                "Complete profile name first before uploading ID proof",
                [{"field": "full_name", "message": "Profile must exist before ID proof upload"}],
            )

        doc_service = DocumentService(self.db)
        key = await doc_service.upload_id_proof(parent_id=parent_id, file=file)
        profile.id_proof_url = key
        if id_proof_type:
            profile.id_proof_type = id_proof_type
        profile.profile_complete = self._is_complete(profile)
        profile.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return await self.get_profile(parent_id)

    async def ensure_profile_complete(self, parent_id: UUID) -> None:
        profile = await self.db.scalar(
            select(ParentProfile).where(ParentProfile.parent_id == parent_id)
        )
        if not profile or not profile.profile_complete:
            raise AppError(
                403,
                "Please complete your profile before continuing",
                [{"field": "profile_complete", "message": "Profile is incomplete"}],
            )

    async def dashboard(self, parent_id: UUID) -> dict:
        apps = (
            await self.db.scalars(
                select(Application)
                .options(
                    selectinload(Application.application_schools).selectinload(
                        ApplicationSchool.school
                    )
                )
                .where(Application.parent_id == parent_id)
                .order_by(Application.created_at.desc())
            )
        ).all()

        total = 0
        pending = 0
        approved = 0
        rejected = 0
        info_requested = 0
        action_required: list[dict] = []
        activity: list[dict] = []
        seen_action_ids: set[UUID] = set()

        for app in apps:
            total += 1
            form = app.form_data or {}
            for asch in app.application_schools:
                st = asch.status
                school_name = asch.school.name if asch.school else None
                if st == ApplicationSchoolStatus.PENDING.value:
                    pending += 1
                elif st == ApplicationSchoolStatus.APPROVED.value:
                    approved += 1
                elif st == ApplicationSchoolStatus.REJECTED.value:
                    rejected += 1
                elif st == ApplicationSchoolStatus.INFO_REQUESTED.value:
                    info_requested += 1
                    if app.id not in seen_action_ids:
                        seen_action_ids.add(app.id)
                        action_required.append({
                            "id": str(app.id),
                            "student_full_name": form.get("student_full_name", "Student"),
                            "school_name": school_name,
                            "school_id": str(asch.school_id),
                            "status": st,
                            "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
                            "created_at": app.created_at.isoformat() if app.created_at else None,
                            "action_required": True,
                        })

                ts = asch.reviewed_at or asch.submitted_at or app.created_at
                status_labels = {
                    "pending": "submitted to",
                    "approved": "approved by",
                    "rejected": "rejected by",
                    "info_requested": "info requested by",
                }
                verb = status_labels.get(st, st)
                message = f"Application {verb} {school_name or 'school'}"

                activity.append({
                    "id": f"{app.id}:{asch.school_id}",
                    "application_id": str(app.id),
                    "event_type": f"status:{st}",
                    "message": message,
                    "created_at": ts.isoformat() if ts else None,
                })

        activity.sort(key=lambda a: a["created_at"] or "", reverse=True)
        return {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "info_requested": info_requested,
            "recent_activity": activity[:5],
            "action_required": action_required,
        }
