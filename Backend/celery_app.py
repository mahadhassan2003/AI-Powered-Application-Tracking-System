
"""
Celery application configuration for background task processing.

Broker & result backend: Redis DB 0
Beat scheduler: cron jobs for offer expiry and reminders
Queue routing: dedicated queues per task domain
"""

import os
from celery import Celery
from celery.schedules import crontab
import logging

logger = logging.getLogger(__name__)

# ─── Redis configuration with graceful fallback ─────────────────────────
REDIS_URL = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')

try:
    import redis as _redis
    _ssl_kwargs = {"ssl_cert_reqs": "none"} if REDIS_URL.startswith("rediss://") else {}
    _r = _redis.from_url(REDIS_URL, socket_connect_timeout=3, **_ssl_kwargs)
    _r.ping()
    BROKER_URL = REDIS_URL
    BACKEND_URL = REDIS_URL
    logger.info(f"Celery using Redis broker: {REDIS_URL}")
except Exception as e:
    logger.warning(f"Redis unavailable ({e}), falling back to in-memory broker")
    BROKER_URL = 'memory://'
    # Use PostgreSQL as result backend for deployment when Redis is down
    DATABASE_URL = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:password@localhost:5432/ats'
    )
    BACKEND_URL = f'db+{DATABASE_URL}'

# ─── Create Celery instance ─────────────────────────────────────────────
app = Celery('ats_background_tasks')

app.conf.update(
    # Broker & backend
    broker_url=BROKER_URL,
    result_backend=BACKEND_URL,

    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # ─── Task routing: dedicated queues per domain ───────────────────
    task_routes={
        # Resume processing
        'ats_background_tasks.parse_resume': {'queue': 'resume_parsing'},
        'ats_background_tasks.calculate_match_scores': {'queue': 'matching'},
        'ats_background_tasks.update_candidate_rankings': {'queue': 'matching'},
        'ats_background_tasks.process_job_embedding': {'queue': 'matching'},
        'ats_background_tasks.recalculate_all_scores': {'queue': 'matching'},
        # Email delivery
        'ats_email_tasks.send_welcome_email': {'queue': 'emails'},
        'ats_email_tasks.send_status_update_email': {'queue': 'emails'},
        'ats_email_tasks.send_recruiter_notification': {'queue': 'emails'},
        'ats_email_tasks.send_interview_reminder': {'queue': 'emails'},
        'ats_email_tasks.send_rejection_email': {'queue': 'emails'},
        'ats_email_tasks.send_bulk_interview_reminders': {'queue': 'emails'},
        # Offer lifecycle
        'ats_offer_tasks.send_offer_email': {'queue': 'emails'},
        'ats_offer_tasks.send_offer_reminder': {'queue': 'emails'},
        'ats_offer_tasks.check_and_expire_offers': {'queue': 'offers'},
        'ats_offer_tasks.send_offer_about_to_expire': {'queue': 'offers'},
        'ats_offer_tasks.send_onboarding_checklist': {'queue': 'emails'},
    },

    # ─── Celery Beat schedule: cron jobs ─────────────────────────────
    beat_schedule={
        # Run every day at 8:00 AM UTC — expire overdue offers
        'expire-stale-offers': {
            'task': 'ats_offer_tasks.check_and_expire_offers',
            'schedule': crontab(hour=8, minute=0),
        },
        # Run every day at 9:00 AM UTC — warn candidates 3 days before expiry
        'remind-expiring-offers': {
            'task': 'ats_offer_tasks.send_offer_about_to_expire',
            'schedule': crontab(hour=9, minute=0),
        },
    },

    # ─── Result settings ─────────────────────────────────────────────
    result_expires=3600,  # Results expire after 1 hour

    # ─── Worker settings ─────────────────────────────────────────────
    worker_prefetch_multiplier=1,       # Fetch 1 task at a time (fair scheduling)
    task_acks_late=True,                # Ack after execution for reliability
    worker_max_tasks_per_child=1000,    # Restart worker after 1000 tasks (memory leak guard)
    task_track_started=True,            # Track STARTED state for progress polling
)

# Explicitly include task modules (autodiscover looks for tasks/tasks.py
# which doesn't exist — our modules are email_tasks, offer_tasks, resume_tasks)
app.conf.include = [
    'tasks.email_tasks',
    'tasks.offer_tasks',
    'tasks.resume_tasks',
]

if __name__ == '__main__':
    app.start()
