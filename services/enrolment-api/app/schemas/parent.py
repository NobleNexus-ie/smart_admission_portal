from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.enums import IdProofType
from app.schemas.common import APIModel


class ChildCreate(APIModel):
    full_name: str = Field(min_length=1, max_length=100)
    date_of_birth: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    nationality: str | None = "Indian"
    mother_tongue: str | None = None
    previous_school_name: str | None = None
    previous_board: str | None = None
    previous_grade: str | None = None
    previous_marks: str | None = None
    special_needs: str | None = None
    medical_conditions: str | None = None
    allergies: str | None = None


class ChildUpdate(ChildCreate):
    pass


class ChildResponse(ChildCreate):
    id: UUID
    parent_id: UUID
    created_at: datetime | None = None


class ParentProfileUpdate(APIModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    address_line_2: str | None = Field(default=None, max_length=500)
    landmark: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=10)
    country: str | None = Field(default=None, max_length=50)
    id_proof_type: IdProofType | None = None
    # Spouse
    spouse_name: str | None = Field(default=None, max_length=100)
    spouse_phone: str | None = Field(default=None, max_length=20)
    spouse_email: str | None = Field(default=None, max_length=255)
    spouse_occupation: str | None = Field(default=None, max_length=100)
    # Education
    education_qualification: str | None = Field(default=None, max_length=100)
    occupation: str | None = Field(default=None, max_length=100)
    annual_income: str | None = Field(default=None, max_length=50)
    # Language
    language_preference: str | None = Field(default="en", max_length=10)


class ParentProfileResponse(APIModel):
    id: UUID | None = None
    parent_id: UUID
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    address_line_2: str | None = None
    landmark: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    country: str | None = None
    id_proof_type: str | None = None
    id_proof_url: str | None = None
    spouse_name: str | None = None
    spouse_phone: str | None = None
    spouse_email: str | None = None
    spouse_occupation: str | None = None
    education_qualification: str | None = None
    occupation: str | None = None
    annual_income: str | None = None
    language_preference: str = "en"
    profile_complete: bool = False
    updated_at: datetime | None = None
    children: list[ChildResponse] = Field(default_factory=list)


class DashboardCounts(APIModel):
    total: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    info_requested: int = 0
    draft: int = 0


class DashboardActivity(APIModel):
    event: str
    application_id: UUID
    school_name: str | None = None
    status: str | None = None
    timestamp: datetime | None = None


class DashboardResponse(APIModel):
    counts: DashboardCounts
    recent_activity: list[DashboardActivity]
    action_required: list[UUID]
