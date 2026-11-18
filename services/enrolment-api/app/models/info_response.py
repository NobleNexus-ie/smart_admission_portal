import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InfoResponse(Base):
    __tablename__ = "info_responses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    info_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("info_requests.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    response_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    documents: Mapped[list | None] = mapped_column(JSONB, default=list)
    responded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    info_request = relationship("InfoRequest", back_populates="response")
