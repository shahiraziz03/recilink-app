from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.models.post import Post
from app.models.recipe import Recipe
from app.models.user import User
from app.models.social import SavedRecipe, Comment
from app.schemas.post import PostCreate, PostResponse, RecipeInPost, AuthorInPost
from app.core.security import get_current_user_dep

router = APIRouter(prefix="/posts", tags=["Community Posts"])


async def _enrich_posts(posts: list, db: AsyncSession) -> List[PostResponse]:
    """Attach saves_count, comments_count, and contributor_username to embedded recipes."""
    if not posts:
        return []

    recipe_ids = [p.recipe_id for p in posts]

    saves_rows = await db.execute(
        select(SavedRecipe.recipe_id, func.count(SavedRecipe.id).label("cnt"))
        .where(SavedRecipe.recipe_id.in_(recipe_ids))
        .group_by(SavedRecipe.recipe_id)
    )
    saves_map = {row.recipe_id: row.cnt for row in saves_rows}

    comments_rows = await db.execute(
        select(Comment.recipe_id, func.count(Comment.id).label("cnt"))
        .where(Comment.recipe_id.in_(recipe_ids))
        .group_by(Comment.recipe_id)
    )
    comments_map = {row.recipe_id: row.cnt for row in comments_rows}

    contributor_ids = list({p.recipe.contributor_id for p in posts if p.recipe and p.recipe.contributor_id})
    users_map: dict = {}
    if contributor_ids:
        users_rows = await db.execute(select(User).where(User.id.in_(contributor_ids)))
        users_map = {u.id: u.username for u in users_rows.scalars()}

    result = []
    for post in posts:
        r = post.recipe
        recipe_data = RecipeInPost(
            id=r.id,
            title=r.title,
            description=r.description,
            cuisine=r.cuisine,
            difficulty=r.difficulty,
            prep_time=r.prep_time,
            cook_time=r.cook_time,
            image_url=r.image_url,
            ingredients=r.ingredients or [],
            steps=r.steps or [],
            tags=r.tags,
            contributor_id=r.contributor_id,
            contributor_username=users_map.get(r.contributor_id) if r.contributor_id else None,
            saves_count=saves_map.get(r.id, 0),
            comments_count=comments_map.get(r.id, 0),
        )
        result.append(PostResponse(
            id=post.id,
            caption=post.caption,
            cover_photo_url=post.cover_photo_url,
            created_at=post.created_at,
            recipe=recipe_data,
            posted_by=AuthorInPost(id=post.posted_by.id, username=post.posted_by.username),
        ))
    return result


# ── GET /api/v1/posts  ────────────────────────────────────────────────────────

@router.get("", response_model=List[PostResponse])
async def get_community_feed(db: AsyncSession = Depends(get_db)):
    """Community feed — returns all posts newest-first with enriched recipe data."""
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
        .order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    return await _enrich_posts(posts, db)


# ── GET /api/v1/posts/{id}  ───────────────────────────────────────────────────

@router.get("/{post_id}", response_model=PostResponse)
async def get_post_detail(post_id: int, db: AsyncSession = Depends(get_db)):
    """Single post detail by ID with enriched recipe data."""
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    enriched = await _enrich_posts([post], db)
    return enriched[0]


# ── POST /api/v1/posts  ───────────────────────────────────────────────────────

@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    Create a community post linked to an existing recipe.
    Flow: frontend first creates recipe via POST /recipes, then calls this with the recipe_id.
    Requires: Bearer JWT token.
    """
    result = await db.execute(select(Recipe).where(Recipe.id == data.recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    new_post = Post(
        recipe_id=data.recipe_id,
        caption=data.caption,
        cover_photo_url=data.cover_photo_url,
        posted_by_id=current_user.id,
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)

    result = await db.execute(
        select(Post)
        .where(Post.id == new_post.id)
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
    )
    post = result.scalar_one()
    enriched = await _enrich_posts([post], db)
    return enriched[0]
