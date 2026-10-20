import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal, engine
from app.models.user import User
from app.models.recipe import Recipe
from app.models.post import Post
from app.models.social import SavedRecipe, PostLike, Follow
from app.db.neo4j import (
    sync_user_to_neo4j,
    sync_save_to_neo4j,
    sync_like_to_neo4j,
    sync_follow_to_neo4j,
    close_driver,
)


async def backfill():
    print("Starting Neo4j social graph backfill...")
    async with SessionLocal() as db:
        # 1. Backfill Users
        print("Querying users...")
        users_res = await db.execute(select(User))
        users = users_res.scalars().all()
        for idx, u in enumerate(users, 1):
            sync_user_to_neo4j(u.id, u.username)
        print(f"Synced {len(users)} users to Neo4j.")

        # 2. Backfill Saved Recipes
        print("Querying saved recipes...")
        saved_res = await db.execute(
            select(SavedRecipe.user_id, Recipe.title)
            .join(Recipe, SavedRecipe.recipe_id == Recipe.id)
        )
        saved_rows = saved_res.all()
        for idx, (user_id, title) in enumerate(saved_rows, 1):
            sync_save_to_neo4j(user_id, title, saved=True)
        print(f"Synced {len(saved_rows)} saved recipes to Neo4j.")

        # 3. Backfill Post Likes
        print("Querying post likes...")
        likes_res = await db.execute(
            select(PostLike.user_id, Recipe.title)
            .join(Post, PostLike.post_id == Post.id)
            .join(Recipe, Post.recipe_id == Recipe.id)
        )
        likes_rows = likes_res.all()
        for idx, (user_id, title) in enumerate(likes_rows, 1):
            sync_like_to_neo4j(user_id, title, liked=True)
        print(f"Synced {len(likes_rows)} post likes to Neo4j.")

        # 4. Backfill Follows
        print("Querying follows...")
        follows_res = await db.execute(select(Follow))
        follows = follows_res.scalars().all()
        for idx, f in enumerate(follows, 1):
            sync_follow_to_neo4j(f.follower_id, f.following_id, following=True)
        print(f"Synced {len(follows)} follows to Neo4j.")

    await engine.dispose()
    close_driver()
    print("Neo4j social backfill complete!")


if __name__ == "__main__":
    asyncio.run(backfill())
