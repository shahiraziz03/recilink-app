from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.routers import auth, recommendations, recipes, posts, profile, social
from app.db.neo4j import close_driver, check_neo4j_connection, normalize_title
import app.models.user    # noqa: F401
import app.models.recipe  # noqa: F401
import app.models.post    # noqa: F401
import app.models.social  # noqa: F401
import json
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully!")

    print("Verifying Neo4j database connectivity...")
    if check_neo4j_connection():
        print("✅ Neo4j connection verified successfully!")
    else:
        print("❌ WARNING: Neo4j connection failed! Please verify settings.NEO4J_URI or check if the DB is running.")

    # Check and seed baseline recipe data if empty
    from app.models.recipe import Recipe

    async with SessionLocal() as db:
        result = await db.execute(select(func.count(Recipe.id)))
        count = result.scalar()
        if count == 0:
            print("SQL database is empty. Seeding recipes...")
            json_path = "dummy_recipes.json"
            if not os.path.exists(json_path):
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                json_path = os.path.join(base_dir, "dummy_recipes.json")
            
            if os.path.exists(json_path):
                with open(json_path, 'r', encoding='utf-8') as f:
                    recipes_data = json.load(f)
                
                for recipe in recipes_data:
                    new_recipe = Recipe(
                        title=normalize_title(recipe['title']),
                        description=recipe.get('description'),
                        cuisine=recipe.get('cuisine'),
                        difficulty=recipe.get('difficulty'),
                        prep_time=recipe.get('prep_time'),
                        cook_time=recipe.get('cook_time'),
                        servings=recipe.get('servings', 4),
                        ingredients=[normalize_title(ing) for ing in recipe.get('ingredients', []) if normalize_title(ing)],
                        steps=recipe.get('steps', []),
                        tags=recipe.get('tags', []),
                        image_url=recipe.get('image_url'),
                        source=recipe.get('source', 'dataset'),
                        contributor_id=None,
                    )
                    db.add(new_recipe)
                await db.commit()
                print(f"✅ Successfully seeded {len(recipes_data)} recipes on startup!")
            else:
                print(f"[WARNING] Could not find dummy_recipes.json at {json_path}")
        else:
            print(f"SQL database already has {count} recipes. Skipping seeding.")

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

@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    """
    Perform a real-time connectivity health check for PostgreSQL and Neo4j.
    """
    postgres_ok = False
    try:
        async with SessionLocal() as db:
            await db.execute(select(func.now()))
        postgres_ok = True
    except Exception as e:
        print(f"Health check: PostgreSQL connection failed: {e}")

    neo4j_ok = check_neo4j_connection()

    status = "healthy" if (postgres_ok and neo4j_ok) else "degraded"
    return {
        "status": status,
        "database": {
            "postgresql": "connected" if postgres_ok else "disconnected",
            "neo4j": "connected" if neo4j_ok else "disconnected"
        }
    }

app.include_router(auth.router,            prefix="/api/v1")
app.include_router(recipes.router,         prefix="/api/v1")
app.include_router(posts.router,           prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(profile.router,         prefix="/api/v1")
app.include_router(social.router,          prefix="/api/v1")
