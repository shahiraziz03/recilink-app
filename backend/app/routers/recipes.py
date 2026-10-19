from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.neo4j import get_neo4j, driver, run_neo4j, run_neo4j_transaction, normalize_title
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

        max_missing = 5 if len(user_ings) <= 2 else 3
        if 1 <= len(missing) <= max_missing:
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


async def sync_recipe_to_neo4j(recipe: Recipe, db: AsyncSession, old_title: Optional[str] = None):
    """
    Syncs a recipe version, its parent DishConcept, and associated ingredients to Neo4j.
    Cleans up orphaned DishConcepts, ingredients, and updates co-occurrence frequencies.
    Uses a single transaction to guarantee atomicity in Neo4j.
    """
    recipe_node_id = f"recipe_{recipe.id}"
    concept_name = normalize_title(recipe.title)

    # 1. Fetch all recipes sharing this concept to compute correct ingredients set
    concept_recipes_result = await db.execute(
        select(Recipe).where(Recipe.title == recipe.title)
    )
    concept_recipes = concept_recipes_result.scalars().all()
    
    all_ingredients = set()
    for r in concept_recipes:
        for ing in (r.ingredients or []):
            ing_norm = normalize_title(ing)
            if ing_norm:
                all_ingredients.add(ing_norm)

    # Compile all Cypher queries to execute in one transaction
    queries = []

    # A. Detach and delete specific recipe version node in Neo4j
    queries.append((
        """
        MATCH (r:Recipe {id: $recipe_node_id})
        DETACH DELETE r
        """,
        {"recipe_node_id": recipe_node_id}
    ))

    # B. Clean up old concept if it is now orphaned
    if old_title and old_title != recipe.title:
        old_concept_name = normalize_title(old_title)
        if old_concept_name:
            queries.append((
                """
                MATCH (c:DishConcept {name: $concept_name})
                WHERE NOT (()-[:IS_VERSION_OF]->(c))
                DETACH DELETE c
                """,
                {"concept_name": old_concept_name}
            ))

    # C. MERGE central DishConcept node
    queries.append((
        """
        MERGE (c:DishConcept {name: $concept_name})
        SET c.difficulty = $difficulty,
            c.cuisine = $cuisine
        """,
        {"concept_name": concept_name, "difficulty": recipe.difficulty, "cuisine": recipe.cuisine}
    ))

    # D. CREATE specific Recipe version node (linked to SQL id) and link to central DishConcept
    queries.append((
        """
        MERGE (r:Recipe {id: $recipe_node_id})
        SET r.title = $title,
            r.difficulty = $difficulty,
            r.cuisine = $cuisine
        WITH r
        MATCH (c:DishConcept {name: $concept_name})
        MERGE (r)-[:IS_VERSION_OF]->(c)
        """,
        {
            "recipe_node_id": recipe_node_id,
            "title": recipe.title,
            "difficulty": recipe.difficulty,
            "cuisine": recipe.cuisine,
            "concept_name": concept_name
        }
    ))

    # E. Clear current ingredients relationships for this DishConcept
    queries.append((
        """
        MATCH (c:DishConcept {name: $concept_name})-[rel:CONTAINS]->()
        DELETE rel
        """,
        {"concept_name": concept_name}
    ))

    # F. Re-create correct Ingredient nodes & link CONTAINS to the central DishConcept
    for ingredient in all_ingredients:
        queries.append((
            """
            MERGE (i:Ingredient {name: $name})
            WITH i
            MATCH (c:DishConcept {name: $concept_name})
            MERGE (c)-[:CONTAINS]->(i)
            """,
            {"name": ingredient, "concept_name": concept_name}
        ))

    # G. Rebuild co-occurrences for the whole graph
    queries.append((
        """
        MATCH ()-[co:CO_OCCURS]->()
        DELETE co
        """,
        {}
    ))
    queries.append((
        """
        MATCH (c:DishConcept)-[:CONTAINS]->(i1:Ingredient)
        MATCH (c)-[:CONTAINS]->(i2:Ingredient)
        WHERE i1 <> i2
        MERGE (i1)-[co:CO_OCCURS]->(i2)
        ON CREATE SET co.frequency = 1
        ON MATCH SET co.frequency = co.frequency + 1
        """,
        {}
    ))

    # H. Clean up any orphaned Ingredient nodes
    queries.append((
        """
        MATCH (i:Ingredient)
        WHERE NOT (i)--()
        DELETE i
        """,
        {}
    ))

    # Execute all Neo4j queries in a single transaction
    run_neo4j_transaction(queries)


async def cleanup_deleted_recipe_in_neo4j(recipe_id: int, title: str, db: AsyncSession):
    """
    Cleans up a deleted recipe version in Neo4j.
    Deletes the specific version node, checks if the DishConcept is orphaned (and deletes it),
    and if the concept remains, updates its ingredient set, co-occurrences, and orphaned ingredients.
    Uses a single transaction to guarantee atomicity in Neo4j.
    """
    recipe_node_id = f"recipe_{recipe_id}"
    concept_name = normalize_title(title)

    # 1. Fetch remaining recipes sharing this concept from SQL
    concept_recipes_result = await db.execute(
        select(Recipe).where(Recipe.title == title, Recipe.id != recipe_id)
    )
    remaining_recipes = concept_recipes_result.scalars().all()

    queries = []

    # A. Detach and delete specific recipe version node in Neo4j
    queries.append((
        """
        MATCH (r:Recipe {id: $recipe_node_id})
        DETACH DELETE r
        """,
        {"recipe_node_id": recipe_node_id}
    ))

    if concept_name:
        # B. Clean up DishConcept if it is now orphaned (no other Recipe versions link to it)
        queries.append((
            """
            MATCH (c:DishConcept {name: $concept_name})
            WHERE NOT (()-[:IS_VERSION_OF]->(c))
            DETACH DELETE c
            """,
            {"concept_name": concept_name}
        ))

        # C. If concept still exists (because of remaining recipes), update its ingredients
        if remaining_recipes:
            all_ingredients = set()
            for r in remaining_recipes:
                for ing in (r.ingredients or []):
                    ing_norm = normalize_title(ing)
                    if ing_norm:
                        all_ingredients.add(ing_norm)

            # Clear current ingredients relationships for this DishConcept
            queries.append((
                """
                MATCH (c:DishConcept {name: $concept_name})-[rel:CONTAINS]->()
                DELETE rel
                """,
                {"concept_name": concept_name}
            ))

            # Re-create correct Ingredient nodes & link CONTAINS to the central DishConcept
            for ingredient in all_ingredients:
                queries.append((
                    """
                    MERGE (i:Ingredient {name: $name})
                    WITH i
                    MATCH (c:DishConcept {name: $concept_name})
                    MERGE (c)-[:CONTAINS]->(i)
                    """,
                    {"name": ingredient, "concept_name": concept_name}
                ))

        # D. Rebuild co-occurrences for the whole graph
        queries.append((
            """
            MATCH ()-[co:CO_OCCURS]->()
            DELETE co
            """,
            {}
        ))
        queries.append((
            """
            MATCH (c:DishConcept)-[:CONTAINS]->(i1:Ingredient)
            MATCH (c)-[:CONTAINS]->(i2:Ingredient)
            WHERE i1 <> i2
            MERGE (i1)-[co:CO_OCCURS]->(i2)
            ON CREATE SET co.frequency = 1
            ON MATCH SET co.frequency = co.frequency + 1
            """,
            {}
        ))

        # E. Clean up any orphaned Ingredient nodes
        queries.append((
            """
            MATCH (i:Ingredient)
            WHERE NOT (i)--()
            DELETE i
            """,
            {}
        ))

    # Execute all Neo4j queries in a single transaction
    run_neo4j_transaction(queries)




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
        ingredients=[normalize_title(ing) for ing in data.ingredients if normalize_title(ing)],
        steps=data.steps,
        tags=data.tags,
        image_url=data.image_url,
        source="user",
        contributor_id=current_user.id,
    )
    db.add(new_recipe)
    
    try:
        await db.flush()
        # 2. Add to Neo4j graph using unified sync function
        await sync_recipe_to_neo4j(new_recipe, db)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise e

    await db.refresh(new_recipe)
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

    recipe_updated = False
    old_title = recipe.title
    normalized_new_title = normalize_title(data.title)

    # Trace changes to see if we need to sync with Neo4j
    normalized_ingredients = [normalize_title(ing) for ing in data.ingredients if normalize_title(ing)]
    if (recipe.title != normalized_new_title or 
        recipe.cuisine != data.cuisine or 
        recipe.difficulty != data.difficulty or 
        recipe.ingredients != normalized_ingredients):
        recipe_updated = True

    recipe.title = normalized_new_title
    recipe.description = data.description
    recipe.cuisine = data.cuisine
    recipe.difficulty = data.difficulty
    recipe.prep_time = data.prep_time
    recipe.cook_time = data.cook_time
    recipe.servings = data.servings
    recipe.ingredients = normalized_ingredients
    recipe.steps = data.steps
    recipe.tags = data.tags
    recipe.image_url = data.image_url

    try:
        await db.flush()
        # If key details changed, synchronize to Neo4j
        if recipe_updated:
            await sync_recipe_to_neo4j(recipe, db, old_title=old_title)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise e

    await db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    Delete a user-contributed recipe directly.
    Only the contributor can delete it.
    Cleans up associated Neo4j nodes (Recipe, DishConcept, Ingredient) atomically.
    """
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe.source != "user" or recipe.contributor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised to delete this recipe")

    try:
        # 1. Clean up Neo4j atomically
        await cleanup_deleted_recipe_in_neo4j(recipe.id, recipe.title, db)
        
        # 2. Delete in PostgreSQL
        await db.delete(recipe)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise e

    return None