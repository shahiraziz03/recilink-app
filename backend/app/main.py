from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.models.user import Base
from app.routers import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous lifespan manager for startup and shutdown events.
    Automatically creates all defined tables in the PostgreSQL database.
    """
    print("Initializing database tables...")
    async with engine.begin() as conn:
        # Create all tables if they do not already exist
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully!")
    yield
    # Cleanup on application shutdown
    await engine.dispose()
    print("Database connections closed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS (Cross-Origin Resource Sharing)
# This allows both our React Native and React.js frontends to make API requests safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development; adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "message": "Welcome to the ReciLink REST API! Databases connected successfully."
    }

# Register routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
