"""In-memory rate limiter with optional Redis backend (graceful fallback)."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.utils.errors import error_body

# path prefix -> (max_requests, window_seconds)
RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/v1/auth/register": (20, 3600),
    "/api/v1/auth/login": (30, 900),
    "/api/v1/auth/staff/login": (30, 900),
    "/api/v1/auth/forgot-password": (3, 3600),
    "/api/v1/applications": (30, 3600),
    "/api/v1/ai/improve-text": (20, 900),
    "/api/v1/chatbot/start": (60, 3600),
    "/api/v1/chatbot/respond": (60, 300),
}


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, key: str, limit: int, window: int) -> bool:
        now = time.time()
        with self._lock:
            timestamps = [t for t in self._hits[key] if now - t < window]
            if len(timestamps) >= limit:
                self._hits[key] = timestamps
                return False
            timestamps.append(now)
            self._hits[key] = timestamps
            return True


_memory_limiter = InMemoryRateLimiter()
_redis = None
_redis_failed = False


async def _get_redis():
    global _redis, _redis_failed
    if _redis_failed:
        return None
    if _redis is not None:
        return _redis
    try:
        from redis.asyncio import from_url

        from app.config import get_settings

        settings = get_settings()
        client = from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        _redis = client
        return _redis
    except Exception:
        _redis_failed = True
        return None


async def check_rate_limit(key: str, limit: int, window: int) -> bool:
    redis = await _get_redis()
    if redis is not None:
        try:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window)
            return count <= limit
        except Exception:
            pass
    return _memory_limiter.is_allowed(key, limit, window)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        matched: tuple[int, int] | None = None
        for prefix, cfg in RATE_LIMITS.items():
            if path == prefix or path.startswith(prefix + "/"):
                # Only POST for auth/applications create
                if request.method == "POST":
                    matched = cfg
                    break
                if path == "/api/v1/auth/login" or path == "/api/v1/auth/staff/login":
                    matched = cfg
                    break

        if matched and request.method in ("POST", "PUT"):
            apply = False
            if path in (
                "/api/v1/auth/register",
                "/api/v1/auth/login",
                "/api/v1/auth/staff/login",
                "/api/v1/auth/forgot-password",
                "/api/v1/ai/improve-text",
                "/api/v1/chatbot/start",
                "/api/v1/chatbot/respond",
            ):
                apply = True
            elif path == "/api/v1/applications" and request.method == "POST":
                apply = True

            if apply:
                limit, window = matched
                client_ip = request.client.host if request.client else "unknown"
                key = f"rl:{path}:{client_ip}"
                allowed = await check_rate_limit(key, limit, window)
                if not allowed:
                    origin = request.headers.get("origin", "")
                    headers: dict[str, str] = {}
                    if origin:
                        headers["access-control-allow-origin"] = origin
                        headers["access-control-allow-credentials"] = "true"
                    return JSONResponse(
                        status_code=429,
                        content=error_body(429, "Too many requests. Please try again later."),
                        headers=headers,
                    )

        return await call_next(request)
