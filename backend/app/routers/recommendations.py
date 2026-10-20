from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from neo4j import Session
from app.db.neo4j import get_neo4j, normalize_title
from app.db.session import get_db
from app.models.recipe import Recipe
from app.models.social import SavedRecipe, Comment
from app.models.user import User
from app.core.security import get_current_user
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


@router.get("/personalized")
async def get_personalized_feed(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_neo4j),
    db: AsyncSession = Depends(get_db),
):
    """
    Personalized recipe feed using the Neo4j social graph:
    1. Collaborative filtering (similar users' saves)
    2. Social graph boost (people you follow)
    3. Cuisine affinity bonus (top 3 cuisines from saves/likes)
    4. Popularity fallback
    """
    uid = current_user.id

    # Query 1 — collaborative filtering
    q1_query = """
        MATCH (me:User {id: $uid})-[:SAVED]->(r:Recipe)<-[:SAVED]-(similar:User)
        WHERE similar.id <> $uid
        MATCH (similar)-[:SAVED]->(rec:Recipe)
        WHERE NOT (me)-[:SAVED]->(rec) AND NOT (me)-[:LIKED]->(rec)
        RETURN rec.name AS recipe_name, count(similar) AS score
        ORDER BY score DESC LIMIT 10
    """
    q1_results = session.run(q1_query, uid=uid).data()

    # Query 2 — social graph boost (people you follow)
    q2_query = """
        MATCH (me:User {id: $uid})-[:FOLLOWS]->(friend:User)
        MATCH (friend)-[:SAVED|LIKED]->(rec:Recipe)
        WHERE NOT (me)-[:SAVED]->(rec) AND NOT (me)-[:LIKED]->(rec)
        RETURN rec.name AS recipe_name, count(friend) AS score
        ORDER BY score DESC LIMIT 10
    """
    q2_results = session.run(q2_query, uid=uid).data()

    # Query 3 — cuisine affinity (top 3 cuisines from user's saves/likes)
    q3_query = """
        MATCH (me:User {id: $uid})-[:SAVED|LIKED]->(r:Recipe)
        WHERE r.cuisine IS NOT NULL
        RETURN r.cuisine AS cuisine, count(r) AS cuisine_count
        ORDER BY cuisine_count DESC LIMIT 3
    """
    q3_results = session.run(q3_query, uid=uid).data()

    # Query 4 — popularity fallback (used when queries 1 and 2 return nothing)
    q4_query = """
        MATCH (u:User)-[:SAVED]->(r:Recipe)
        WHERE u.id <> $uid
        RETURN r.name AS recipe_name, count(u) AS score
        ORDER BY score DESC LIMIT 10
    """
    q4_results = session.run(q4_query, uid=uid).data()

    # Score combiner logic in Python:
    # Build a dict of {recipe_name: {collab: 0, social: 0}} from queries 1 and 2.
    scores = {}
    for row in q1_results:
        name = row.get("recipe_name")
        if not name:
            continue
        if name not in scores:
            scores[name] = {"collab": 0, "social": 0}
        scores[name]["collab"] = row.get("score", 0)

    for row in q2_results:
        name = row.get("recipe_name")
        if not name:
            continue
        if name not in scores:
            scores[name] = {"collab": 0, "social": 0}
        scores[name]["social"] = row.get("score", 0)

    # If that dict is empty, use query 4 results with reason "Popular right now".
    recipe_reasons = {}
    combined_scores = {}

    if not scores:
        for row in q4_results:
            name = row.get("recipe_name")
            if not name:
                continue
            score = row.get("score", 0)
            scores[name] = {"collab": score, "social": 0}
            combined_scores[name] = round(score * 0.4, 2)
            recipe_reasons[name] = "Popular right now"
    else:
        for name, sc in scores.items():
            collab = sc["collab"]
            social = sc["social"]
            combined = round((collab * 0.4) + (social * 0.4), 2)
            combined_scores[name] = combined
            if social > 0 and collab > 0:
                recipe_reasons[name] = "Popular with cooks like you"
            elif social > 0:
                recipe_reasons[name] = "Saved by people you follow"
            elif collab > 0:
                recipe_reasons[name] = "Based on similar cooks"
            else:
                recipe_reasons[name] = "Popular right now"

    if not scores:
        return {"recipes": [], "message": "Save some recipes to get personalised recommendations."}

    # After scoring, run one PostgreSQL query to look up all recipe names:
    recipe_names = list(scores.keys())
    lower_names = [n.lower() for n in recipe_names]
    pg_result = await db.execute(
        select(Recipe).where(
            (Recipe.title.in_(recipe_names)) | (func.lower(Recipe.title).in_(lower_names))
        )
    )
    recipes = pg_result.scalars().all()

    if not recipes:
        return {"recipes": [], "message": "Save some recipes to get personalised recommendations."}

    def get_score_and_reason(title):
        if title in combined_scores:
            return combined_scores[title], recipe_reasons[title]
        t_lower = title.lower()
        for n in recipe_names:
            if n.lower() == t_lower:
                return combined_scores[n], recipe_reasons[n]
        return 0.0, "Popular right now"

    # Sort results by combined_score descending
    recipes = sorted(recipes, key=lambda r: get_score_and_reason(r.title)[0], reverse=True)

    # Cuisine affinity from query 3:
    # If the user has top cuisines, give +0.2 bonus to top cuisine, +0.1 for second, +0.05 for third.
    top_cuisines = [row["cuisine"] for row in q3_results if row.get("cuisine")]
    cuisine_bonuses = {}
    if len(top_cuisines) > 0 and top_cuisines[0]:
        cuisine_bonuses[top_cuisines[0].strip().lower()] = 0.2
    if len(top_cuisines) > 1 and top_cuisines[1]:
        cuisine_bonuses[top_cuisines[1].strip().lower()] = 0.1
    if len(top_cuisines) > 2 and top_cuisines[2]:
        cuisine_bonuses[top_cuisines[2].strip().lower()] = 0.05

    results = []
    seen_ids = set()
    for r in recipes:
        if r.id in seen_ids:
            continue
        seen_ids.add(r.id)

        base_score, reason = get_score_and_reason(r.title)
        bonus = 0.0
        if r.cuisine:
            bonus = cuisine_bonuses.get(r.cuisine.strip().lower(), 0.0)
        final_score = round(base_score + bonus, 2)

        results.append({
            "id": r.id,
            "title": r.title,
            "cuisine": r.cuisine,
            "difficulty": r.difficulty,
            "prep_time": r.prep_time,
            "cook_time": r.cook_time,
            "image_url": r.image_url,
            "combined_score": final_score,
            "reason": reason,
        })

    # Re-sort after the bonus
    results.sort(key=lambda x: x["combined_score"], reverse=True)

    if not results:
        return {"recipes": [], "message": "Save some recipes to get personalised recommendations."}

    return results[:12]

