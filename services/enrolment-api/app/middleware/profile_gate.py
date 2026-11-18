from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.utils.tokens import safe_decode_token

EXEMPT_PREFIXES = (
    "/api/v1/auth",
    "/api/v1/parents/profile",
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/api/v1/staff",
    "/api/v1/schools/resolve-embed",
)


class ProfileGateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if any(path.startswith(p) for p in EXEMPT_PREFIXES):
            return await call_next(request)

        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header[7:]
        payload = safe_decode_token(token)
        if not payload:
            return await call_next(request)

        if payload.get("role") != "parent":
            return await call_next(request)

        if payload.get("profile_complete") is False:
            return JSONResponse(
                status_code=403,
                content={
                    "status": 403,
                    "error": "Please complete your profile before continuing.",
                },
            )

        return await call_next(request)
