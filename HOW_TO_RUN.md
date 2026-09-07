# How to Run the Anthrix ATS Application

This guide covers the exact steps required to run the full Anthrix ATS stack locally.
The application consists of a **Next.js 15 Frontend**, a **FastAPI Backend** with a **Service-Oriented Architecture**, a **Celery Worker Stack** for background ML/email jobs, and relies on **PostgreSQL** & **Redis**.

---

## 🏗️ Prerequisites

Before running the application, ensure the following services are running on your machine:

1. **PostgreSQL Database**: Must be running on port `5432`.
2. **Redis Server**: Must be running on port `6379`.
   - On Windows: use WSL (`sudo service redis-server start`) or a Windows-native Redis port.

### Environment Variables

Ensure your `.env` file at the project root contains:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql+asyncpg://user:pass@localhost:5432/ats`) |
| `REDIS_URL` | Redis broker URL for Celery (e.g. `redis://localhost:6379/0`) |
| `REDIS_CACHE_URL` | Redis cache URL (e.g. `redis://localhost:6379/1`) |
| `GROQ_API_KEY` | Valid Groq AI API key for LLM resume parsing |
| `JWT_SECRET` | Secret key for JWT token generation |

---

## 🚀 Running the Stack

You will need **three separate terminal windows**.

### Terminal 1: FastAPI Backend
```bash
cd Backend
python main.py
```
> The backend auto-runs migrations and starts on `http://localhost:8000`.
> API docs available at `http://localhost:8000/docs`.

### Terminal 2: Celery Background Workers
```bash
cd Backend
python start_celery.py
```
> Listens to queues: `celery`, `resume_parsing`, `matching`, `emails`, `offers`.
> **If this is not running, resumes will be stuck on "Unscored".**

### Terminal 3: Next.js Frontend
```bash
cd frontend
npm run dev
```
> Frontend available at `http://localhost:3000`.

---

## 🏛️ Backend Architecture

The backend follows a strict **Service-Oriented Architecture (SOA)**:

```
Routes (HTTP layer)
  └── Services (Business logic)
        ├── ApplicationService    — Apply flows, status updates, bulk ops
        ├── NegotiationService    — Offer accept/decline/negotiate lifecycle
        ├── ScoringEngine         — ML match scoring (embeddings + fuzzy)
        ├── OfferService          — PDF generation, validation, analytics
        ├── AdminService          — Recruiter approvals, dashboard stats
        ├── EmbeddingService      — Singleton SentenceTransformer loader
        └── ResumeParser          — Groq LLM + spaCy hybrid parsing
  └── Tasks (Celery async workers)
        ├── resume_tasks          — Parse + score pipeline
        ├── email_tasks           — Background email dispatch
        └── offer_tasks           — Offer notification emails
  └── Knowledge (Static data)
        └── resume_regex_constants — Skill taxonomy & regex patterns
```

---

## 🧪 Running Tests

```bash
cd Backend
python -m pytest tests/services
```

Test coverage includes:
- **ScoringEngine**: Skill overlap, experience scoring, semantic matching
- **ApplicationService**: Status update lifecycle with mock DB
- **NegotiationService**: Offer decline, negotiation term application

---

## ⏳ Optional: Celery Beat (Cron Jobs)

For automated tasks (expiring old offers, sending reminders):
```bash
cd Backend
python start_celery.py --beat
```

---

## 🔍 Health Check

Verify all services are running:
```bash
curl http://localhost:8000/health
```

Expected response includes status for: `api`, `redis`, `celery`, `database`, `cache`.

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Scores stuck on "Unscored" | Check Terminal 2 (Celery). If `401 Invalid API Key`, update `GROQ_API_KEY` in `.env` |
| "Application not found" in Celery | Restart **both** `main.py` and `start_celery.py` after `.env` changes |
| Connection Refused (10061) | Ensure Redis and PostgreSQL are running |
| `ModuleNotFoundError` in tests | Run tests with `python -m pytest` (not bare `pytest`) to set correct PYTHONPATH |
