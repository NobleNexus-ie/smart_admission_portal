import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Child(Base):
    __tablename__ = "children"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("parents.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[str | None] = mapped_column(String(20))
    gender: Mapped[str | None] = mapped_column(String(10))
    blood_group: Mapped[str | None] = mapped_column(String(10))
    nationality: Mapped[str | None] = mapped_column(String(50), default="Indian")
    mother_tongue: Mapped[str | None] = mapped_column(String(50))
    previous_school_name: Mapped[str | None] = mapped_column(String(200))
    previous_board: Mapped[str | None] = mapped_column(String(50))
    previous_grade: Mapped[str | None] = mapped_column(String(20))
    previous_marks: Mapped[str | None] = mapped_column(String(50))
    special_needs: Mapped[str | None] = mapped_column(String(500))
    medical_conditions: Mapped[str | None] = mapped_column(String(500))
    allergies: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    parent = relationship("Parent", back_populates="children")
