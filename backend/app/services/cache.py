from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

_memory_cache: dict[str, tuple[float, str]] = {}
_redis_client: Any = None
_redis_checked = False


def _get_redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    try:
        import os
        import redis

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        client = redis.Redis.from_url(redis_url, socket_timeout=1.0)
        client.ping()
        _redis_client = client
        logger.info("Connected to Redis cache at %s", redis_url)
    except Exception as exc:
        logger.info("Redis not reachable (%s); using in-memory cache fallback.", exc)
        _redis_client = None
    return _redis_client


def cache_get(key: str) -> Optional[Any]:
    client = _get_redis()
    if client:
        try:
            raw = client.get(key)
            if raw:
                return json.loads(raw)
            return None
        except Exception:
            pass

    # Fallback in-memory cache
    if key in _memory_cache:
        expires_at, data = _memory_cache[key]
        if time.time() < expires_at:
            try:
                return json.loads(data)
            except Exception:
                return None
        else:
            _memory_cache.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    serialized = json.dumps(value)
    client = _get_redis()
    if client:
        try:
            client.setex(key, ttl_seconds, serialized)
            return
        except Exception:
            pass

    _memory_cache[key] = (time.time() + ttl_seconds, serialized)


def cache_delete(key: str) -> None:
    client = _get_redis()
    if client:
        try:
            client.delete(key)
        except Exception:
            pass
    _memory_cache.pop(key, None)
