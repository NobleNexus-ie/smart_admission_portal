import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ApplicationSchoolStatus


class ApplicationSchool(Base):
    __tablename__ = "application_schools"
    __table_args__ = (
        UniqueConstraint("application_id", "school_id", name="uq_app_schools_app_school"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default=ApplicationSchoolStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    application = relationship("Application", back_populates="application_schools")
    school = relationship("School", back_populates="application_schools")
    review_actions = relationship(
        "ReviewAction", back_populates="application_school", cascade="all, delete-orphan"
    )
    info_requests = relationship(
        "InfoRequest", back_populates="application_school", cascade="all, delete-orphan"
    )
