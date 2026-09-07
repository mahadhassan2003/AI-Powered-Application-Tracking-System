"""
Production Redis cache with async support and graceful in-memory fallback.

Uses REDIS_CACHE_URL (DB 1) to avoid colliding with Celery's broker on DB 0.
Falls back to a Python dict if Redis is unavailable, so the app still works
in local development without Redis running.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Try to import async redis
try:
    import redis.asyncio as aioredis
    HAS_AIOREDIS = True
except ImportError:
    HAS_AIOREDIS = False
    logger.warning("redis.asyncio not available — using in-memory cache only")


class RedisCache:
    """Production Redis cache with async support and graceful fallback."""

    def __init__(self):
        self._redis: Optional[Any] = None
        # Emergency in-memory fallback
        self._fallback: dict = {}
        self._fallback_expiry: dict = {}
        self._use_fallback = not HAS_AIOREDIS

    async def connect(self):
        """Connect to Redis on app startup."""
        if self._use_fallback:
            logger.info("Using in-memory cache (redis.asyncio not installed)")
            return

        try:
            url = os.getenv("REDIS_CACHE_URL", "redis://127.0.0.1:6379/1")
            _ssl_kwargs = {"ssl_cert_reqs": "none"} if url.startswith("rediss://") else {}
            self._redis = aioredis.from_url(
                url,
                decode_responses=True,
                max_connections=20,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                **_ssl_kwargs,
            )
            await self._redis.ping()
            logger.info(f"Redis cache connected: {url}")
        except Exception as e:
            logger.warning(f"Redis cache unavailable, using in-memory fallback: {e}")
            self._use_fallback = True

    async def close(self):
        """Close Redis connection on app shutdown."""
        if self._redis:
            await self._redis.close()
            logger.info("Redis cache connection closed")

    # ─── Core Operations ───────────────────────────────────────────────

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache. Returns None if key doesn't exist or is expired."""
        if self._use_fallback:
            return self._fallback_get(key)
        try:
            val = await self._redis.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            logger.error(f"Redis GET error for key '{key}': {e}")
            return self._fallback_get(key)

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL (default 5 minutes)."""
        if self._use_fallback:
            return self._fallback_set(key, value, ttl)
        try:
            serialized = json.dumps(value, default=str)
            await self._redis.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key '{key}': {e}")
            return self._fallback_set(key, value, ttl)

    async def delete(self, key: str) -> bool:
        """Delete a single key from cache."""
        if self._use_fallback:
            self._fallback.pop(key, None)
            self._fallback_expiry.pop(key, None)
            return True
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error for key '{key}': {e}")
            return False

    async def delete_pattern(self, pattern: str) -> bool:
        """Delete keys matching a glob pattern."""
        if self._use_fallback:
            keys_to_delete = [k for k in self._fallback if pattern in k]
            for k in keys_to_delete:
                self._fallback.pop(k, None)
                self._fallback_expiry.pop(k, None)
            return True
        try:
            deleted = 0
            cursor = 0
            while True:
                cursor, keys = await self._redis.scan(
                    cursor, match=f"*{pattern}*", count=100
                )
                if keys:
                    await self._redis.delete(*keys)
                    deleted += len(keys)
                if cursor == 0:
                    break
            logger.info(f"Deleted {deleted} keys matching pattern '*{pattern}*'")
            return True
        except Exception as e:
            logger.error(f"Redis DELETE_PATTERN error for '{pattern}': {e}")
            return False

    async def flush_all(self) -> bool:
        """Clear all cache entries."""
        if self._use_fallback:
            self._fallback.clear()
            self._fallback_expiry.clear()
            return True
        try:
            await self._redis.flushdb()
            return True
        except Exception as e:
            logger.error(f"Redis FLUSHDB error: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a counter. Creates the key with value `amount` if it doesn't exist."""
        if self._use_fallback:
            current = self._fallback.get(key, 0)
            new_val = current + amount
            self._fallback[key] = new_val
            return new_val
        try:
            return await self._redis.incrby(key, amount)
        except Exception as e:
            logger.error(f"Redis INCREMENT error for key '{key}': {e}")
            return None

    # ─── Health ─────────────────────────────────────────────────────────

    async def ping(self) -> bool:
        """Check if Redis is reachable."""
        if self._use_fallback:
            return True  # Fallback is always "available"
        try:
            return await self._redis.ping()
        except Exception:
            return False

    @property
    def is_redis(self) -> bool:
        """Whether we're using real Redis or in-memory fallback."""
        return not self._use_fallback

    async def info(self) -> dict:
        """Return cache status information."""
        if self._use_fallback:
            return {
                "type": "in-memory",
                "status": "active",
                "total_keys": len(self._fallback),
            }
        try:
            db_size = await self._redis.dbsize()
            return {
                "type": "redis",
                "status": "connected",
                "total_keys": db_size,
            }
        except Exception as e:
            return {"type": "redis", "status": f"error: {e}", "total_keys": 0}

    # ─── In-memory fallback helpers ────────────────────────────────────

    def _fallback_get(self, key: str) -> Optional[Any]:
        if key in self._fallback_expiry:
            if datetime.now() > self._fallback_expiry[key]:
                del self._fallback[key]
                del self._fallback_expiry[key]
                return None
        return self._fallback.get(key)

    def _fallback_set(self, key: str, value: Any, ttl: int) -> bool:
        self._fallback[key] = value
        self._fallback_expiry[key] = datetime.now() + timedelta(seconds=ttl)
        return True


# ─── Global cache instance ─────────────────────────────────────────────
cache = RedisCache()
