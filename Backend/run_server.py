#!/usr/bin/env python
"""Simple server runner without reload"""
import uvicorn
import subprocess
import sys
import atexit
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

processes = []

# Start Celery worker
try:
    celery_process = subprocess.Popen(
        [sys.executable, "-m", "celery", "-A", "celery_app", "worker", "--loglevel=info", "--pool=solo"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    processes.append(celery_process)
    logger.info(f"Celery worker started with PID: {celery_process.pid}")
except Exception as e:
    logger.warning(f"Failed to start Celery worker: {e}")

def cleanup():
    for proc in processes:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except:
            proc.kill()

atexit.register(cleanup)

# Start FastAPI server without reload
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
