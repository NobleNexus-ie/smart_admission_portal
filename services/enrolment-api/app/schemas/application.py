from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.models.enums import DocumentCategory
from app.schemas.common import APIModel


class ApplicationCreateRequest(APIModel):
    school_id: UUID
    form_data: dict[str, Any] = Field(default_factory=dict)
    method: str | None = None


class ApplicationUpdateRequest(APIModel):
    form_data: dict[str, Any]


class ApplicationSchoolOut(APIModel):
    id: UUID
    school_id: UUID
    school_name: str | None = None
    status: str
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    reason: str | None = None
    notes: str | None = None


class DocumentOut(APIModel):
    id: UUID
    category: str
    file_name: str
    mime_type: str
    file_size: int
    uploaded_at: datetime | None = None
    download_url: str | None = None


class InfoRequestParentOut(APIModel):
    id: UUID
    application_school_id: UUID
    fields: list[str] = Field(default_factory=list)
    documents: list[str] = Field(default_factory=list)
    message: str | None = None
    status: str
    created_at: datetime | None = None
    responded_at: datetime | None = None


class ApplicationResponse(APIModel):
    id: UUID
    parent_id: UUID
    form_data: dict[str, Any]
    status: str
    method: str
    created_at: datetime | None = None
    submitted_at: datetime | None = None
    updated_at: datetime | None = None
    schools: list[ApplicationSchoolOut] = Field(default_factory=list)
    documents: list[DocumentOut] = Field(default_factory=list)
    info_requests: list[InfoRequestParentOut] = Field(default_factory=list)


class RespondInfoRequest(APIModel):
    info_request_id: UUID
    response_data: dict[str, Any] = Field(default_factory=dict)


class InfoRequestOut(APIModel):
    id: UUID
    application_school_id: UUID
    fields_requested: list | None = None
    documents_requested: list | None = None
    message: str | None = None
    status: str
    created_at: datetime | None = None
    has_response: bool = False


class DocumentUploadMeta(APIModel):
    category: DocumentCategory
