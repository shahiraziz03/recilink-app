import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.models.post import Post
from app.models.recipe import Recipe
from app.db.neo4j import run_neo4j, normalize_title

async def sync():
    print("Connecting to PostgreSQL and fetching all recipes...")
    async with SessionLocal() as db:
        result = await db.execute(select(Recipe))
        recipes = result.scalars().all()
        
    print(f"Found {len(recipes)} recipes in PostgreSQL. Starting Neo4j synchronization...")
    
    print("Clearing existing data in Neo4j to ensure clean synchronization...")
    run_neo4j("MATCH (n) DETACH DELETE n")
    
    for idx, recipe in enumerate(recipes, 1):
        concept_name = normalize_title(recipe.title)
        if not concept_name:
            continue
            
        print(f"[{idx}/{len(recipes)}] Syncing: {recipe.title} (ID: {recipe.id})")
        
        # 1. MERGE central DishConcept node
        run_neo4j("""
            MERGE (c:DishConcept {name: $concept_name})
            SET c.difficulty = $difficulty,
                c.cuisine = $cuisine
        """, concept_name=concept_name, difficulty=recipe.difficulty, cuisine=recipe.cuisine)

        # 2. CREATE specific Recipe version node (linked to SQL id)
        recipe_node_id = f"recipe_{recipe.id}"
        run_neo4j("""
            MERGE (r:Recipe {id: $recipe_node_id})
            SET r.title = $title,
                r.difficulty = $difficulty,
                r.cuisine = $cuisine
            WITH r
            MATCH (c:DishConcept {name: $concept_name})
            MERGE (r)-[:IS_VERSION_OF]->(c)
        """, recipe_node_id=recipe_node_id, title=recipe.title, difficulty=recipe.difficulty, cuisine=recipe.cuisine, concept_name=concept_name)

        # 3. Add Ingredient nodes + CONTAINS relationships attached to central DishConcept node
        for ingredient in recipe.ingredients:
            ing_normalized = normalize_title(ingredient)
            if ing_normalized:
                run_neo4j("""
                    MERGE (i:Ingredient {name: $name})
                    WITH i
                    MATCH (c:DishConcept {name: $concept_name})
                    MERGE (c)-[:CONTAINS]->(i)
                """, name=ing_normalized, concept_name=concept_name)

        # 4. Update CO_OCCURS relationships between ingredients of the central concept
        run_neo4j("""
            MATCH (c:DishConcept {name: $concept_name})-[:CONTAINS]->(i1:Ingredient)
            MATCH (c)-[:CONTAINS]->(i2:Ingredient)
            WHERE i1 <> i2
            MERGE (i1)-[co:CO_OCCURS]->(i2)
            ON CREATE SET co.frequency = 1
            ON MATCH SET co.frequency = co.frequency + 1
        """, concept_name=concept_name)

    print("SUCCESS: Neo4j graph is now fully synchronized with PostgreSQL!")

if __name__ == "__main__":
    asyncio.run(sync())
