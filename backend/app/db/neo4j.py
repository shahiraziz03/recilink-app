from neo4j import GraphDatabase
from app.core.config import settings

# Neo4j driver instance
driver = GraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
)

def get_neo4j():
    """Dependency to get Neo4j session."""
    with driver.session() as session:
        yield session

def close_driver():
    """Close Neo4j driver on shutdown."""
    driver.close()