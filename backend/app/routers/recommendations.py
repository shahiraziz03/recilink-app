from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from neo4j import Session
from app.db.neo4j import get_neo4j, normalize_title
from app.db.session import get_db
from app.models.recipe import Recipe
from app.models.social import SavedRecipe, Comment
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# Request schema
class IngredientsInput(BaseModel):
    ingredients: List[str]


@router.get("/popular-ingredients")
def get_popular_ingredients(session: Session = Depends(get_neo4j)):
    """
    Returns the top 10 most common ingredients across the entire Neo4j graph,
    ranked by total co-occurrence frequency.
    Dynamically generated — gets smarter as more recipes are added.
    """
    query = """
        MATCH (i:Ingredient)-[c:CO_OCCURS]->()
        RETURN i.name AS ingredient, sum(c.frequency) AS total_frequency
        ORDER BY total_frequency DESC
        LIMIT 10
    """
    results = session.run(query).data()
    return {"popular_ingredients": [r["ingredient"] for r in results]}


@router.get("/ingredients/search")
def search_ingredients(q: str = "", session: Session = Depends(get_neo4j)):
    """
    Find ingredients matching a query string (case-insensitive fuzzy match using regex/contains).
    Helps power the autocomplete dropdown in the frontend.
    """
    if not q.strip():
        return {"ingredients": []}
    
    q_norm = normalize_title(q)
    query = """
        MATCH (i:Ingredient)
        WHERE toLower(i.name) CONTAINS toLower($q)
        RETURN i.name AS ingredient
        ORDER BY i.name ASC
        LIMIT 10
    """
    results = session.run(query, q=q_norm).data()
    return {"ingredients": [r["ingredient"] for r in results]}


@router.post("/recipes")
def recommend_recipes(data: IngredientsInput, session: Session = Depends(get_neo4j)):
    """
    Recommend recipes based on user's ingredients.
    Uses ingredient matching + Jaccard Similarity from Neo4j graph.
    Queries the central DishConcept instead of specific Recipe version nodes,
    allowing multiple versions of the same recipe title to share concepts.
    """
    # Normalize inputs
    normalized_inputs = [normalize_title(ing) for ing in data.ingredients if normalize_title(ing)]

    # Step 1 — ingredient matching via central DishConcept
    match_query = """
        MATCH (c:DishConcept)-[:CONTAINS]->(i:Ingredient)
        WHERE i.name IN $ingredients
        WITH c, count(i) AS matched_ingredients
        ORDER BY matched_ingredients DESC
        RETURN c.name AS recipe,
               c.difficulty AS difficulty,
               c.cuisine AS cuisine,
               matched_ingredients
        LIMIT 10
    """

    # Step 2 — Jaccard similarity via central DishConcept
    jaccard_query = """
        MATCH (c:DishConcept)-[:CONTAINS]->(i:Ingredient)
        WHERE i.name IN $ingredients
        WITH c, count(i) AS intersection
        MATCH (c)-[:CONTAINS]->(all_i:Ingredient)
        WITH c, intersection, count(all_i) AS recipe_total
        WITH c, intersection,
             (recipe_total + $user_count - intersection) AS union_count
        WITH c,
             toFloat(intersection) / toFloat(union_count) AS jaccard
        ORDER BY jaccard DESC
        RETURN c.name AS recipe,
               c.difficulty AS difficulty,
               round(jaccard * 100) / 100 AS jaccard_score
        LIMIT 5
    """

    match_results = session.run(
        match_query,
        ingredients=normalized_inputs
    ).data()

    jaccard_results = session.run(
        jaccard_query,
        ingredients=normalized_inputs,
        user_count=len(normalized_inputs)
    ).data()

    return {
        "ingredient_matches": match_results,
        "jaccard_scores": jaccard_results
    }


@router.post("/grocery")
def suggest_groceries(data: IngredientsInput, session: Session = Depends(get_neo4j)):
    """
    Suggest groceries based on ingredient co-occurrence in the graph.
    """
    normalized_inputs = [normalize_title(ing) for ing in data.ingredients if normalize_title(ing)]

    grocery_query = """
        MATCH (i1:Ingredient)-[c:CO_OCCURS]->(i2:Ingredient)
        WHERE i1.name IN $ingredients
        AND NOT i2.name IN $ingredients
        WITH i2.name AS suggested_ingredient,
             sum(c.frequency) AS total_frequency
        ORDER BY total_frequency DESC
        RETURN suggested_ingredient, total_frequency
        LIMIT 5
    """

    results = session.run(
        grocery_query,
        ingredients=normalized_inputs
    ).data()

    return {"suggestions": results}


@router.get("/ingredients/{ingredient_name}/cooccurrences")
def get_cooccurrences(ingredient_name: str, session: Session = Depends(get_neo4j)):
    """
    Get top co-occurring ingredients for a given ingredient.
    """
    normalized_ing = normalize_title(ingredient_name)
    query = """
        MATCH (i1:Ingredient {name: $name})-[c:CO_OCCURS]->(i2:Ingredient)
        RETURN i2.name AS ingredient, c.frequency AS frequency
        ORDER BY frequency DESC
        LIMIT 5
    """

    results = session.run(query, name=normalized_ing).data()
    return {"ingredient": ingredient_name, "cooccurrences": results}


@router.get("/recipes/{recipe_id}/similar")
async def get_similar_recipes(
    recipe_id: int,
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    neo4j: Session = Depends(get_neo4j),
):
    """
    Find recipes similar to a given recipe using Neo4j ingredient Jaccard similarity.

    Algorithm:
    1. Fetch the recipe's title from PostgreSQL.
    2. In Neo4j, compute Jaccard similarity between the target recipe's ingredient set
       and every other recipe's ingredient set via CO_OCCURS relationships.
    3. Return the top-N most similar recipes from PostgreSQL, enriched with
       saves/comments counts.
    """
    # ── 1. Get target recipe ───────────────────────────────────────────────────
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # ── 2. Neo4j — Jaccard similarity on ingredient sets ──────────────────────
    neo4j_results = neo4j.run("""
        MATCH (target:Recipe {name: $title})-[:CONTAINS]->(ti:Ingredient)
        WITH collect(ti.name) AS target_ings

        MATCH (other:Recipe)-[:CONTAINS]->(si:Ingredient)
        WHERE si.name IN target_ings AND other.name <> $title
        WITH other, count(si) AS shared, size(target_ings) AS target_total

        MATCH (other)-[:CONTAINS]->(oi:Ingredient)
        WITH other, shared, target_total, count(oi) AS other_total

        WITH other,
             shared,
             toFloat(shared) / toFloat(other_total + target_total - shared) AS jaccard
        ORDER BY jaccard DESC
        LIMIT $limit
        RETURN other.name AS recipe_name, jaccard, shared AS shared_ingredients
    """, title=recipe.title, limit=limit).data()

    if not neo4j_results:
        return []

    # ── 3. Look up matched titles in PostgreSQL ────────────────────────────────
    recipe_titles = [r["recipe_name"] for r in neo4j_results]
    pg_result = await db.execute(
        select(Recipe).where(Recipe.title.in_(recipe_titles))
    )
    similar = pg_result.scalars().all()

    if not similar:
        return []

    # Sort by descending Jaccard score
    score_map = {r["recipe_name"]: r["jaccard"] for r in neo4j_results}
    similar.sort(key=lambda r: score_map.get(r.title, 0), reverse=True)

    # ── 4. Enrich with saves / comments counts ─────────────────────────────────
    ids = [r.id for r in similar]

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

    return [
        {
            "id": r.id,
            "title": r.title,
            "cuisine": r.cuisine,
            "difficulty": r.difficulty,
            "prep_time": r.prep_time,
            "cook_time": r.cook_time,
            "image_url": r.image_url,
            "saves_count": saves_map.get(r.id, 0),
            "comments_count": comments_map.get(r.id, 0),
            "jaccard_score": round(score_map.get(r.title, 0), 3),
            "shared_ingredients": next(
                (x["shared_ingredients"] for x in neo4j_results if x["recipe_name"] == r.title), 0
            ),
        }
        for r in similar
    ]
