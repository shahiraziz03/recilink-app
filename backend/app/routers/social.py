from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.neo4j import get_neo4j
from app.models.user import User, Profile
from app.models.recipe import Recipe
from app.models.social import SavedRecipe, Comment, Follow
from app.core.security import get_current_user_dep
from neo4j import Session as Neo4jSession

router = APIRouter(prefix="/social", tags=["Social"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class CommentResponse(BaseModel):
    id: int
    recipe_id: int
    user_id: int
    username: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}

class CommentCreate(BaseModel):
    content: str

class PublicProfileResponse(BaseModel):
    id: int
    username: str
    bio: Optional[str]
    avatar_url: Optional[str]
    recipes_count: int
    followers_count: int
    following_count: int
    is_following: bool

class RecipeSummary(BaseModel):
    id: int
    title: str
    image_url: Optional[str]
    cuisine: Optional[str]
    difficulty: Optional[str]
    prep_time: Optional[int]
    cook_time: Optional[int]
    saves_count: int = 0
    comments_count: int = 0
    model_config = {"from_attributes": True}


# ── Save / Unsave ──────────────────────────────────────────────────────────────

@router.post("/recipes/{recipe_id}/save")
async def toggle_save(
    recipe_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """Toggle save on a recipe. Returns new save state and total saves count."""
    result = await db.execute(
        select(SavedRecipe).where(
            SavedRecipe.user_id == current_user.id,
            SavedRecipe.recipe_id == recipe_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        saved = False
    else:
        db.add(SavedRecipe(user_id=current_user.id, recipe_id=recipe_id))
        saved = True

    await db.commit()

    count_result = await db.execute(
        select(func.count(SavedRecipe.id)).where(SavedRecipe.recipe_id == recipe_id)
    )
    saves_count = count_result.scalar_one()
    return {"saved": saved, "saves_count": saves_count}


@router.get("/recipes/{recipe_id}/is-saved")
async def is_saved(
    recipe_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedRecipe).where(
            SavedRecipe.user_id == current_user.id,
            SavedRecipe.recipe_id == recipe_id,
        )
    )
    return {"saved": result.scalar_one_or_none() is not None}


@router.get("/recipes/saved", response_model=List[RecipeSummary])
async def get_saved_recipes(
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """Return all recipes saved by the current user."""
    result = await db.execute(
        select(Recipe)
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .where(SavedRecipe.user_id == current_user.id)
        .order_by(SavedRecipe.created_at.desc())
    )
    recipes = result.scalars().all()

    if not recipes:
        return []

    ids = [r.id for r in recipes]
    saves_rows = await db.execute(
        select(SavedRecipe.recipe_id, func.count(SavedRecipe.id).label("cnt"))
        .where(SavedRecipe.recipe_id.in_(ids)).group_by(SavedRecipe.recipe_id)
    )
    saves_map = {row.recipe_id: row.cnt for row in saves_rows}

    comments_rows = await db.execute(
        select(Comment.recipe_id, func.count(Comment.id).label("cnt"))
        .where(Comment.recipe_id.in_(ids)).group_by(Comment.recipe_id)
    )
    comments_map = {row.recipe_id: row.cnt for row in comments_rows}

    result_list = []
    for r in recipes:
        item = RecipeSummary.model_validate(r)
        item.saves_count = saves_map.get(r.id, 0)
        item.comments_count = comments_map.get(r.id, 0)
        result_list.append(item)
    return result_list


# ── Comments ───────────────────────────────────────────────────────────────────

@router.get("/recipes/{recipe_id}/comments", response_model=List[CommentResponse])
async def get_comments(recipe_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment, User.username)
        .join(User, User.id == Comment.user_id)
        .where(Comment.recipe_id == recipe_id)
        .order_by(Comment.created_at.asc())
    )
    rows = result.all()
    return [
        CommentResponse(
            id=c.id, recipe_id=c.recipe_id, user_id=c.user_id,
            username=username, content=c.content, created_at=c.created_at,
        )
        for c, username in rows
    ]


@router.post("/recipes/{recipe_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    recipe_id: int,
    body: CommentCreate,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Comment cannot be empty")
    comment = Comment(recipe_id=recipe_id, user_id=current_user.id, content=body.content.strip())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentResponse(
        id=comment.id, recipe_id=comment.recipe_id, user_id=comment.user_id,
        username=current_user.username, content=comment.content, created_at=comment.created_at,
    )


# ── Follow / Unfollow ──────────────────────────────────────────────────────────

@router.post("/users/{user_id}/follow")
async def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    try:
        db.add(Follow(follower_id=current_user.id, following_id=user_id))
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return {"following": True}


@router.delete("/users/{user_id}/follow")
async def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    await db.commit()
    return {"following": False}


# ── Public Profile ─────────────────────────────────────────────────────────────

@router.get("/users/{user_id}/profile", response_model=PublicProfileResponse)
async def get_public_profile(
    user_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile_result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()

    recipes_count = (await db.execute(
        select(func.count(Recipe.id)).where(Recipe.contributor_id == user_id)
    )).scalar_one()

    followers_count = (await db.execute(
        select(func.count(Follow.id)).where(Follow.following_id == user_id)
    )).scalar_one()

    following_count = (await db.execute(
        select(func.count(Follow.id)).where(Follow.follower_id == user_id)
    )).scalar_one()

    is_following_result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    is_following = is_following_result.scalar_one_or_none() is not None

    return PublicProfileResponse(
        id=user.id,
        username=user.username,
        bio=profile.bio if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        recipes_count=recipes_count,
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following,
    )


@router.get("/users/{user_id}/recipes", response_model=List[RecipeSummary])
async def get_user_recipes(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recipe)
        .where(Recipe.contributor_id == user_id)
        .order_by(Recipe.created_at.desc())
    )
    recipes = result.scalars().all()
    if not recipes:
        return []

    ids = [r.id for r in recipes]
    saves_rows = await db.execute(
        select(SavedRecipe.recipe_id, func.count(SavedRecipe.id).label("cnt"))
        .where(SavedRecipe.recipe_id.in_(ids)).group_by(SavedRecipe.recipe_id)
    )
    saves_map = {row.recipe_id: row.cnt for row in saves_rows}

    comments_rows = await db.execute(
        select(Comment.recipe_id, func.count(Comment.id).label("cnt"))
        .where(Comment.recipe_id.in_(ids)).group_by(Comment.recipe_id)
    )
    comments_map = {row.recipe_id: row.cnt for row in comments_rows}

    result_list = []
    for r in recipes:
        item = RecipeSummary.model_validate(r)
        item.saves_count = saves_map.get(r.id, 0)
        item.comments_count = comments_map.get(r.id, 0)
        result_list.append(item)
    return result_list


# ── Personalised Feed (Neo4j ingredient-based) ────────────────────────────────

@router.get("/feed", response_model=List[RecipeSummary])
async def get_feed(
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
    neo4j: Neo4jSession = Depends(get_neo4j),
):
    """
    Feed algorithm:
    1. Find ingredients most common across user's saved recipes (Neo4j)
    2. Find recipes in Neo4j that share those ingredients (excluding already saved)
    3. Return those recipes from PostgreSQL, ordered by ingredient overlap
    """
    # Step 1 — get user's saved recipe titles
    saved_result = await db.execute(
        select(Recipe.title)
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .where(SavedRecipe.user_id == current_user.id)
    )
    saved_titles = [row[0] for row in saved_result.all()]

    if not saved_titles:
        # Cold start: return latest recipes
        result = await db.execute(select(Recipe).order_by(Recipe.created_at.desc()).limit(20))
        recipes = result.scalars().all()
    else:
        # Step 2 — find top ingredients from saved recipes in Neo4j
        top_ingredients = neo4j.run("""
            MATCH (r:Recipe)-[:CONTAINS]->(i:Ingredient)
            WHERE r.name IN $titles
            WITH i.name AS ingredient, count(*) AS freq
            ORDER BY freq DESC LIMIT 10
            RETURN ingredient
        """, titles=saved_titles).data()
        ing_names = [row["ingredient"] for row in top_ingredients]

        if not ing_names:
            result = await db.execute(select(Recipe).order_by(Recipe.created_at.desc()).limit(20))
            recipes = result.scalars().all()
        else:
            # Step 3 — find new recipes with those ingredients
            recommended = neo4j.run("""
                MATCH (r:Recipe)-[:CONTAINS]->(i:Ingredient)
                WHERE i.name IN $ings AND NOT r.name IN $saved
                WITH r.name AS recipe, count(i) AS overlap
                ORDER BY overlap DESC LIMIT 20
                RETURN recipe
            """, ings=ing_names, saved=saved_titles).data()
            rec_titles = [row["recipe"] for row in recommended]

            if not rec_titles:
                result = await db.execute(select(Recipe).order_by(Recipe.created_at.desc()).limit(20))
                recipes = result.scalars().all()
            else:
                result = await db.execute(
                    select(Recipe).where(Recipe.title.in_(rec_titles))
                )
                recipes = result.scalars().all()

    if not recipes:
        return []

    ids = [r.id for r in recipes]
    saves_rows = await db.execute(
        select(SavedRecipe.recipe_id, func.count(SavedRecipe.id).label("cnt"))
        .where(SavedRecipe.recipe_id.in_(ids)).group_by(SavedRecipe.recipe_id)
    )
    saves_map = {row.recipe_id: row.cnt for row in saves_rows}
    comments_rows = await db.execute(
        select(Comment.recipe_id, func.count(Comment.id).label("cnt"))
        .where(Comment.recipe_id.in_(ids)).group_by(Comment.recipe_id)
    )
    comments_map = {row.recipe_id: row.cnt for row in comments_rows}

    result_list = []
    for r in recipes:
        item = RecipeSummary.model_validate(r)
        item.saves_count = saves_map.get(r.id, 0)
        item.comments_count = comments_map.get(r.id, 0)
        result_list.append(item)
    return result_list
