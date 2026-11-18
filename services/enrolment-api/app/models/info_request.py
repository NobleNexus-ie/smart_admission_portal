import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import InfoRequestStatus


class InfoRequest(Base):
    __tablename__ = "info_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("application_schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("school_staff.id", ondelete="SET NULL"),
        nullable=True,
    )
    fields_requested: Mapped[list | None] = mapped_column(JSONB, default=list)
    documents_requested: Mapped[list | None] = mapped_column(JSONB, default=list)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20),
        default=InfoRequestStatus.PENDING.value,
        nullable=False,
    )
    deadline: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    application_school = relationship("ApplicationSchool", back_populates="info_requests")
    creator = relationship("SchoolStaff", back_populates="info_requests")
    response = relationship(
        "InfoResponse", back_populates="info_request", uselist=False, cascade="all, delete-orphan"
    )
