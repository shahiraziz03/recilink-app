from fastapi import APIRouter, Depends
from neo4j import Session
from app.db.neo4j import get_neo4j, normalize_title
from pydantic import BaseModel
from typing import List

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