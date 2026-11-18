from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.child import Child
from app.models.parent_profile import ParentProfile

STEPS = [
    {
        "key": "welcome",
        "title": "Welcome to VedaAcademy",
        "message": "Welcome! I'm here to help you set up your profile. Let's start with your basic information.",
        "fields": [],
    },
    {
        "key": "basic_info",
        "title": "Your Basic Details",
        "message": "Let's start with your name and contact details.",
        "fields": ["full_name", "phone"],
    },
    {
        "key": "address",
        "title": "Your Address",
        "message": "Please provide your residential address.",
        "fields": ["address", "address_line_2", "landmark", "city", "state", "pincode", "country"],
    },
    {
        "key": "spouse_details",
        "title": "Spouse / Guardian Details",
        "message": "Please provide your spouse or co-guardian details (optional).",
        "fields": ["spouse_name", "spouse_phone", "spouse_email", "spouse_occupation"],
    },
    {
        "key": "education_work",
        "title": "Education & Occupation",
        "message": "Tell us about your educational background and occupation.",
        "fields": ["education_qualification", "occupation", "annual_income"],
    },
    {
        "key": "id_proof",
        "title": "Identity Verification",
        "message": "Please provide your ID proof type and upload a document.",
        "fields": ["id_proof_type"],
    },
    {
        "key": "children",
        "title": "Children Details",
        "message": "Add your children who will be enrolled. You can add multiple children including twins.",
        "fields": ["children"],
    },
    {
        "key": "language",
        "title": "Language Preference",
        "message": "Choose your preferred language for the platform.",
        "fields": ["language_preference"],
    },
    {
        "key": "complete",
        "title": "Profile Complete!",
        "message": "Your profile is all set. You can now browse schools and start enrollment applications.",
        "fields": [],
    },
]


class OnboardingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_state(self, parent_id: UUID) -> dict:
        profile = await self.db.scalar(
            select(ParentProfile).where(ParentProfile.parent_id == parent_id)
        )
        children = (
            await self.db.scalars(
                select(Child).where(Child.parent_id == parent_id).order_by(Child.created_at)
            )
        ).all()

        filled = self._compute_filled(profile, children)
        current_step = self._determine_current_step(filled)

        return {
            "steps": [
                {
                    "key": s["key"],
                    "title": s["title"],
                    "message": s["message"],
                    "fields": s["fields"],
                    "completed": s["key"] in filled,
                }
                for s in STEPS
            ],
            "current_step": current_step,
            "is_complete": current_step == "complete",
            "profile_data": self._profile_dict(profile) if profile else {},
            "children_count": len(children),
        }

    async def advance_step(self, parent_id: UUID, step_key: str, data: dict) -> dict:
        profile = await self.db.scalar(
            select(ParentProfile).where(ParentProfile.parent_id == parent_id)
        )
        if not profile:
            profile = ParentProfile(parent_id=parent_id)
            self.db.add(profile)

        step = next((s for s in STEPS if s["key"] == step_key), None)
        if not step:
            return {"success": False, "error": "Invalid step"}

        for field in step["fields"]:
            if field == "children":
                continue
            if field in data and data[field] is not None:
                setattr(profile, field, data[field])

        required_for_complete = ["full_name", "phone"]
        has_required = all(getattr(profile, f, None) for f in required_for_complete)
        profile.profile_complete = has_required and bool(profile.id_proof_type)

        await self.db.flush()
        return await self.get_state(parent_id)

    def _compute_filled(self, profile: ParentProfile | None, children: list) -> set[str]:
        filled = {"welcome"}
        if not profile:
            return filled

        if profile.full_name and profile.phone:
            filled.add("basic_info")
        if profile.address and profile.city and profile.state:
            filled.add("address")
        if profile.spouse_name or profile.spouse_phone:
            filled.add("spouse_details")
        if profile.education_qualification or profile.occupation:
            filled.add("education_work")
        if profile.id_proof_type:
            filled.add("id_proof")
        if len(children) > 0:
            filled.add("children")
        if profile.language_preference:
            filled.add("language")
        if profile.profile_complete:
            filled.add("complete")

        return filled

    def _determine_current_step(self, filled: set[str]) -> str:
        for step in STEPS:
            if step["key"] not in filled:
                return step["key"]
        return "complete"

    def _profile_dict(self, p: ParentProfile) -> dict:
        return {
            "full_name": p.full_name,
            "phone": p.phone,
            "address": p.address,
            "address_line_2": p.address_line_2,
            "landmark": p.landmark,
            "city": p.city,
            "state": p.state,
            "pincode": p.pincode,
            "country": p.country,
            "id_proof_type": p.id_proof_type,
            "spouse_name": p.spouse_name,
            "spouse_phone": p.spouse_phone,
            "spouse_email": p.spouse_email,
            "spouse_occupation": p.spouse_occupation,
            "education_qualification": p.education_qualification,
            "occupation": p.occupation,
            "annual_income": p.annual_income,
            "language_preference": p.language_preference or "en",
        }
