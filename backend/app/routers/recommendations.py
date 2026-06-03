from fastapi import APIRouter, Depends
from neo4j import Session
from app.db.neo4j import get_neo4j
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
    
    query = """
        MATCH (i:Ingredient)
        WHERE i.name CONTAINS $q
        RETURN i.name AS ingredient
        ORDER BY i.name ASC
        LIMIT 10
    """
    results = session.run(query, q=q.lower().strip()).data()
    return {"ingredients": [r["ingredient"] for r in results]}


@router.post("/recipes")
def recommend_recipes(data: IngredientsInput, session: Session = Depends(get_neo4j)):
    """
    Recommend recipes based on user's ingredients.
    Uses ingredient matching + Jaccard Similarity from Neo4j graph.
    """
    # Step 1 — ingredient matching
    match_query = """
        MATCH (r:Recipe)-[:CONTAINS]->(i:Ingredient)
        WHERE i.name IN $ingredients
        WITH r, count(i) AS matched_ingredients
        ORDER BY matched_ingredients DESC
        RETURN r.name AS recipe,
               r.difficulty AS difficulty,
               r.cuisine AS cuisine,
               matched_ingredients
        LIMIT 10
    """

    # Step 2 — Jaccard similarity
    jaccard_query = """
        MATCH (r:Recipe)-[:CONTAINS]->(i:Ingredient)
        WHERE i.name IN $ingredients
        WITH r, count(i) AS intersection
        MATCH (r)-[:CONTAINS]->(all_i:Ingredient)
        WITH r, intersection, count(all_i) AS recipe_total
        WITH r, intersection,
             (recipe_total + $user_count - intersection) AS union_count
        WITH r,
             toFloat(intersection) / toFloat(union_count) AS jaccard
        ORDER BY jaccard DESC
        RETURN r.name AS recipe,
               r.difficulty AS difficulty,
               round(jaccard * 100) / 100 AS jaccard_score
        LIMIT 5
    """

    match_results = session.run(
        match_query,
        ingredients=data.ingredients
    ).data()

    jaccard_results = session.run(
        jaccard_query,
        ingredients=data.ingredients,
        user_count=len(data.ingredients)
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
        ingredients=data.ingredients
    ).data()

    return {"suggestions": results}


@router.get("/ingredients/{ingredient_name}/cooccurrences")
def get_cooccurrences(ingredient_name: str, session: Session = Depends(get_neo4j)):
    """
    Get top co-occurring ingredients for a given ingredient.
    """
    query = """
        MATCH (i1:Ingredient {name: $name})-[c:CO_OCCURS]->(i2:Ingredient)
        RETURN i2.name AS ingredient, c.frequency AS frequency
        ORDER BY frequency DESC
        LIMIT 5
    """

    results = session.run(query, name=ingredient_name).data()
    return {"ingredient": ingredient_name, "cooccurrences": results}