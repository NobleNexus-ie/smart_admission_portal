import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import SchoolStatus


class School(Base):
    __tablename__ = "schools"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    board: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    area: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(
        String(20), default=SchoolStatus.PENDING.value, nullable=False, index=True
    )
    school_type: Mapped[str | None] = mapped_column(String(20), index=True)
    embed_link_token: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True
    )
    facilities: Mapped[list | None] = mapped_column(JSONB, default=list)
    fee_range: Mapped[str | None] = mapped_column(String(100))
    student_teacher_ratio: Mapped[str | None] = mapped_column(String(50))
    grades_offered: Mapped[list | None] = mapped_column(JSONB, default=list)
    website_url: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    staff = relationship("SchoolStaff", back_populates="school")
    application_schools = relationship("ApplicationSchool", back_populates="school")
