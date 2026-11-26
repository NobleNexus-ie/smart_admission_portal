import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.database import Base, engine
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import (
    ai_assist,
    analytics,
    applications,
    auth,
    auth_staff,
    chatbot,
    children,
    drafts,
    health,
    multi_submit,
    notification_preferences,
    onboarding,
    parents,
    school_compare,
    schools,
    staff_applications,
    staff_school,
)
from app.services.storage_client import get_storage_client
from app.utils.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    validation_exception_handler,
)

# Ensure models are registered on Base.metadata
import app.models  # noqa: F401

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer(auto_error=False)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")

    try:
        get_storage_client().ensure_bucket()
    except Exception as exc:
        logger.warning("MinIO bucket ensure failed (will retry on upload): %s", exc)

    yield
    await engine.dispose()


app = FastAPI(
    title="VedaAcademy Enrolment API",
    description="Phase 1 MVP — School admissions enrolment microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

API_PREFIX = "/api/v1"

app.include_router(health.router)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(auth_staff.router, prefix=API_PREFIX)
app.include_router(parents.router, prefix=API_PREFIX)
app.include_router(school_compare.router, prefix=API_PREFIX)
app.include_router(schools.router, prefix=API_PREFIX)
app.include_router(multi_submit.router, prefix=API_PREFIX)
app.include_router(drafts.router, prefix=API_PREFIX)
app.include_router(applications.router, prefix=API_PREFIX)
app.include_router(staff_applications.router, prefix=API_PREFIX)
app.include_router(staff_school.router, prefix=API_PREFIX)
app.include_router(chatbot.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(notification_preferences.router, prefix=API_PREFIX)
app.include_router(children.router, prefix=API_PREFIX)
app.include_router(onboarding.router, prefix=API_PREFIX)
app.include_router(ai_assist.router, prefix=API_PREFIX)


@app.get("/api/v1/files/{file_path:path}")
async def serve_local_file(
    file_path: str,
    token: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    from app.services.storage_client import LocalStorageClient, get_storage_client
    from app.utils.tokens import safe_decode_token

    authed = False
    if credentials and credentials.scheme.lower() == "bearer":
        payload = safe_decode_token(credentials.credentials)
        if payload and payload.get("type") == "access":
            authed = True
    if not authed and token:
        payload = safe_decode_token(token)
        if payload and payload.get("type") == "access":
            authed = True
    if not authed:
        raise StarletteHTTPException(status_code=401, detail="Authentication required")

    client = get_storage_client()
    if not isinstance(client, LocalStorageClient):
        raise StarletteHTTPException(status_code=404, detail="Not found")

    full = (client.root / file_path).resolve()
    if not str(full).startswith(str(client.root.resolve())):
        raise StarletteHTTPException(status_code=403, detail="Access denied")
    if not full.exists() or not full.is_file():
        raise StarletteHTTPException(status_code=404, detail="File not found")
    return FileResponse(full)
