from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.models.enums import Board, SchoolStatus, StaffRole
from app.schemas.common import APIModel


class SchoolOnboardRequest(APIModel):
    name: str = Field(min_length=2, max_length=255)
    board: Board
    school_type: str | None = None
    address: str = Field(min_length=5, max_length=500)
    area: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    contact_email: EmailStr
    phone: str | None = None
    description: str | None = None
    facilities: list[str] | None = None
    website_url: str | None = None
    grades_offered: list[str] | None = None


class SchoolUpdateRequest(APIModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    board: Board | None = None
    address: str | None = None
    area: str | None = None
    city: str | None = None
    state: str | None = None
    contact_email: EmailStr | None = None
    phone: str | None = None
    description: str | None = None
    facilities: list[str] | None = None
    website_url: str | None = None
    grades_offered: list[str] | None = None
    required_documents: list[str] | None = None
    logo_url: str | None = None


class StaffCreateRequest(APIModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=100)
    role: StaffRole = StaffRole.REVIEWER


class SchoolResponse(APIModel):
    id: UUID
    name: str
    board: str
    school_type: str | None = None
    address: str
    area: str
    city: str
    state: str
    contact_email: str
    phone: str | None = None
    description: str | None = None
    logo_url: str | None = None
    status: str
    facilities: list | None = None
    fee_range: str | None = None
    student_teacher_ratio: str | None = None
    grades_offered: list | None = None
    required_documents: list | None = None
    website_url: str | None = None
    created_at: datetime | None = None


class SchoolSearchResponse(APIModel):
    items: list[SchoolResponse]
    total: int
    limit: int
    offset: int


class EmbedLinkResponse(APIModel):
    token: str
    url: str
    html_snippet: str


class EmbedResolveResponse(APIModel):
    school_id: UUID
    school: SchoolResponse


class StaffResponse(APIModel):
    id: UUID
    school_id: UUID
    email: str
    name: str
    role: str
    permissions: list | None = None
    created_at: datetime | None = None
