"""
Centralized database session management for Celery tasks.

All task modules should use `task_db_session()` instead of creating
their own engines. This reuses the connection pool from database.py
and ensures proper commit/rollback/close lifecycle.
"""

from contextlib import contextmanager
import logging

from database import SyncSessionLocal

logger = logging.getLogger(__name__)

@contextmanager
def task_db_session():
    """Context manager for Celery task database sessions.

    Usage::

        with task_db_session() as db:
            app = db.query(Application).filter(...).first()
            app.status = "completed"
            # Auto-commit on exit, auto-rollback on exception

    Yields:
        sqlalchemy.orm.Session
    """
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
