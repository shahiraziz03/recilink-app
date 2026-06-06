from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.routers import auth, recommendations, recipes, posts, profile, social
from app.db.neo4j import close_driver
import app.models.user    # noqa: F401
import app.models.recipe  # noqa: F401
import app.models.social  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully!")
    yield
    await engine.dispose()
    close_driver()
    print("Database connections closed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

app.include_router(auth.router,            prefix="/api/v1")
app.include_router(recipes.router,         prefix="/api/v1")
app.include_router(posts.router,           prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(profile.router,         prefix="/api/v1")
app.include_router(social.router,          prefix="/api/v1")
