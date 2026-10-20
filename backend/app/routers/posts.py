from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models.post import Post
from app.models.recipe import Recipe
from app.models.user import User
from app.models.social import SavedRecipe, Comment, Follow, PostLike
from app.schemas.post import PostCreate, PostResponse, RecipeInPost, AuthorInPost
from app.core.security import get_current_user_dep, get_optional_user_dep
from app.db.neo4j import run_neo4j, normalize_title
from app.routers.recipes import sync_recipe_to_neo4j, cleanup_deleted_recipe_in_neo4j

router = APIRouter(prefix="/posts", tags=["Community Posts"])


async def _enrich_posts(posts: list, db: AsyncSession, current_user_id: Optional[int] = None) -> List[PostResponse]:
    """Attach saves_count, comments_count, likes_count, is_liked, and contributor_username to embedded recipes."""
    if not posts:
        return []

    post_ids    = [p.id for p in posts]
    recipe_ids  = [p.recipe_id for p in posts]

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

    # Likes count per post
    likes_rows = await db.execute(
        select(PostLike.post_id, func.count(PostLike.id).label("cnt"))
        .where(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
    )
    likes_map = {row.post_id: row.cnt for row in likes_rows}

    # Did current user like each post?
    liked_post_ids = set()
    if current_user_id:
        liked_rows = await db.execute(
            select(PostLike.post_id)
            .where(PostLike.post_id.in_(post_ids), PostLike.user_id == current_user_id)
        )
        liked_post_ids = {row.post_id for row in liked_rows}

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
            likes_count=likes_map.get(post.id, 0),
            is_liked=post.id in liked_post_ids,
            recipe=recipe_data,
            posted_by=AuthorInPost(id=post.posted_by.id, username=post.posted_by.username),
        ))
    return result


# ── GET /api/v1/posts  ────────────────────────────────────────────────────────

@router.get("", response_model=List[PostResponse])
async def get_community_feed(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_dep),
):
    """Community feed — returns all posts newest-first with enriched recipe data."""
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
        .order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    return await _enrich_posts(posts, db, current_user_id=current_user.id if current_user else None)

# ── GET /api/v1/posts/trending  ───────────────────────────────────────────────

@router.get("/trending", response_model=List[PostResponse])
async def get_trending_posts(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_dep),
):
    """Trending feed — posts sorted by likes + comments count (most popular first)."""
    likes_subq = (
        select(PostLike.post_id, func.count(PostLike.id).label("lc"))
        .group_by(PostLike.post_id)
        .subquery()
    )
    comments_subq = (
        select(Comment.recipe_id, func.count(Comment.id).label("cc"))
        .group_by(Comment.recipe_id)
        .subquery()
    )
    result = await db.execute(
        select(Post)
        .outerjoin(likes_subq, likes_subq.c.post_id == Post.id)
        .outerjoin(comments_subq, comments_subq.c.recipe_id == Post.recipe_id)
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
        .order_by(
            (func.coalesce(likes_subq.c.lc, 0) + func.coalesce(comments_subq.c.cc, 0)).desc(),
            Post.created_at.desc()
        )
        .limit(50)
    )
    posts = result.scalars().all()
    return await _enrich_posts(posts, db, current_user_id=current_user.id if current_user else None)


# ── GET /api/v1/posts/feed/following  ─────────────────────────────────────────

@router.get("/feed/following", response_model=List[PostResponse])
async def get_following_feed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """Following feed — posts only from users the current user follows."""
    following_ids_result = await db.execute(
        select(Follow.following_id).where(Follow.follower_id == current_user.id)
    )
    following_ids = [row.following_id for row in following_ids_result]

    if not following_ids:
        return []

    result = await db.execute(
        select(Post)
        .where(Post.posted_by_id.in_(following_ids))
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
        .order_by(Post.created_at.desc())
        .limit(50)
    )
    posts = result.scalars().all()
    return await _enrich_posts(posts, db, current_user_id=current_user.id)


# ── GET /api/v1/posts/{id}  ───────────────────────────────────────────────────

@router.get("/{post_id}", response_model=PostResponse)
async def get_post_detail(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user_dep),
):
    """Single post detail by ID with enriched recipe data."""
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.recipe), selectinload(Post.posted_by))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    enriched = await _enrich_posts([post], db, current_user_id=current_user.id if current_user else None)
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


# ── PUT /api/v1/posts/{post_id}  ───────────────────────────────────────────────────

class PostUpdate(BaseModel):
    caption: Optional[str] = None
    cover_photo_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cuisine: Optional[str] = None
    difficulty: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    ingredients: Optional[list] = None
    steps: Optional[list] = None
    tags: Optional[list] = None

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    Edit a community post and its associated recipe.
    Only the owner (author) of the post can edit it.
    If the recipe fields are modified, Neo4j is updated as well using Concept-Versioning.
    """
    # 1. Fetch post and pre-load recipe
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

    # 2. Check ownership
    if post.posted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this post")

    # 3. Update Post details
    if data.caption is not None:
        post.caption = data.caption
    if data.cover_photo_url is not None:
        post.cover_photo_url = data.cover_photo_url

    # 4. Update Recipe details if applicable
    recipe = post.recipe
    if recipe and recipe.source == "user" and recipe.contributor_id == current_user.id:
        recipe_updated = False
        old_title = recipe.title

        if data.title is not None:
            recipe.title = data.title
            recipe_updated = True
        if data.description is not None:
            recipe.description = data.description
        if data.cuisine is not None:
            recipe.cuisine = data.cuisine
            recipe_updated = True
        if data.difficulty is not None:
            recipe.difficulty = data.difficulty
            recipe_updated = True
        if data.prep_time is not None:
            recipe.prep_time = data.prep_time
        if data.cook_time is not None:
            recipe.cook_time = data.cook_time
        if data.servings is not None:
            recipe.servings = data.servings
        if data.ingredients is not None:
            recipe.ingredients = data.ingredients
            recipe_updated = True
        if data.steps is not None:
            recipe.steps = data.steps
        if data.tags is not None:
            recipe.tags = data.tags

        try:
            await db.flush()
            # Synchronize updates to Neo4j if recipe fields changed
            if recipe_updated:
                await sync_recipe_to_neo4j(recipe, db, old_title=old_title)
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise e

    else:
        # Commit post updates even if no recipe changes occurred
        await db.commit()

    await db.refresh(post)
    return post


# ── DELETE /api/v1/posts/{post_id}  ────────────────────────────────────────────────

@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    Delete a community post.
    Also deletes the recipe from PostgreSQL and Neo4j if the recipe was created by the same user.
    """
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.recipe))
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.posted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this post")

    try:
        # Clean up associated recipe if user-owned
        recipe = post.recipe
        if recipe and recipe.source == "user" and recipe.contributor_id == current_user.id:
            await cleanup_deleted_recipe_in_neo4j(recipe.id, recipe.title, db)
            
            # Delete recipe in SQL
            await db.delete(recipe)

        # Delete post
        await db.delete(post)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise e

    return None
