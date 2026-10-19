import re
from neo4j import GraphDatabase
from neo4j.exceptions import SessionExpired, ServiceUnavailable
from app.core.config import settings

# Safe connection pool limits for AuraDB free tier
driver = GraphDatabase.driver(
    settings.NEO4J_URI,
    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
    max_connection_lifetime=300,
    max_connection_pool_size=5,
)

def normalize_title(title: str) -> str:
    """
    Normalizes a recipe or concept title for Neo4j.
    Trims whitespace, lowercases, and reduces multiple spaces to a single space.
    E.g., "  Nasi   Lemak  " -> "nasi lemak"
    """
    if not title:
        return ""
    # Lowercase and replace any whitespace sequence with a single space
    cleaned = re.sub(r'\s+', ' ', title.lower().strip())
    return cleaned

def get_neo4j():
    """Dependency to get Neo4j session."""
    with driver.session() as session:
        yield session

def run_neo4j(query: str, **params):
    """
    Execute a single Neo4j query with automatic retry on SessionExpired.
    AuraDB free tier drops idle connections — this handles transparent reconnection.
    """
    for attempt in range(3):
        try:
            with driver.session() as session:
                result = session.run(query, **params)
                result.consume()  # Force query execution to catch connection drops immediately
            return
        except (SessionExpired, ServiceUnavailable) as e:
            if attempt == 2:
                raise
            # Connection was stale — driver will open a fresh one on next attempt
            continue


def run_neo4j_transaction(queries: list):
    """
    Execute a list of (query, params) tuples within a single Neo4j transaction.
    If any query fails, the entire transaction is rolled back.
    Handles stale connection retries.
    """
    for attempt in range(3):
        try:
            with driver.session() as session:
                with session.begin_transaction() as tx:
                    for query, params in queries:
                        result = tx.run(query, **(params or {}))
                        result.consume()
                    tx.commit()
            return
        except (SessionExpired, ServiceUnavailable) as e:
            if attempt == 2:
                raise
            continue


def check_neo4j_connection() -> bool:
    """
    Verifies if the Neo4j driver can connect to the database.
    Useful for health checks and startup validation.
    """
    try:
        driver.verify_connectivity()
        return True
    except Exception as e:
        print(f"Neo4j connection check failed: {e}")
        return False


def close_driver():
    """Close Neo4j driver on shutdown."""
    driver.close()