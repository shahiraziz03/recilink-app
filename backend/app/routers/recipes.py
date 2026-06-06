from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.neo4j import get_neo4j, driver, run_neo4j, normalize_title
from app.models.recipe import Recipe
from app.models.user import User
from app.models.social import SavedRecipe, Comment
from app.core.security import create_access_token, get_current_user_dep
from neo4j import Session as Neo4jSession

router = APIRouter(prefix="/recipes", tags=["Recipes"])

# --- Schemas ---

class RecipeResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    cuisine: Optional[str]
    difficulty: Optional[str]
    prep_time: Optional[int]
    cook_time: Optional[int]
    servings: Optional[int]
    ingredients: list
    steps: list
    tags: Optional[list]
    image_url: Optional[str]
    source: str
    contributor_id: Optional[int]
    contributor_username: Optional[str] = None
    saves_count: int = 0
    comments_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


async def _enrich(recipes: list, db: AsyncSession) -> List[RecipeResponse]:
    """Attach saves_count, comments_count, contributor_username to a list of Recipe ORM objects."""
    if not recipes:
        return []

    ids = [r.id for r in recipes]

    saves_rows = await db.execute(
        select(SavedRecipe.recipe_id, func.count(SavedRecipe.id).label("cnt"))
        .where(SavedRecipe.recipe_id.in_(ids))
        .group_by(SavedRecipe.recipe_id)
    )
    saves_map = {row.recipe_id: row.cnt for row in saves_rows}

    comments_rows = await db.execute(
        select(Comment.recipe_id, func.count(Comment.id).label("cnt"))
        .where(Comment.recipe_id.in_(ids))
        .group_by(Comment.recipe_id)
    )
    comments_map = {row.recipe_id: row.cnt for row in comments_rows}

    contributor_ids = list({r.contributor_id for r in recipes if r.contributor_id})
    users_map: dict = {}
    if contributor_ids:
        users_rows = await db.execute(select(User).where(User.id.in_(contributor_ids)))
        users_map = {u.id: u.username for u in users_rows.scalars()}

    result = []
    for r in recipes:
        resp = RecipeResponse.model_validate(r)
        resp.saves_count = saves_map.get(r.id, 0)
        resp.comments_count = comments_map.get(r.id, 0)
        resp.contributor_username = users_map.get(r.contributor_id) if r.contributor_id else None
        result.append(resp)
    return result

class RecipeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cuisine: Optional[str] = None
    difficulty: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = 4
    ingredients: list
    steps: list
    tags: Optional[list] = []
    image_url: Optional[str] = None

class IngredientMatchRequest(BaseModel):
    ingredients: List[str]

class MatchSuggestion(BaseModel):
    id: int
    title: str
    image_url: Optional[str]
    missing_ingredients: List[str]
    missing_count: int

# --- Endpoints ---

@router.get("", response_model=List[RecipeResponse])
async def get_recipes(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    community_only: bool = Query(False),
    dataset_only: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Browse recipes with pagination. community_only=true → user-posted only. dataset_only=true → dataset only."""
    offset = (page - 1) * limit
    query = select(Recipe)
    if community_only:
        query = query.where(Recipe.source == "user")
    elif dataset_only:
        query = query.where(Recipe.source == "dataset")
    query = query.offset(offset).limit(limit).order_by(Recipe.created_at.desc())
    result = await db.execute(query)
    return await _enrich(result.scalars().all(), db)


@router.get("/search", response_model=List[RecipeResponse])
async def search_recipes(
    q: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    dataset_only: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Search and filter recipes by title, cuisine or difficulty."""
    query = select(Recipe)
    if dataset_only:
        query = query.where(Recipe.source == "dataset")
    if q:
        query = query.where(Recipe.title.ilike(f"%{q}%"))
    if cuisine:
        query = query.where(Recipe.cuisine == cuisine)
    if difficulty:
        query = query.where(Recipe.difficulty == difficulty)

    result = await db.execute(query.order_by(Recipe.created_at.desc()))
    return await _enrich(result.scalars().all(), db)


@router.post("/match", response_model=List[MatchSuggestion])
async def match_recipes(
    data: IngredientMatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Find recipes the user can almost cook — missing only 1–3 ingredients."""
    user_ings = {i.lower().strip() for i in data.ingredients if i.strip()}
    if not user_ings:
        return []

    result = await db.execute(select(Recipe))
    recipes = result.scalars().all()

    suggestions: List[MatchSuggestion] = []
    for recipe in recipes:
        recipe_ings: List[str] = [str(i) for i in (recipe.ingredients or [])]

        missing = [
            ing for ing in recipe_ings
            if not any(
                u in ing.lower() or ing.lower() in u
                for u in user_ings
            )
        ]

        if 1 <= len(missing) <= 3:
            suggestions.append(MatchSuggestion(
                id=recipe.id,
                title=recipe.title,
                image_url=recipe.image_url,
                missing_ingredients=missing,
                missing_count=len(missing),
            ))

    suggestions.sort(key=lambda x: x.missing_count)
    return suggestions[:12]


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    """Get single recipe detail by ID."""
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    enriched = await _enrich([recipe], db)
    return enriched[0]


@router.post("", response_model=RecipeResponse, status_code=201)
async def create_recipe(
    data: RecipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    User submits a new recipe.
    Saves to PostgreSQL AND updates Neo4j graph with Concept-Versioning structure.
    """
    # 1. Save to PostgreSQL
    normalized_title_val = normalize_title(data.title)
    new_recipe = Recipe(
        title=normalized_title_val,
        description=data.description,
        cuisine=data.cuisine,
        difficulty=data.difficulty,
        prep_time=data.prep_time,
        cook_time=data.cook_time,
        servings=data.servings,
        ingredients=data.ingredients,
        steps=data.steps,
        tags=data.tags,
        image_url=data.image_url,
        source="user",
        contributor_id=current_user.id,
    )
    db.add(new_recipe)
    await db.commit()
    await db.refresh(new_recipe)

    # Normalize name for central Concept Node
    concept_name = normalized_title_val

    # 2. Add to Neo4j graph using Concept-Versioning Architecture
    # 2a. MERGE central DishConcept node
    run_neo4j("""
        MERGE (c:DishConcept {name: $concept_name})
        SET c.difficulty = $difficulty,
            c.cuisine = $cuisine
    """, concept_name=concept_name, difficulty=data.difficulty, cuisine=data.cuisine)

    # 2b. CREATE specific Recipe version node (linked to SQL id)
    recipe_node_id = f"recipe_{new_recipe.id}"
    run_neo4j("""
        MERGE (r:Recipe {id: $recipe_node_id})
        SET r.title = $title,
            r.difficulty = $difficulty,
            r.cuisine = $cuisine
        WITH r
        MATCH (c:DishConcept {name: $concept_name})
        MERGE (r)-[:IS_VERSION_OF]->(c)
    """, recipe_node_id=recipe_node_id, title=normalized_title_val, difficulty=data.difficulty, cuisine=data.cuisine, concept_name=concept_name)

    # 2c. Add Ingredient nodes + CONTAINS relationships attached to central DishConcept node
    for ingredient in data.ingredients:
        ing_normalized = normalize_title(ingredient)
        if ing_normalized:
            run_neo4j("""
                MERGE (i:Ingredient {name: $name})
                WITH i
                MATCH (c:DishConcept {name: $concept_name})
                MERGE (c)-[:CONTAINS]->(i)
            """, name=ing_normalized, concept_name=concept_name)

    # 2d. Update CO_OCCURS relationships between ingredients of the central concept
    run_neo4j("""
        MATCH (c:DishConcept {name: $concept_name})-[:CONTAINS]->(i1:Ingredient)
        MATCH (c)-[:CONTAINS]->(i2:Ingredient)
        WHERE i1 <> i2
        MERGE (i1)-[co:CO_OCCURS]->(i2)
        ON CREATE SET co.frequency = 1
        ON MATCH SET co.frequency = co.frequency + 1
    """, concept_name=concept_name)

    return new_recipe


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: int,
    data: RecipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """Update an existing recipe. Only the contributor can edit it."""
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.contributor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised to edit this recipe")

    recipe.title = data.title
    recipe.description = data.description
    recipe.cuisine = data.cuisine
    recipe.difficulty = data.difficulty
    recipe.prep_time = data.prep_time
    recipe.cook_time = data.cook_time
    recipe.servings = data.servings
    recipe.ingredients = data.ingredients
    recipe.steps = data.steps
    recipe.tags = data.tags
    recipe.image_url = data.image_url

    await db.commit()
    await db.refresh(recipe)
    return recipe