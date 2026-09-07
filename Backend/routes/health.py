"""
Health check and service status endpoints.

Provides a consolidated view of API, Redis, Celery, and Database health
for load balancers, monitoring dashboards, and deployment scripts.
"""

import os
import logging

from fastapi import APIRouter
from sqlalchemy import text

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Comprehensive health check for all backend services.

    Returns:
        JSON with overall status ('healthy' | 'degraded') and per-service details.
    """
    status = {"api": "healthy"}
    overall_healthy = True

    # ── Redis ────────────────────────────────────────────────────────
    try:
        import redis
        r = redis.from_url(
            os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
            socket_connect_timeout=3,
        )
        r.ping()
        info = r.info("memory")
        status["redis"] = {
            "status": "healthy",
            "used_memory_human": info.get("used_memory_human", "unknown"),
        }
    except Exception as e:
        status["redis"] = {"status": f"unhealthy: {e}"}
        overall_healthy = False

    # ── Celery workers ───────────────────────────────────────────────
    try:
        from celery_app import app as celery_app
        inspector = celery_app.control.inspect(timeout=3.0)
        active = inspector.active()
        if active:
            worker_names = list(active.keys())
            active_task_count = sum(len(tasks) for tasks in active.values())
            status["celery"] = {
                "status": "healthy",
                "active_workers": len(worker_names),
                "active_tasks": active_task_count,
                "workers": worker_names,
            }
        else:
            status["celery"] = {"status": "no_workers", "active_workers": 0}
            overall_healthy = False
    except Exception as e:
        status["celery"] = {"status": f"unhealthy: {e}"}
        overall_healthy = False

    # ── Database ─────────────────────────────────────────────────────
    try:
        from database import SyncSessionLocal
        db = SyncSessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        status["database"] = {"status": "healthy"}
    except Exception as e:
        status["database"] = {"status": f"unhealthy: {e}"}
        overall_healthy = False

    # ── Cache layer ──────────────────────────────────────────────────
    try:
        from cache import cache
        cache_info = await cache.info()
        status["cache"] = cache_info
    except Exception as e:
        status["cache"] = {"status": f"unhealthy: {e}"}

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "services": status,
    }


@router.get("/health/task-status/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of an async Celery task by its ID.

    Useful for polling resume parsing progress from the frontend.

    Returns:
        task_id, status (PENDING|STARTED|SUCCESS|FAILURE|RETRY), result if ready.
    """
    from celery.result import AsyncResult
    from celery_app import app as celery_app

    result = AsyncResult(task_id, app=celery_app)
    response = {
        "task_id": task_id,
        "status": result.status,
        "ready": result.ready(),
    }

    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.result)

    return response
