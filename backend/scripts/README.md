# Scripts Overview

- `reset_all.py` — drops and recreates all tables (dev only, never run in production)
- `backfill_neo4j_social.py` — syncs existing PostgreSQL data into Neo4j (run once after deploy)
- `seed_jeremy.py` — seeds test user behavior for algorithm evaluation
- `sync_neo4j.py` — manual Neo4j sync utility
- `undo_jeremy.py` — reverses Jeremy test user seed and resets recipe ownership
- `clean_orphans.py` — cleans up orphaned user recipes across PostgreSQL and Neo4j
