from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.models.user import Base
from app.routers import auth
from app.routers import recommendations, recipes, posts
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

    # Check and seed baseline recipe data if empty
    from sqlalchemy import select, func
    from app.models.recipe import Recipe
    from app.db.session import SessionLocal
    from app.db.neo4j import normalize_title
    import json
    import os

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
                    recipes = json.load(f)
                
                for recipe in recipes:
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
                print(f"✅ Successfully seeded {len(recipes)} recipes on startup!")
            else:
                print(f"[WARNING] Could not find dummy_recipes.json at {json_path}")
        else:
            print(f"SQL database already has {count} recipes. Skipping seeding.")

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
