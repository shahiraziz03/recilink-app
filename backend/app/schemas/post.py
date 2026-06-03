from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Nested schemas ────────────────────────────────────────────────────────────

class RecipeInPost(BaseModel):
    """Minimal recipe info embedded inside a PostResponse."""
    id: int
    title: str
    cuisine: Optional[str]
    difficulty: Optional[str]
    prep_time: Optional[int]
    cook_time: Optional[int]
    image_url: Optional[str]
    ingredients: list
    steps: list
    tags: Optional[list]

    model_config = {"from_attributes": True}


class AuthorInPost(BaseModel):
    """Minimal user info embedded inside a PostResponse."""
    id: int
    username: str

    model_config = {"from_attributes": True}


# ── Request schemas ───────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    """
    Payload the frontend sends to POST /api/v1/posts.
    recipe_id must already exist (created first via POST /api/v1/recipes).
    """
    recipe_id: int
    caption: Optional[str] = None
    cover_photo_url: Optional[str] = None


# ── Response schemas ──────────────────────────────────────────────────────────

class PostResponse(BaseModel):
    """Full post detail — used by GET /posts and GET /posts/{id}."""
    id: int
    caption: Optional[str]
    cover_photo_url: Optional[str]
    created_at: datetime

    recipe: RecipeInPost
    posted_by: AuthorInPost

    model_config = {"from_attributes": True}
