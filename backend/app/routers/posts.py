from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models.post import Post
from app.models.recipe import Recipe
from app.models.user import User
from app.schemas.post import PostCreate, PostResponse
from app.core.security import get_current_user_dep
from app.db.neo4j import run_neo4j, normalize_title

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

        # Synchronize updates to Neo4j if recipe fields changed
        if recipe_updated:
            recipe_node_id = f"recipe_{recipe.id}"
            
            # Detach the recipe node (does not delete the DishConcept or ingredients, just the version node)
            run_neo4j("""
                MATCH (r:Recipe {id: $recipe_node_id})
                DETACH DELETE r
            """, recipe_node_id=recipe_node_id)

            concept_name = normalize_title(recipe.title)

            # Re-create or update central DishConcept node
            run_neo4j("""
                MERGE (c:DishConcept {name: $concept_name})
                SET c.difficulty = $difficulty,
                    c.cuisine = $cuisine
            """, concept_name=concept_name, difficulty=recipe.difficulty, cuisine=recipe.cuisine)

            # Re-create Recipe node & link IS_VERSION_OF
            run_neo4j("""
                MERGE (r:Recipe {id: $recipe_node_id})
                SET r.title = $title,
                    r.difficulty = $difficulty,
                    r.cuisine = $cuisine
                WITH r
                MATCH (c:DishConcept {name: $concept_name})
                MERGE (r)-[:IS_VERSION_OF]->(c)
            """, recipe_node_id=recipe_node_id, title=recipe.title, difficulty=recipe.difficulty, cuisine=recipe.cuisine, concept_name=concept_name)

            # Re-create Ingredient nodes & link CONTAINS to the central DishConcept
            for ingredient in recipe.ingredients:
                ing_normalized = normalize_title(ingredient)
                if ing_normalized:
                    run_neo4j("""
                        MERGE (i:Ingredient {name: $name})
                        WITH i
                        MATCH (c:DishConcept {name: $concept_name})
                        MERGE (c)-[:CONTAINS]->(i)
                    """, name=ing_normalized, concept_name=concept_name)

            # Re-create co-occurrences
            run_neo4j("""
                MATCH (c:DishConcept {name: $concept_name})-[:CONTAINS]->(i1:Ingredient)
                MATCH (c)-[:CONTAINS]->(i2:Ingredient)
                WHERE i1 <> i2
                MERGE (i1)-[co:CO_OCCURS]->(i2)
                ON CREATE SET co.frequency = 1
                ON MATCH SET co.frequency = co.frequency + 1
            """, concept_name=concept_name)

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

    # Clean up associated recipe if user-owned
    recipe = post.recipe
    if recipe and recipe.source == "user" and recipe.contributor_id == current_user.id:
        recipe_node_id = f"recipe_{recipe.id}"
        # Detach specific recipe version node in Neo4j (leaves the general DishConcept alone)
        run_neo4j("""
            MATCH (r:Recipe {id: $recipe_node_id})
            DETACH DELETE r
        """, recipe_node_id=recipe_node_id)
        
        # Delete recipe in SQL
        await db.delete(recipe)

    # Delete post
    await db.delete(post)
    await db.commit()
    return None
