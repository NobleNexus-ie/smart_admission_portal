import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ApplicationMethod, ApplicationStatus


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    form_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default=ApplicationStatus.DRAFT.value,
        nullable=False,
        index=True,
    )
    method: Mapped[str] = mapped_column(
        String(30),
        default=ApplicationMethod.SCHOOL_FIRST.value,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    parent = relationship("Parent", back_populates="applications")
    application_schools = relationship(
        "ApplicationSchool", back_populates="application", cascade="all, delete-orphan"
    )
    documents = relationship(
        "ApplicationDocument", back_populates="application", cascade="all, delete-orphan"
    )
