import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ParentProfile(Base):
    __tablename__ = "parent_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    id_proof_type: Mapped[str | None] = mapped_column(String(50))
    id_proof_url: Mapped[str | None] = mapped_column(String(500))
    pincode: Mapped[str | None] = mapped_column(String(10))
    country: Mapped[str | None] = mapped_column(String(50), default="India")
    address_line_2: Mapped[str | None] = mapped_column(String(500))
    landmark: Mapped[str | None] = mapped_column(String(200))

    spouse_name: Mapped[str | None] = mapped_column(String(100))
    spouse_phone: Mapped[str | None] = mapped_column(String(20))
    spouse_email: Mapped[str | None] = mapped_column(String(255))
    spouse_occupation: Mapped[str | None] = mapped_column(String(100))

    education_qualification: Mapped[str | None] = mapped_column(String(100))
    occupation: Mapped[str | None] = mapped_column(String(100))
    annual_income: Mapped[str | None] = mapped_column(String(50))

    language_preference: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    profile_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    parent = relationship("Parent", back_populates="profile")
