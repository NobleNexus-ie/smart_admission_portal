from __future__ import annotations

import re
import uuid
from pathlib import PurePosixPath
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.application_document import ApplicationDocument
from app.models.enums import DocumentCategory
from app.services.storage_client import get_storage_client
from app.utils.errors import AppError
from app.utils.signed_urls import generate_signed_url

settings = get_settings()


def _sanitize_filename(filename: str | None) -> str:
    if not filename:
        return "upload"
    name = PurePosixPath(filename).name
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name) or "upload"


class DocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.storage = get_storage_client()

    def _validate_file(self, file: UploadFile, data: bytes) -> str:
        content_type = file.content_type or "application/octet-stream"
        if content_type not in settings.ALLOWED_MIME_TYPES:
            # Also check by extension as fallback for some clients
            name = (file.filename or "").lower()
            if name.endswith(".pdf"):
                content_type = "application/pdf"
            elif name.endswith((".jpg", ".jpeg")):
                content_type = "image/jpeg"
            elif name.endswith(".png"):
                content_type = "image/png"
            else:
                raise AppError(
                    422,
                    "Invalid file type",
                    [{"field": "file", "message": "Only PDF, JPG, and PNG are allowed"}],
                )
        if content_type not in settings.ALLOWED_MIME_TYPES:
            raise AppError(
                422,
                "Invalid file type",
                [{"field": "file", "message": "Only PDF, JPG, and PNG are allowed"}],
            )
        if len(data) > settings.MAX_UPLOAD_BYTES:
            raise AppError(
                422,
                "File too large",
                [{"field": "file", "message": "Maximum file size is 5 MB"}],
            )
        if len(data) == 0:
            raise AppError(
                422,
                "Empty file",
                [{"field": "file", "message": "File is empty"}],
            )
        return content_type

    async def upload_application_document(
        self,
        *,
        application_id: UUID,
        category: DocumentCategory | str,
        file: UploadFile,
    ) -> ApplicationDocument:
        data = await file.read()
        content_type = self._validate_file(file, data)
        cat = category.value if isinstance(category, DocumentCategory) else category
        if cat not in {c.value for c in DocumentCategory}:
            raise AppError(
                422,
                "Invalid document category",
                [{"field": "category", "message": f"Unknown category: {cat}"}],
            )

        safe_name = _sanitize_filename(file.filename)
        key = f"applications/{application_id}/{cat}/{uuid.uuid4()}_{safe_name}"
        self.storage.upload_bytes(key, data, content_type)

        doc = ApplicationDocument(
            application_id=application_id,
            category=cat,
            file_name=safe_name,
            storage_key=key,
            mime_type=content_type,
            file_size=len(data),
        )
        self.db.add(doc)
        await self.db.flush()
        return doc

    async def upload_id_proof(
        self,
        *,
        parent_id: UUID,
        file: UploadFile,
    ) -> str:
        data = await file.read()
        content_type = self._validate_file(file, data)
        safe_name = _sanitize_filename(file.filename)
        key = f"id-proofs/{parent_id}/{uuid.uuid4()}_{safe_name}"
        self.storage.upload_bytes(key, data, content_type)
        return key

    @staticmethod
    def to_out(doc: ApplicationDocument) -> dict:
        return {
            "id": doc.id,
            "category": doc.category,
            "file_name": doc.file_name,
            "mime_type": doc.mime_type,
            "file_size": doc.file_size,
            "uploaded_at": doc.uploaded_at,
            "download_url": generate_signed_url(doc.storage_key),
        }
