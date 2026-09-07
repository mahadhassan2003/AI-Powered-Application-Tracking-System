
"""
Cache management routes for monitoring and clearing cache.
Works with both Redis and in-memory fallback cache.
"""

from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_recruiter
from models import User
from cache import cache

router = APIRouter(prefix="/cache", tags=["Cache Management"])


@router.get("/stats")
async def get_cache_stats(current_user: User = Depends(get_current_recruiter)):
    """Get cache statistics."""
    info = await cache.info()
    return info


@router.delete("/flush")
async def flush_cache(current_user: User = Depends(get_current_recruiter)):
    """Flush all cache entries (admin only)."""
    if await cache.flush_all():
        return {"message": "Cache flushed successfully"}
    raise HTTPException(status_code=500, detail="Failed to flush cache")


@router.delete("/pattern/{pattern}")
async def delete_cache_pattern(
    pattern: str,
    current_user: User = Depends(get_current_recruiter),
):
    """Delete cache entries matching pattern."""
    if await cache.delete_pattern(pattern):
        return {"message": f"Deleted cache entries matching: {pattern}"}
    raise HTTPException(status_code=500, detail="Failed to delete cache entries")
