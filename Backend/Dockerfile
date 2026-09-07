FROM python:3.11-slim

# Install system dependencies needed by python-magic and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
RUN python -m spacy download en_core_web_sm
COPY . .

ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

# Use gunicorn with uvicorn workers — responds to health checks faster
CMD exec gunicorn main:app \
    --bind 0.0.0.0:$PORT \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 1 \
    --threads 4 \
    --timeout 0 \
    --preload
