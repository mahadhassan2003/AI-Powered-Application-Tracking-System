
#!/usr/bin/env python3
"""
Start Celery worker for background task processing.

Listens on all defined queues: celery (default), resume_parsing,
matching, emails, offers.
"""

import os
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the parent directory (root of the workspace)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

def start_celery_worker():
    """Start Celery worker with proper configuration."""

    # Set environment variables for Celery
    os.environ['CELERY_BROKER_URL'] = os.getenv(
        'REDIS_URL', 'redis://localhost:6379/0'
    )
    os.environ['CELERY_RESULT_BACKEND'] = os.getenv(
        'REDIS_URL', 'redis://localhost:6379/0'
    )

    # Change to the correct directory
    os.chdir(Path(__file__).parent)

    # Start Celery worker on all queues
    cmd = [
        sys.executable, '-m', 'celery',
        '-A', 'celery_app',
        'worker',
        '--loglevel=info',
        '--concurrency=2',
        '--pool=solo',  # Use solo pool for Windows compatibility
        '-Q', 'celery,resume_parsing,matching,emails,offers',
    ]

    print("Starting Celery worker...")
    print(f"Command: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Celery worker failed to start: {e}")
        sys.exit(1)


def start_celery_beat():
    """Start Celery Beat scheduler for cron tasks."""

    os.chdir(Path(__file__).parent)

    cmd = [
        sys.executable, '-m', 'celery',
        '-A', 'celery_app',
        'beat',
        '--loglevel=info',
    ]

    print("Starting Celery Beat scheduler...")
    print(f"Command: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Celery Beat failed to start: {e}")
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Start Celery worker or beat")
    parser.add_argument(
        "--beat", action="store_true",
        help="Start Celery Beat scheduler instead of worker"
    )
    args = parser.parse_args()

    if args.beat:
        start_celery_beat()
    else:
        start_celery_worker()
