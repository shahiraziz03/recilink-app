import os
import sys
import json
import asyncio
import argparse
from pathlib import Path

# Ensure backend root is in sys.path and is current working directory (for .env loading)
BACKEND_DIR = Path(__file__).resolve().parent.parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select
from app.db.session import SessionLocal, engine
from app.core.config import settings
from app.models.user import User
from app.models.post import Post
from app.models.social import SavedRecipe, Comment
from app.models.recipe import Recipe
from app.routers.recipes import sync_recipe_to_neo4j, cleanup_deleted_recipe_in_neo4j
from app.db.neo4j import normalize_title

DEFAULT_RECIPES_DIR = BACKEND_DIR.parent / "tiktok-scraper" / "recipes"
SOURCE_NAME = "khairulaming_tiktok"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Import Khairul Aming TikTok recipes into ReciLink PostgreSQL & Neo4j."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be inserted, touch nothing.",
    )
    parser.add_argument(
        "--skip-flagged",
        action="store_true",
        help="Skip recipes where needs_review=true.",
    )
    parser.add_argument(
        "--undo",
        action="store_true",
        help="Delete all recipes with source 'khairulaming_tiktok' and clean them from Neo4j.",
    )
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip confirmation prompt and proceed immediately.",
    )
    parser.add_argument(
        "--recipes-dir",
        type=Path,
        default=DEFAULT_RECIPES_DIR,
        help="Directory containing recipe JSON files.",
    )
    return parser.parse_args()


async def handle_undo(db, dry_run: bool):
    stmt = select(Recipe).where(Recipe.source == SOURCE_NAME)
    res = await db.execute(stmt)
    recipes = res.scalars().all()

    print(f"\nFound {len(recipes)} recipes in PostgreSQL with source '{SOURCE_NAME}'.")
    if not recipes:
        print("No recipes to undo.")
        return

    if dry_run:
        print(f"\n[DRY RUN] Would delete {len(recipes)} recipes from PostgreSQL and Neo4j:")
        for r in recipes:
            print(f"  - Would delete: ID={r.id} Title='{r.title}'")
        print("\n[DRY RUN] Completed. No changes made.")
        return

    deleted_count = 0
    for r in recipes:
        try:
            await cleanup_deleted_recipe_in_neo4j(r.id, r.title, db)
            await db.delete(r)
            await db.commit()
            deleted_count += 1
            print(f"  [DELETED] ID={r.id} '{r.title}' from PostgreSQL and Neo4j")
        except Exception as e:
            await db.rollback()
            print(f"  [ERROR] Failed to delete ID={r.id} '{r.title}': {e}")

    print(f"\nUndo completed: {deleted_count}/{len(recipes)} recipes deleted.")


async def main():
    args = parse_args()
    engine.echo = False  # Suppress raw SQL statements for clean CLI output

    # 1. Print DB connection details
    print("=" * 60)
    print("DATABASE CONNECTION:")
    print(f"  Host:     {settings.POSTGRES_SERVER}")
    print(f"  Port:     {settings.POSTGRES_PORT}")
    print(f"  Database: {settings.POSTGRES_DB}")
    if args.dry_run:
        print("  Mode:     DRY RUN (Touch nothing)")
    elif args.undo:
        print("  Mode:     UNDO (Delete khairulaming_tiktok recipes)")
    else:
        print("  Mode:     IMPORT")
    print("=" * 60)

    # 2. Confirmation prompt (skipped if dry-run or --yes)
    if not args.dry_run and not args.yes:
        try:
            confirm = input("Type 'yes' to proceed: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(0)

        if confirm != "yes":
            print("Aborted by user.")
            sys.exit(0)

    async with SessionLocal() as db:
        # Handle --undo
        if args.undo:
            await handle_undo(db, args.dry_run)
            return

        recipes_dir = args.recipes_dir
        if not recipes_dir.exists():
            print(f"Error: Recipes directory not found at {recipes_dir}")
            sys.exit(1)

        json_files = sorted(list(recipes_dir.glob("*.json")))
        total_files = len(json_files)
        print(f"\nFound {total_files} recipe files in {recipes_dir}\n")

        # Fetch existing titles for idempotency
        stmt = select(Recipe.title).where(Recipe.source == SOURCE_NAME)
        res = await db.execute(stmt)
        existing_titles = set(res.scalars().all())
        existing_titles_lower = {t.strip().lower() for t in existing_titles if t}

        inserted_count = 0
        skipped_count = 0
        skipped_not_recipe = 0
        skipped_duplicate = 0
        skipped_flagged = 0
        total_flagged = 0
        without_image_count = 0

        for idx, file_path in enumerate(json_files, 1):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                print(f"[{idx}/{total_files}] Failed to read {file_path.name}: {e}")
                skipped_count += 1
                continue

            # Skip if is_recipe is false
            if data.get("is_recipe") is False:
                print(f"[{idx}/{total_files}] [SKIP - NOT RECIPE] {file_path.name}: is_recipe=false")
                skipped_count += 1
                skipped_not_recipe += 1
                continue

            title = (data.get("title") or "").strip()
            if not title:
                print(f"[{idx}/{total_files}] [SKIP - NO TITLE] {file_path.name}")
                skipped_count += 1
                continue

            # Flag tracking
            is_flagged = bool(data.get("needs_review"))
            if is_flagged:
                total_flagged += 1

            if args.skip_flagged and is_flagged:
                print(f"[{idx}/{total_files}] [SKIP - FLAGGED] '{title}' (needs_review=true)")
                skipped_count += 1
                skipped_flagged += 1
                continue

            # Idempotency check: skip if title already exists with source khairulaming_tiktok
            title_key = title.lower()
            if title_key in existing_titles_lower:
                print(f"[{idx}/{total_files}] [SKIP - ALREADY EXISTS] '{title}'")
                skipped_count += 1
                skipped_duplicate += 1
                continue

            # Normalize ingredients using normalize_title(), matching create_recipe
            raw_ingredients = data.get("ingredients") or []
            ingredients_normalized = [
                normalize_title(ing)
                for ing in raw_ingredients
                if normalize_title(ing)
            ]

            # Map ingredient_details from ingredients_detailed (name, quantity, unit, note)
            raw_details = data.get("ingredients_detailed") or []
            ingredient_details = [
                {
                    "name": item.get("name"),
                    "quantity": item.get("quantity"),
                    "unit": item.get("unit") or None,
                    "note": item.get("note") or None,
                }
                for item in raw_details
            ] if raw_details else None

            video_id = str(data.get("video_id") or "").strip()
            source_url = f"https://www.tiktok.com/@khairulaming/video/{video_id}" if video_id else None

            # Track image_url status
            image_url = None
            if image_url is None:
                without_image_count += 1

            # Build Recipe model
            recipe = Recipe(
                title=title,
                description=data.get("description"),
                cuisine=data.get("cuisine"),
                difficulty=data.get("difficulty"),
                prep_time=data.get("prep_time"),
                cook_time=data.get("cook_time"),
                servings=data.get("servings"),
                ingredients=ingredients_normalized,
                ingredient_details=ingredient_details,
                steps=data.get("steps") or [],
                tags=data.get("tags") or [],
                image_url=image_url,
                source_url=source_url,
                source=SOURCE_NAME,
                contributor_id=None,
            )

            if args.dry_run:
                flag_str = " [FLAGGED]" if is_flagged else ""
                print(f"[{idx}/{total_files}] [DRY RUN - WOULD INSERT]{flag_str} '{title}'")
                print(f"       Source URL: {source_url}")
                print(f"       Ingredients ({len(ingredients_normalized)}): {', '.join(ingredients_normalized[:4])}...")
                print(f"       Details: {len(ingredient_details) if ingredient_details else 0} items | Steps: {len(recipe.steps)}")
                inserted_count += 1
                existing_titles_lower.add(title_key)
            else:
                try:
                    db.add(recipe)
                    await db.flush()
                    await sync_recipe_to_neo4j(recipe, db)
                    await db.commit()
                    inserted_count += 1
                    existing_titles_lower.add(title_key)
                    flag_str = " [FLAGGED]" if is_flagged else ""
                    print(f"[{idx}/{total_files}] [INSERTED]{flag_str} ID={recipe.id} '{title}'")
                except Exception as e:
                    await db.rollback()
                    print(f"[{idx}/{total_files}] [ERROR] Failed to insert '{title}': {e}")
                    skipped_count += 1

        # Summary
        print("\n" + "=" * 60)
        mode_header = "IMPORT SUMMARY (DRY RUN - TOUCHED NOTHING)" if args.dry_run else "IMPORT SUMMARY"
        print(mode_header)
        print("=" * 60)
        print(f"  Total files processed:  {total_files}")
        if args.dry_run:
            print(f"  Would be inserted:      {inserted_count}")
        else:
            print(f"  Successfully inserted:  {inserted_count}")
        print(f"  Skipped:                {skipped_count}")
        if skipped_not_recipe > 0:
            print(f"    - Not a recipe:       {skipped_not_recipe}")
        if skipped_duplicate > 0:
            print(f"    - Duplicate in DB:    {skipped_duplicate}")
        if skipped_flagged > 0:
            print(f"    - Flagged review:     {skipped_flagged}")
        print(f"  Flagged (needs_review): {total_flagged}")
        print(f"  Without image:          {without_image_count}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
