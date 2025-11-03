"""
Shared database configuration and utilities
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os

# Database URLs from environment variables
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ogim_user:ogim_password@postgres:5432/ogim"
)

TIMESCALE_URL = os.getenv(
    "TIMESCALE_URL",
    "postgresql://ogim_user:ogim_password@timescaledb:5432/ogim_tsdb"
)

# Create engines
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

timescale_engine = create_engine(
    TIMESCALE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

# Create session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
TimescaleSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=timescale_engine)

# Create base class for models
Base = declarative_base()


def get_db() -> Session:
    """Get database session for dependency injection"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_timescale_db() -> Session:
    """Get TimescaleDB session for dependency injection"""
    db = TimescaleSessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Get database session as context manager"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def init_timescale_db():
    """Initialize TimescaleDB tables"""
    Base.metadata.create_all(bind=timescale_engine)

