from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def error_body(
    status: int,
    error: str,
    details: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    return {
        "status": status,
        "error": error,
        "details": details or [],
    }


class AppError(HTTPException):
    def __init__(
        self,
        status_code: int,
        error: str,
        details: list[dict[str, str]] | None = None,
    ):
        super().__init__(status_code=status_code, detail=error)
        self.error = error
        self.details = details or []


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.status_code, exc.error, exc.details),
    )


async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.status_code, str(detail)),
    )


async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = []
    for err in exc.errors():
        loc = err.get("loc", ())
        field = ".".join(str(x) for x in loc if x != "body")
        details.append({"field": field or "body", "message": err.get("msg", "Invalid value")})
    return JSONResponse(
        status_code=422,
        content=error_body(422, "Validation error", details),
    )
