from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True
        )
    return _redis_client


async def cache_get(key: str) -> Any | None:
    try:
        r = get_redis()
        data = await r.get(key)
        if data:
            return json.loads(data)
    except Exception as exc:
        logger.debug("cache_get error key=%s: %s", key, exc)
    return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    try:
        r = get_redis()
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception as exc:
        logger.debug("cache_set error key=%s: %s", key, exc)


async def cache_delete_pattern(pattern: str) -> None:
    try:
        r = get_redis()
        cursor = None
        while cursor != 0:
            cursor, keys = await r.scan(cursor=cursor or 0, match=pattern, count=100)
            if keys:
                await r.delete(*keys)
    except Exception as exc:
        logger.debug("cache_delete_pattern error pattern=%s: %s", pattern, exc)
