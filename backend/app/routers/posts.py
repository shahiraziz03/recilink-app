from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.post import Post
from app.models.recipe import Recipe
from app.models.user import User
from app.schemas.post import PostCreate, PostResponse
from app.core.security import get_current_user_dep

router = APIRouter(prefix="/posts", tags=["Community Posts"])


# ── GET /api/v1/posts  ────────────────────────────────────────────────────────

@router.get("", response_model=List[PostResponse])
async def get_community_feed(db: AsyncSession = Depends(get_db)):
    """
    Community feed — returns all posts newest-first.
    Each post includes the recipe details and the author's username.
    No authentication required (public feed).
    """
    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.recipe),
            selectinload(Post.posted_by),
        )
        .order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    return posts


# ── GET /api/v1/posts/{id}  ───────────────────────────────────────────────────

@router.get("/{post_id}", response_model=PostResponse)
async def get_post_detail(post_id: int, db: AsyncSession = Depends(get_db)):
    """
    Single post detail by ID.
    Returns the post with its recipe and author info.
    No authentication required (public).
    """
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(
            selectinload(Post.recipe),
            selectinload(Post.posted_by),
        )
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return post


# ── POST /api/v1/posts  ───────────────────────────────────────────────────────

@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    Create a community post linked to an existing recipe.

    Flow (handled automatically by backend):
      1. Frontend calls POST /api/v1/recipes  → recipe is created, recipe_id returned
      2. Frontend calls POST /api/v1/posts    → this endpoint links the post to that recipe

    From the user's perspective this is ONE action — they just click "Post Recipe".

    Requires: Bearer JWT token in Authorization header.
    """
    # Verify the recipe exists
    result = await db.execute(select(Recipe).where(Recipe.id == data.recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Create the post (social layer)
    new_post = Post(
        recipe_id=data.recipe_id,
        caption=data.caption,
        cover_photo_url=data.cover_photo_url,
        posted_by_id=current_user.id,
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)

    # Reload with relationships so the response includes recipe + author
    result = await db.execute(
        select(Post)
        .where(Post.id == new_post.id)
        .options(
            selectinload(Post.recipe),
            selectinload(Post.posted_by),
        )
    )
    return result.scalar_one()
