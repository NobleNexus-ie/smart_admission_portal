from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.application import ApplicationResponse, DocumentOut
from app.schemas.common import APIModel
from app.schemas.parent import ParentProfileResponse


class ApproveRequest(APIModel):
    notes: str | None = None


class RejectRequest(APIModel):
    reason: str = Field(min_length=10, max_length=2000)
    notes: str | None = None

    @field_validator("reason")
    @classmethod
    def check_reason(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Reject reason must be at least 10 characters")
        return v.strip()


class RequestInfoBody(APIModel):
    fields_requested: list[str] = Field(default_factory=list)
    documents_requested: list[str] = Field(default_factory=list)
    message: str = Field(min_length=1, max_length=2000)


class ReviewActionOut(APIModel):
    id: UUID
    action: str
    reason: str | None = None
    notes: str | None = None
    performed_by: UUID | None = None
    performer_name: str | None = None
    performed_at: datetime | None = None


class StaffApplicationDetail(APIModel):
    application: ApplicationResponse
    parent_email: str
    parent_profile: ParentProfileResponse | None = None
    review_history: list[ReviewActionOut] = Field(default_factory=list)
    info_requests: list[dict[str, Any]] = Field(default_factory=list)
    documents: list[DocumentOut] = Field(default_factory=list)


class StaffApplicationListItem(APIModel):
    application_school_id: UUID
    application_id: UUID
    school_id: UUID
    status: str
    submitted_at: datetime | None = None
    student_name: str | None = None
    grade: str | None = None
    parent_email: str | None = None
