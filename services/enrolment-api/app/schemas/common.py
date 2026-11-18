from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=False, extra="forbid")


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    status: int
    error: str
    details: list[ErrorDetail] = Field(default_factory=list)


class MessageResponse(APIModel):
    message: str
    data: dict[str, Any] | None = None


class PaginatedResponse(APIModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int
