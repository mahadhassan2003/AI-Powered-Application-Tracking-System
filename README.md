# Anthrix ATS — AI-Powered Applicant Tracking System

A modern, full-stack Applicant Tracking System built with **Next.js 15**, **FastAPI**, **Celery**, **PostgreSQL**, and **Redis**. Features AI-powered resume parsing (Groq LLM), semantic match scoring, negotiation engine, and real-time interview scheduling.

---

## 🏛️ Architecture

```
┌───────────────┐     ┌───────────────────┐     ┌─────────────┐
│  Next.js 15   │────▶│  FastAPI (8000)    │────▶│ PostgreSQL  │
│  (Port 3000)  │     │  async / uvicorn   │     │  (Port 5432)│
└───────────────┘     └────────┬──────────┘     └─────────────┘
                               │
                        ┌──────▼──────┐
                        │   Celery    │────▶ Redis (6379)
                        │   Workers   │      Broker + Cache
                        └─────────────┘
```

### Backend Service-Oriented Architecture

The backend follows a strict **Service-Oriented Architecture (SOA)**:

| Layer | Responsibility | Example Files |
|-------|---------------|---------------|
| **Routes** | HTTP concerns only (params, auth, status codes) | `routes/auth.py`, `routes/offers.py`, `routes/applications.py` |
| **Services** | Business logic, orchestration, complex queries | `services/application_service.py`, `services/negotiation_service.py`, `services/scoring_engine.py`, `services/admin_service.py` |
| **Tasks** | Async background orchestration (Celery) | `tasks/resume_tasks.py`, `tasks/email_tasks.py` |
| **Knowledge** | Static data constants and regex mappings | `knowledge/resume_regex_constants.py` |

---

## ✨ Key Features

- **AI Resume Parsing** — Groq LLM (llama-3.3-70b) + spaCy hybrid extraction
- **Semantic Match Scoring** — SentenceTransformer embeddings + cosine similarity + fuzzy skill matching
- **Negotiation Engine** — Full offer lifecycle: create → send → negotiate → accept/decline → onboard
- **Interview Scheduling** — Reschedule requests, confirmations, and calendar management
- **Recruiter SMTP** — Per-recruiter email configuration with bulk templating
- **Admin Dashboard** — Recruiter approval workflow, platform-wide analytics
- **Guest Applications** — Shadow account creation for non-registered candidates

---

## 📁 Project Structure

```
├── Backend/
│   ├── main.py                    # FastAPI entry + auto-migration
│   ├── start_celery.py            # Celery worker launcher
│   ├── models.py                  # SQLAlchemy ORM models
│   ├── routes/                    # Lean HTTP routers
│   │   ├── auth.py                # Auth + admin endpoints
│   │   ├── applications.py        # Application CRUD + search
│   │   ├── offers.py              # Offer lifecycle routing
│   │   ├── interviews.py          # Interview scheduling
│   │   └── jobs.py                # Job CRUD
│   ├── services/                  # Business logic layer
│   │   ├── application_service.py # Apply flows, status updates
│   │   ├── negotiation_service.py # Offer accept/decline/negotiate
│   │   ├── scoring_engine.py      # ML match scoring algorithms
│   │   ├── offer_service.py       # PDF generation, validation
│   │   ├── admin_service.py       # Admin metrics, approvals
│   │   ├── embedding_service.py   # Singleton SentenceTransformer
│   │   ├── resume_parser.py       # Groq LLM + spaCy parsing
│   │   └── email_service.py       # SMTP orchestration
│   ├── tasks/                     # Celery async workers
│   │   ├── resume_tasks.py        # Resume parse + score pipeline
│   │   ├── email_tasks.py         # Background email dispatch
│   │   └── offer_tasks.py         # Offer email tasks
│   ├── knowledge/                 # Static data
│   │   └── resume_regex_constants.py
│   └── tests/                     # Pytest test suites
│       └── services/
│           ├── test_application_service.py
│           ├── test_scoring_engine.py
│           └── test_negotiation_service.py
├── frontend/                      # Next.js 15 App Router
│   └── src/app/
│       ├── jobs/                   # Public job board
│       ├── recruiter/              # Recruiter dashboard, jobs, offers
│       ├── candidate/              # Candidate dashboard, applications
│       └── admin/                  # Admin panel
├── .env                           # Environment variables
├── README.md
└── HOW_TO_RUN.md
```

---

## 🧪 Testing

```bash
cd Backend
python -m pytest tests/services
```

Covers: `ScoringEngine`, `ApplicationService`, `NegotiationService`

---

## 📄 License

Private — All rights reserved.
