"""
Seed PostgreSQL + Neo4j from jupyter/recilink_dataset.json.

Run from the backend/ directory:
    python seed_recilink.py

Safe on a database that already has data — each row is inserted inside a
savepoint and silently skipped on any constraint conflict.
PostgreSQL sequences are bumped after seeding so future auto-inserts don't collide.
Neo4j is seeded with MERGE (fully idempotent).
"""
import asyncio
import json
from datetime import datetime, date
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.user import User, Profile
from app.models.recipe import Recipe
from app.models.post import Post
from app.models.social import SavedRecipe, Comment, Follow
from app.core.security import hash_password
from app.db.neo4j import driver

DATASET = Path(__file__).parent.parent / "jupyter" / "recilink_dataset.json"


# ── type helpers ──────────────────────────────────────────────────────────────

def dt(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def d(s: str | None) -> date | None:
    if not s:
        return None
    return date.fromisoformat(s)


# ── savepoint helper ──────────────────────────────────────────────────────────

async def _add(db, obj, label: str = "row") -> bool:
    """Add one ORM object inside a savepoint; skip silently on any conflict."""
    try:
        async with db.begin_nested():
            db.add(obj)
            await db.flush()
        return True
    except IntegrityError:
        print(f"  Skipped {label} (conflict)")
        return False


# ── PostgreSQL ────────────────────────────────────────────────────────────────

async def seed_postgres(data: dict) -> None:
    async with SessionLocal() as db:
        async with db.begin():

            # ── users ─────────────────────────────────────────────────────────
            users = data["users"]
            print(f"\nSeeding {len(users)} users...")
            for u in users:
                await _add(db, User(
                    id=u["id"],
                    username=u["username"],
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    is_active=u["is_active"],
                    created_at=dt(u["created_at"]),
                ), f"user {u['id']} ({u['username']})")

            # ── profiles ──────────────────────────────────────────────────────
            profiles = data["profiles"]
            print(f"Seeding {len(profiles)} profiles...")
            for p in profiles:
                await _add(db, Profile(
                    id=p["id"],
                    user_id=p["user_id"],
                    bio=p.get("bio"),
                    avatar_url=p.get("avatar_url"),
                    dietary_preferences=p.get("dietary_preferences", []),
                    frequently_used_ingredients=p.get("frequently_used_ingredients", []),
                    cooking_streak=p.get("cooking_streak", 0),
                    last_checkin_date=d(p.get("last_checkin_date")),
                ), f"profile user_id={p['user_id']}")

            # ── recipes ───────────────────────────────────────────────────────
            recipes = data["recipes"]
            print(f"Seeding {len(recipes)} recipes...")
            for r in recipes:
                await _add(db, Recipe(
                    id=r["id"],
                    title=r["title"],
                    description=r.get("description"),
                    cuisine=r.get("cuisine"),
                    difficulty=r.get("difficulty"),
                    prep_time=r.get("prep_time"),
                    cook_time=r.get("cook_time"),
                    servings=r.get("servings", 4),
                    ingredients=r.get("ingredients", []),
                    steps=r.get("steps", []),
                    tags=r.get("tags", []),
                    image_url=r.get("image_url"),
                    source=r.get("source", "dataset"),
                    contributor_id=r.get("contributor_id"),
                    created_at=dt(r["created_at"]),
                ), f"recipe {r['id']} ({r['title']})")

            # ── posts ─────────────────────────────────────────────────────────
            posts = data["posts"]
            print(f"Seeding {len(posts)} posts...")
            for p in posts:
                await _add(db, Post(
                    id=p["id"],
                    recipe_id=p["recipe_id"],
                    caption=p.get("caption"),
                    cover_photo_url=p.get("cover_photo_url"),
                    posted_by_id=p["posted_by_id"],
                    created_at=dt(p["created_at"]),
                ), f"post {p['id']}")

            # ── saved_recipes ─────────────────────────────────────────────────
            saved = data["saved_recipes"]
            print(f"Seeding {len(saved)} saved recipes...")
            for s in saved:
                await _add(db, SavedRecipe(
                    id=s["id"],
                    user_id=s["user_id"],
                    recipe_id=s["recipe_id"],
                    created_at=dt(s["created_at"]),
                ), f"saved user={s['user_id']} recipe={s['recipe_id']}")

            # ── comments ──────────────────────────────────────────────────────
            comments = data["comments"]
            print(f"Seeding {len(comments)} comments...")
            for c in comments:
                await _add(db, Comment(
                    id=c["id"],
                    recipe_id=c["recipe_id"],
                    user_id=c["user_id"],
                    content=c["content"],
                    created_at=dt(c["created_at"]),
                ), f"comment {c['id']}")

            # ── follows ───────────────────────────────────────────────────────
            follows = data["follows"]
            print(f"Seeding {len(follows)} follows...")
            for f in follows:
                await _add(db, Follow(
                    id=f["id"],
                    follower_id=f["follower_id"],
                    following_id=f["following_id"],
                    created_at=dt(f["created_at"]),
                ), f"follow {f['follower_id']}→{f['following_id']}")

            # ── bump sequences ────────────────────────────────────────────────
            print("\nBumping PostgreSQL sequences...")
            for table in ("users", "profiles", "recipes", "posts",
                          "saved_recipes", "comments", "follows"):
                await db.execute(text(
                    f"SELECT setval("
                    f"  pg_get_serial_sequence('{table}', 'id'),"
                    f"  COALESCE((SELECT MAX(id) FROM {table}), 1)"
                    f")"
                ))

    print("✅ PostgreSQL seeding complete.")


# ── Neo4j ─────────────────────────────────────────────────────────────────────

def seed_neo4j(data: dict) -> None:
    neo4j = data.get("neo4j", {})

    with driver.session() as session:
        recipe_nodes = neo4j.get("recipe_nodes", [])
        print(f"\nSeeding {len(recipe_nodes)} Recipe nodes in Neo4j...")
        for n in recipe_nodes:
            session.run(
                "MERGE (r:Recipe {name: $name}) "
                "SET r.difficulty = $difficulty, r.cuisine = $cuisine",
                name=n["name"], difficulty=n["difficulty"], cuisine=n["cuisine"],
            )

        ingredient_nodes = neo4j.get("ingredient_nodes", [])
        seen: set = set()
        unique_ings = [n for n in ingredient_nodes
                       if not (n["name"] in seen or seen.add(n["name"]))]
        print(f"Seeding {len(unique_ings)} Ingredient nodes in Neo4j...")
        for n in unique_ings:
            session.run("MERGE (i:Ingredient {name: $name})", name=n["name"])

        contains = neo4j.get("contains_relationships", [])
        print(f"Seeding {len(contains)} CONTAINS relationships in Neo4j...")
        for rel in contains:
            session.run("""
                MATCH (r:Recipe {name: $recipe})
                MATCH (i:Ingredient {name: $ingredient})
                MERGE (r)-[:CONTAINS]->(i)
            """, recipe=rel["recipe"], ingredient=rel["ingredient"])

        co_occurs = neo4j.get("co_occurs_relationships", [])
        print(f"Seeding {len(co_occurs)} CO_OCCURS relationships in Neo4j...")
        for rel in co_occurs:
            session.run("""
                MATCH (i1:Ingredient {name: $i1})
                MATCH (i2:Ingredient {name: $i2})
                MERGE (i1)-[c:CO_OCCURS]->(i2)
                ON CREATE SET c.frequency = $freq
                ON MATCH  SET c.frequency = $freq
            """, i1=rel["ingredient1"], i2=rel["ingredient2"], freq=rel["frequency"])

    print("✅ Neo4j seeding complete.")


# ── entry point ───────────────────────────────────────────────────────────────

async def main() -> None:
    print(f"Loading dataset from {DATASET} ...")
    with open(DATASET) as f:
        data = json.load(f)

    await seed_postgres(data)
    seed_neo4j(data)
    print("\n🎉 All done! recilink_dataset.json has been seeded into the database.")


if __name__ == "__main__":
    asyncio.run(main())
