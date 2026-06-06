from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.routers import auth
from app.routers import recommendations, recipes, posts
from app.db.neo4j import close_driver
from app.routers import recommendations, recipes, profile, social
import app.models.user    # noqa: F401 — registers User/Profile with Base
import app.models.recipe  # noqa: F401 — registers Recipe with Base
import app.models.social  # noqa: F401 — registers SavedRecipe/Comment/Follow with Base
from app.db.neo4j import close_driver

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

# Add router
app.include_router(recommendations.router, prefix="/api/v1")

# Close Neo4j on shutdown
@app.on_event("shutdown")
def shutdown():
    close_driver()

# Add recipes router
app.include_router(recipes.router, prefix="/api/v1")

# Add posts (Community Module) router
app.include_router(posts.router, prefix="/api/v1")

# Add router
app.include_router(recommendations.router, prefix="/api/v1")

# Close Neo4j on shutdown
@app.on_event("shutdown")
def shutdown():
    close_driver()

# Add recipes router
app.include_router(recipes.router, prefix="/api/v1")

# Add profile (streak / check-in) router
app.include_router(profile.router, prefix="/api/v1")

# Add social router (saves, comments, follows, feed)
app.include_router(social.router, prefix="/api/v1")
