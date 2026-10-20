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


def sync_user_to_neo4j(user_id: int, username: str) -> None:
    """MERGE a User node. Safe to call on every login/register."""
    try:
        run_neo4j(
            "MERGE (u:User {id: $id}) SET u.username = $username",
            id=user_id, username=username
        )
    except Exception:
        pass


def sync_save_to_neo4j(user_id: int, recipe_title: str, saved: bool) -> None:
    """MERGE or DELETE a (User)-[:SAVED]->(Recipe) edge."""
    try:
        if saved:
            run_neo4j("""
                MERGE (u:User {id: $uid})
                MERGE (r:Recipe {name: $title})
                MERGE (u)-[:SAVED]->(r)
            """, uid=user_id, title=recipe_title)
        else:
            run_neo4j("""
                MATCH (u:User {id: $uid})-[s:SAVED]->(r:Recipe {name: $title})
                DELETE s
            """, uid=user_id, title=recipe_title)
    except Exception:
        pass


def sync_like_to_neo4j(user_id: int, recipe_title: str, liked: bool) -> None:
    """MERGE or DELETE a (User)-[:LIKED]->(Recipe) edge."""
    try:
        if liked:
            run_neo4j("""
                MERGE (u:User {id: $uid})
                MERGE (r:Recipe {name: $title})
                MERGE (u)-[:LIKED]->(r)
            """, uid=user_id, title=recipe_title)
        else:
            run_neo4j("""
                MATCH (u:User {id: $uid})-[l:LIKED]->(r:Recipe {name: $title})
                DELETE l
            """, uid=user_id, title=recipe_title)
    except Exception:
        pass


def sync_follow_to_neo4j(follower_id: int, following_id: int,
                          following: bool) -> None:
    """MERGE or DELETE a (User)-[:FOLLOWS]->(User) edge."""
    try:
        if following:
            run_neo4j("""
                MERGE (a:User {id: $frid})
                MERGE (b:User {id: $fgid})
                MERGE (a)-[:FOLLOWS]->(b)
            """, frid=follower_id, fgid=following_id)
        else:
            run_neo4j("""
                MATCH (a:User {id: $frid})-[f:FOLLOWS]->(b:User {id: $fgid})
                DELETE f
            """, frid=follower_id, fgid=following_id)
    except Exception:
        pass


def get_personalized_recipe_scores(user_id: int, session) -> dict:
    """
    Runs the four personalization Cypher queries and returns a dict of:
      { recipe_name: { "combined_score": float, "reason": str, "cuisine_bonuses": dict } }
    Returns an empty dict if there is no data at all.
    """
    try:
        # Query 1 — collaborative filtering
        q1 = session.run("""
            MATCH (me:User {id: $uid})-[:SAVED]->(r:Recipe)<-[:SAVED]-(similar:User)
            WHERE similar.id <> $uid
            MATCH (similar)-[:SAVED]->(rec:Recipe)
            WHERE NOT (me)-[:SAVED]->(rec) AND NOT (me)-[:LIKED]->(rec)
            RETURN rec.name AS recipe_name, count(similar) AS score
            ORDER BY score DESC LIMIT 10
        """, uid=user_id).data()

        # Query 2 — social graph boost
        q2 = session.run("""
            MATCH (me:User {id: $uid})-[:FOLLOWS]->(friend:User)
            MATCH (friend)-[:SAVED|LIKED]->(rec:Recipe)
            WHERE NOT (me)-[:SAVED]->(rec) AND NOT (me)-[:LIKED]->(rec)
            RETURN rec.name AS recipe_name, count(friend) AS score
            ORDER BY score DESC LIMIT 10
        """, uid=user_id).data()

        # Query 3 — cuisine affinity
        q3 = session.run("""
            MATCH (me:User {id: $uid})-[:SAVED|LIKED]->(r:Recipe)
            WHERE r.cuisine IS NOT NULL
            RETURN r.cuisine AS cuisine, count(r) AS cuisine_count
            ORDER BY cuisine_count DESC LIMIT 3
        """, uid=user_id).data()

        # Query 4 — popularity fallback
        q4 = session.run("""
            MATCH (u:User)-[:SAVED]->(r:Recipe)
            WHERE u.id <> $uid
            RETURN r.name AS recipe_name, count(u) AS score
            ORDER BY score DESC LIMIT 10
        """, uid=user_id).data()

        # Build scores dict from q1 and q2
        raw = {}
        for row in q1:
            name = row.get("recipe_name")
            if name:
                raw.setdefault(name, {"collab": 0, "social": 0})
                raw[name]["collab"] = row.get("score", 0)
        for row in q2:
            name = row.get("recipe_name")
            if name:
                raw.setdefault(name, {"collab": 0, "social": 0})
                raw[name]["social"] = row.get("score", 0)

        # Fallback to q4 if empty
        use_fallback = not raw
        if use_fallback:
            for row in q4:
                name = row.get("recipe_name")
                if name:
                    raw[name] = {"collab": row.get("score", 0), "social": 0}

        if not raw:
            return {}

        # Cuisine bonuses from q3
        top_cuisines = [r["cuisine"].strip().lower() for r in q3 if r.get("cuisine")]
        bonuses = {}
        for i, c in enumerate(top_cuisines[:3]):
            bonuses[c] = [0.2, 0.1, 0.05][i]

        result = {}
        for name, sc in raw.items():
            if use_fallback:
                combined = round(sc["collab"] * 0.4, 2)
                reason = "Popular right now"
            else:
                collab, social = sc["collab"], sc["social"]
                combined = round((collab * 0.4) + (social * 0.4), 2)
                if social > 0 and collab > 0:
                    reason = "Popular with cooks like you"
                elif social > 0:
                    reason = "Saved by people you follow"
                else:
                    reason = "Based on similar cooks"
            result[name] = {"combined_score": combined, "reason": reason,
                            "cuisine_bonuses": bonuses}
        return result
    except Exception:
        return {}

