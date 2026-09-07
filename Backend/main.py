from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from contextlib import asynccontextmanager
import uvicorn
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the parent directory (root of the workspace) BEFORE importing database
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Import our modules
from database import init_db
from models import User, Job, Application
from auth import AuthHandler
from routes import auth_router, jobs_router, applications_router, profile_router
from routes.email_routes import router as email_router
from routes import smtp_settings # Import the new SMTP settings router
from routes.offers import router as offers_router  # Import offer routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup resources"""
    # Run migrations automatically on startup
    try:
        from database import sync_engine
        from models import Base
        
        # 1. Create tables if they don't exist (safe for new environments)
        Base.metadata.create_all(sync_engine)
        
        # 2. Sync Alembic state so it knows we are at head
        import alembic.config
        logger.info("Stamping alembic head...")
        alembic.config.main(argv=["--raiseerr", "stamp", "head"])
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database init notice: {e}")
        
    init_db()
    # Connect Redis cache (falls back to in-memory if unavailable)
    from cache import cache
    await cache.connect()
    yield
    await cache.close()

# Create FastAPI app
app = FastAPI(title="ATS - Applicant Tracking System", lifespan=lifespan)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global exception handlers
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors gracefully"""
    import traceback
    logger.error(f"Database error on {request.method} {request.url.path}: {type(exc).__name__}: {exc}")
    logger.error(f"Full traceback:\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Database operation failed. Please try again later."}
    )

@app.exception_handler(OperationalError)
async def operational_error_handler(request: Request, exc: OperationalError):
    """Handle database connection errors"""
    logger.error(f"Database connection error: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Database service is temporarily unavailable. Please try again later."}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    logger.warning(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data", "errors": exc.errors()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    import traceback
    with open("app_crashes.log", "a") as f:
        f.write(f"Exception on {request.url.path}:\n")
        f.write(traceback.format_exc() + "\n\n")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )

# Add rate limiting middleware
from middleware.rate_limit import RateLimitMiddleware

app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Add CORS middleware
# allow_origins must be explicit (not "*") when allow_credentials=True,
# otherwise browsers reject the response per the CORS spec.
# Set ALLOWED_ORIGINS in .env as a comma-separated list of trusted frontend URLs.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000")
ALLOWED_ORIGINS = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])
app.include_router(applications_router, prefix="/applications", tags=["Applications"])
app.include_router(profile_router, prefix="/profile", tags=["Profile"])
app.include_router(email_router, prefix="/emails", tags=["Email Automation"])
app.include_router(offers_router, prefix="/offers", tags=["Offer Management"])  # Include offer routes
# Include the new SMTP settings router
app.include_router(smtp_settings.router, prefix="/smtp", tags=["SMTP Settings"])


# Import and include new routers
from routes.search import router as search_router
from routes.interviews import router as interviews_router
from routes.notifications import router as notifications_router
from routes.cache_management import router as cache_management_router # Assuming cache_management router exists

app.include_router(search_router, prefix="/search", tags=["Advanced Search"])
app.include_router(interviews_router, prefix="/interviews", tags=["Interviews"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])

# Health check router
from routes.health import router as health_router
app.include_router(health_router, tags=["Health"])

# Root endpoint for API health check
@app.get("/")
async def root():
    return {"status": "ok", "message": "ATS API is running"}

if __name__ == "__main__":
    import subprocess
    import sys
    import atexit

    processes = []

    # Start Celery worker (works without Redis using in-memory broker)
    try:
        celery_process = subprocess.Popen(
            [sys.executable, "-m", "celery", "-A", "celery_app", "worker",
             "--loglevel=info", "--pool=solo",
             "-Q", "celery,resume_parsing,matching,emails,offers"],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        processes.append(celery_process)
        logger.info(f"Celery worker started with PID: {celery_process.pid}")
    except Exception as e:
        logger.warning(f"Failed to start Celery worker: {e}")

    # Cleanup function to terminate processes on exit
    def cleanup():
        for proc in processes:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except:
                proc.kill()

    atexit.register(cleanup)

    # Start FastAPI server
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
