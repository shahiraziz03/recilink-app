import asyncio
import json
import os
from sqlalchemy import select
from app.db.session import engine, SessionLocal
from app.models.user import Base
from app.models.recipe import Recipe
from app.db.neo4j import normalize_title
from sync_neo4j import sync as sync_neo4j

async def reset_database():
    print("=========================================")
    # 1. Reset PostgreSQL
    print("1. Resetting PostgreSQL tables...")
    async with engine.begin() as conn:
        print("   Dropping all existing tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("   Recreating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("PostgreSQL tables reset successfully!")

    # 2. Seed PostgreSQL
    print("=========================================")
    print("2. Seeding recipes into PostgreSQL...")
    json_path = "dummy_recipes.json"
    if not os.path.exists(json_path):
        json_path = os.path.join(os.path.dirname(__file__), "dummy_recipes.json")
        
    with open(json_path, 'r', encoding='utf-8') as f:
        recipes = json.load(f)

    async with SessionLocal() as db:
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
    print(f"✅ Successfully seeded {len(recipes)} recipes in SQL!")

    # 3. Synchronize Neo4j AuraDB
    print("=========================================")
    print("3. Resetting and Synchronizing Neo4j...")
    await sync_neo4j()
    print("=========================================")
    print("🎉 ALL DATABASES SUCCESSFULLY RESET AND SYNCHRONIZED!")

if __name__ == "__main__":
    asyncio.run(reset_database())
