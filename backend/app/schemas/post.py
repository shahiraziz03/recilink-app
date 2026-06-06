from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Nested schemas ────────────────────────────────────────────────────────────

class RecipeInPost(BaseModel):
    """Recipe info embedded inside a PostResponse."""
    id: int
    title: str
    description: Optional[str] = None
    cuisine: Optional[str] = None
    difficulty: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    image_url: Optional[str] = None
    ingredients: list = []
    steps: list = []
    tags: Optional[list] = None
    contributor_id: Optional[int] = None
    contributor_username: Optional[str] = None
    saves_count: int = 0
    comments_count: int = 0

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
