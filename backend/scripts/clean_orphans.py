import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal, engine
from app.models.recipe import Recipe
from app.models.post import Post
from app.routers.recipes import cleanup_deleted_recipe_in_neo4j

async def clean_orphans():
    print("=========================================")
    print("🔍 Searching for orphaned user recipes...")
    print("=========================================")
    
    async with SessionLocal() as db:
        # Find recipes created by users that do not have any community posts linked to them
        query = select(Recipe).outerjoin(Post).where(Post.id == None, Recipe.source == "user")
        result = await db.execute(query)
        orphans = result.scalars().all()
        
        if not orphans:
            print("✨ No orphaned recipes found. Your databases are completely clean and in sync!")
            print("=========================================")
            return
            
        print(f"Found {len(orphans)} orphaned recipe(s) to clean up:")
        for r in orphans:
            print(f"📍 ID: {r.id} | Title: {r.title}")
        print("-----------------------------------------")
        
        print("🔄 Deleting from Neo4j and PostgreSQL...")
        for r in orphans:
            try:
                # 1. Clean up Neo4j
                await cleanup_deleted_recipe_in_neo4j(r.id, r.title, db)
                # 2. Delete from PostgreSQL
                await db.delete(r)
                print(f"✅ Cleaned up recipe ID {r.id} ({r.title})")
            except Exception as e:
                print(f"❌ Failed to clean up recipe ID {r.id}: {e}")
                
        await db.commit()
        print("=========================================")
        print("🎉 CLEANUP COMPLETED SUCCESSFULLY!")
        print("=========================================")

if __name__ == "__main__":
    try:
        asyncio.run(clean_orphans())
    finally:
        # Ensure engine is disposed to allow clean exit
        async def close_engine():
            await engine.dispose()
        asyncio.run(close_engine())
