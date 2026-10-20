from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.neo4j import get_neo4j, sync_save_to_neo4j, sync_like_to_neo4j, sync_follow_to_neo4j
from app.models.user import User, Profile
from app.models.recipe import Recipe
from app.models.post import Post
from app.models.social import SavedRecipe, Comment, Follow, PostLike
from app.core.security import get_current_user_dep, get_optional_user_dep
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
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cooking_streak: int = 0
    recipes_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False

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

    recipe = await db.get(Recipe, recipe_id)
    if recipe:
        try:
            sync_save_to_neo4j(current_user.id, recipe.title, saved=saved)
        except Exception:
            pass

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
        try:
            sync_follow_to_neo4j(current_user.id, user_id, following=True)
        except Exception:
            pass
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
    try:
        sync_follow_to_neo4j(current_user.id, user_id, following=False)
    except Exception:
        pass
    return {"following": False}


# ── Public Profile ─────────────────────────────────────────────────────────────

@router.get("/users/{user_id}/profile", response_model=PublicProfileResponse)
async def get_public_profile(
    user_id: int,
    current_user: Optional[User] = Depends(get_optional_user_dep),
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

    is_following = False
    if current_user:
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
        cooking_streak=profile.cooking_streak if (profile and profile.cooking_streak) else 0,
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


# ── Like / Unlike Post ────────────────────────────────────────────────────────

@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user_dep),
    db: AsyncSession = Depends(get_db),
):
    """Toggle like on a post. Returns new like state and total likes count."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(PostLike).where(PostLike.user_id == current_user.id, PostLike.post_id == post_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        liked = False
    else:
        try:
            db.add(PostLike(user_id=current_user.id, post_id=post_id))
            await db.commit()
            liked = True
        except IntegrityError:
            await db.rollback()
            liked = True

    recipe = await db.get(Recipe, post.recipe_id)
    if recipe:
        try:
            sync_like_to_neo4j(current_user.id, recipe.title, liked=liked)
        except Exception:
            pass

    count_result = await db.execute(
        select(func.count(PostLike.id)).where(PostLike.post_id == post_id)
    )
    likes_count = count_result.scalar_one()
    return {"liked": liked, "likes_count": likes_count}


# ── User Posts (for public profile page) ─────────────────────────────────────

class PostSummary(BaseModel):
    """Minimal post info for displaying on a user's profile grid."""
    id: int
    cover_photo_url: Optional[str] = None
    recipe_image_url: Optional[str] = None
    recipe_title: Optional[str] = None
    recipe_cuisine: Optional[str] = None
    recipe_difficulty: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime

@router.get("/users/{user_id}/posts", response_model=List[PostSummary])
async def get_user_posts(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get all community posts by a specific user — used for their public profile grid."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Post)
        .where(Post.posted_by_id == user_id)
        .options(selectinload(Post.recipe))
        .order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    if not posts:
        return []

    post_ids = [p.id for p in posts]
    recipe_ids = [p.recipe_id for p in posts]

    likes_rows = await db.execute(
        select(PostLike.post_id, func.count(PostLike.id).label("cnt"))
        .where(PostLike.post_id.in_(post_ids)).group_by(PostLike.post_id)
    )
    likes_map = {row.post_id: row.cnt for row in likes_rows}

    comments_rows = await db.execute(
        select(Comment.recipe_id, func.count(Comment.id).label("cnt"))
        .where(Comment.recipe_id.in_(recipe_ids)).group_by(Comment.recipe_id)
    )
    comments_map = {row.recipe_id: row.cnt for row in comments_rows}

    return [
        PostSummary(
            id=p.id,
            cover_photo_url=p.cover_photo_url,
            recipe_image_url=p.recipe.image_url if p.recipe else None,
            recipe_title=p.recipe.title if p.recipe else None,
            recipe_cuisine=p.recipe.cuisine if p.recipe else None,
            recipe_difficulty=p.recipe.difficulty if p.recipe else None,
            likes_count=likes_map.get(p.id, 0),
            comments_count=comments_map.get(p.recipe_id, 0),
            created_at=p.created_at,
        )
        for p in posts
    ]


# ── Followers / Following Lists ───────────────────────────────────────────────

class UserMini(BaseModel):
    """Minimal user info for followers/following list."""
    id: int
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

@router.get("/users/{user_id}/followers", response_model=List[UserMini])
async def get_followers(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get the list of users who follow this user."""
    rows = await db.execute(
        select(User, Profile)
        .join(Follow, Follow.follower_id == User.id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(Follow.following_id == user_id)
        .order_by(Follow.created_at.desc())
    )
    return [
        UserMini(id=u.id, username=u.username, avatar_url=p.avatar_url if p else None, bio=p.bio if p else None)
        for u, p in rows.all()
    ]

@router.get("/users/{user_id}/following", response_model=List[UserMini])
async def get_following(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get the list of users this user follows."""
    rows = await db.execute(
        select(User, Profile)
        .join(Follow, Follow.following_id == User.id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
    )
    return [
        UserMini(id=u.id, username=u.username, avatar_url=p.avatar_url if p else None, bio=p.bio if p else None)
        for u, p in rows.all()
    ]
