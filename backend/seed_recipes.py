import json
import asyncio
from app.db.session import SessionLocal
from app.models.user import User, Profile  # add this
from app.models.recipe import Recipe
from app.models.post import Post           # add this

async def seed():
    print("Loading dummy_recipes.json...")
    
    with open('dummy_recipes.json', 'r') as f:
        recipes = json.load(f)
    
    print(f"Seeding {len(recipes)} recipes...")
    
    async with SessionLocal() as db:
        for recipe in recipes:
            new_recipe = Recipe(
                title=recipe['title'],
                description=recipe.get('description'),
                cuisine=recipe.get('cuisine'),
                difficulty=recipe.get('difficulty'),
                prep_time=recipe.get('prep_time'),
                cook_time=recipe.get('cook_time'),
                servings=recipe.get('servings', 4),
                ingredients=recipe.get('ingredients', []),
                steps=recipe.get('steps', []),
                tags=recipe.get('tags', []),
                image_url=recipe.get('image_url'),
                source=recipe.get('source', 'dataset'),
                contributor_id=None,
            )
            db.add(new_recipe)
        
        await db.commit()
        print(f"✅ Successfully seeded {len(recipes)} recipes!")

if __name__ == "__main__":
    asyncio.run(seed())