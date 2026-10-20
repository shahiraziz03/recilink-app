from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

class Base(DeclarativeBase):
    pass

# Base class for all SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Create asynchronous engine for PostgreSQL connection
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

# Create session maker for active transactions
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_db():
    """
    Dependency injection helper to provide database session to endpoints.
    Ensures the session is automatically closed after the request is completed.
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()