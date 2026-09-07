import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import Base

# Load environment variables from .env if present
load_dotenv()

# Database configuration - Production ready
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    DATABASE_URL = 'sqlite:///./ats_local.db'
    print("⚠️  Using SQLite for local development. Set DATABASE_URL for production PostgreSQL.")

# Transform the postgres string for async driver
if DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    # Use aiosqlite for SQLite fallback
    ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Pool kwargs only apply to PostgreSQL (SQLite uses StaticPool/NullPool)
_pool_kwargs = {} if IS_SQLITE else {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "pool_timeout": 20,
    "max_overflow": 10,
    "pool_size": 5,
}

# 1. Sync Engine (For Celery Tasks & Initialization)
sync_engine = create_engine(
    DATABASE_URL,
    echo=False,
    **_pool_kwargs
)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# 2. Async Engine (For Web Route Performance)
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    **_pool_kwargs
)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, autoflush=False, autocommit=False, class_=AsyncSession)

def init_db():
    """Initialize database connections (migrations now handled via Alembic)"""
    try:
        # Check connection can be established synchronously
        with sync_engine.connect() as conn:
            pass
        print("Database connection initialized successfully.")
        return True
    except Exception as e:
        print(f"Warning: Could not initialize database connection: {e}")
        print("Application will start but database operations may fail until database is available")
        return False

async def get_db():
    """Dependency to get async database session for web routes"""
    async with AsyncSessionLocal() as session:
        yield session

def check_database_connection():
    """Check if database connection is available"""
    try:
        db = SyncSessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception:
        return False