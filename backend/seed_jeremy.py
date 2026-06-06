"""
Run once to create the Jeremy account and assign all orphaned recipes to him.
    python seed_jeremy.py
"""
import asyncio
from sqlalchemy import select, update
from app.db.session import SessionLocal as AsyncSessionLocal
from app.models.user import User, Profile
from app.models.recipe import Recipe
from app.core.security import hash_password


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # ── Check if Jeremy already exists ─────────────────────
        result = await db.execute(select(User).where(User.username == "jeremy"))
        jeremy = result.scalar_one_or_none()

        if not jeremy:
            jeremy = User(
                username="jeremy",
                email="jeremy@recilink.com",
                hashed_password=hash_password("jeremy"),
                is_active=True,
            )
            db.add(jeremy)
            await db.flush()          # get jeremy.id before committing

            profile = Profile(
                user_id=jeremy.id,
                bio="Home chef & recipe curator. Here to inspire your next meal. 🍳",
                cooking_streak=0,
            )
            db.add(profile)
            print(f"Created user: jeremy (id={jeremy.id})")
        else:
            print(f"Jeremy already exists (id={jeremy.id})")

        # ── Assign orphaned recipes to Jeremy ──────────────────
        await db.execute(
            update(Recipe)
            .where(Recipe.contributor_id == None)
            .values(contributor_id=jeremy.id)
        )
        await db.commit()
        print("Orphaned recipes assigned to Jeremy.")


if __name__ == "__main__":
    asyncio.run(seed())
