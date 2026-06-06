"""
Reverses the Jeremy seed:
  - Sets contributor_id = NULL for every recipe Jeremy owns (all dataset recipes)
  - Deletes his Profile and User rows

Run from the backend/ directory:
    python undo_jeremy.py
"""
import asyncio
from sqlalchemy import select, update, delete
from app.db.session import SessionLocal as AsyncSessionLocal
from app.models.user import User, Profile
from app.models.recipe import Recipe


async def cleanup() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "jeremy"))
        jeremy = result.scalar_one_or_none()

        if not jeremy:
            print("Jeremy not found — nothing to do.")
            return

        print(f"Found Jeremy (id={jeremy.id})")

        # Return all his recipes to orphaned / dataset state
        await db.execute(
            update(Recipe)
            .where(Recipe.contributor_id == jeremy.id)
            .values(contributor_id=None)
        )
        print("Reset contributor_id → NULL for all Jeremy's recipes.")

        # Remove profile (FK) then user
        await db.execute(delete(Profile).where(Profile.user_id == jeremy.id))
        await db.execute(delete(User).where(User.id == jeremy.id))

        await db.commit()
        print("Jeremy removed successfully.")


if __name__ == "__main__":
    asyncio.run(cleanup())
