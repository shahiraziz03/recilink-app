#!/usr/bin/env python3
"""Generate recipes_ka_review.csv, recipes_ka_insert.sql, recipes_ka_map.json from all recipe JSONs."""
import json, os, csv, io

BASE  = os.path.dirname(__file__)
RDIR  = os.path.join(BASE, "recipes")
CSVF  = os.path.join(BASE, "recipes_ka_review.csv")
SQLF  = os.path.join(BASE, "recipes_ka_insert.sql")
MAPF  = os.path.join(BASE, "recipes_ka_map.json")

# ── Load all recipe JSONs, sorted by video_id for stable ordering ─────────
files = sorted(f for f in os.listdir(RDIR) if f.endswith(".json"))
recipes = []
for fn in files:
    with open(os.path.join(RDIR, fn), encoding="utf-8") as f:
        recipes.append(json.load(f))

TIKTOK_BASE = "https://www.tiktok.com/@khairulaming/video/"

# ── STEP 3: recipes_ka_review.csv (UTF-8 BOM) ─────────────────────────────
with open(CSVF, "w", encoding="utf-8-sig", newline="") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=[
        "video_id","title","is_recipe","needs_review","review_notes",
        "ingredient_count","step_count","link"
    ])
    writer.writeheader()
    for r in recipes:
        writer.writerow({
            "video_id":         r["video_id"],
            "title":            r["title"],
            "is_recipe":        str(r["is_recipe"]).lower(),
            "needs_review":     str(r.get("needs_review", False)).lower(),
            "review_notes":     r.get("review_notes",""),
            "ingredient_count": len(r.get("ingredients_detailed", [])),
            "step_count":       len(r.get("steps", [])),
            "link":             TIKTOK_BASE + r["video_id"],
        })
print(f"Wrote {CSVF}")

# ── STEP 4a: recipes_ka_insert.sql ────────────────────────────────────────
def sql_str(v):
    """Escape a Python value for SQL. None -> NULL."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

CREATE_TABLE = """\
CREATE TABLE IF NOT EXISTS recipes_ka (
    id                SERIAL PRIMARY KEY,
    video_id          VARCHAR(25)  NOT NULL,
    title             TEXT         NOT NULL,
    title_ms          TEXT,
    description       TEXT,
    description_ms    TEXT,
    cuisine           VARCHAR(100),
    difficulty        VARCHAR(20),
    prep_time         INTEGER,
    cook_time         INTEGER,
    servings          INTEGER,
    ingredients       JSONB,
    ingredients_detailed JSONB,
    steps             JSONB,
    steps_ms          JSONB,
    tags              JSONB,
    is_recipe         BOOLEAN      NOT NULL DEFAULT TRUE,
    needs_review      BOOLEAN      NOT NULL DEFAULT FALSE,
    review_notes      TEXT,
    contributor_id    INTEGER,
    image_url         TEXT,
    source            VARCHAR(100),
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);\n
"""

sql_rows = []
for r in recipes:
    if not r.get("is_recipe", True):
        continue  # skip non-recipe videos
    row_cols = [
        "video_id","title","title_ms","description","description_ms",
        "cuisine","difficulty","prep_time","cook_time","servings",
        "ingredients","ingredients_detailed","steps","steps_ms","tags",
        "is_recipe","needs_review","review_notes",
        "contributor_id","image_url","source"
    ]
    vals = [
        sql_str(r.get("video_id")),
        sql_str(r.get("title")),
        sql_str(r.get("title_ms")),
        sql_str(r.get("description")),
        sql_str(r.get("description_ms")),
        sql_str(r.get("cuisine")),
        sql_str(r.get("difficulty")),
        sql_str(r.get("prep_time")),
        sql_str(r.get("cook_time")),
        sql_str(r.get("servings")),
        sql_str(json.dumps(r.get("ingredients", []), ensure_ascii=False)),
        sql_str(json.dumps(r.get("ingredients_detailed", []), ensure_ascii=False)),
        sql_str(json.dumps(r.get("steps", []), ensure_ascii=False)),
        sql_str(json.dumps(r.get("steps_ms", []), ensure_ascii=False)),
        sql_str(json.dumps(r.get("tags", []), ensure_ascii=False)),
        sql_str(r.get("is_recipe", True)),
        sql_str(r.get("needs_review", False)),
        sql_str(r.get("review_notes")),
        "2",    # contributor_id
        "NULL", # image_url
        sql_str("khairulaming_tiktok"),
    ]
    sql_rows.append(
        f"INSERT INTO recipes_ka ({', '.join(row_cols)})\nVALUES ({', '.join(vals)});"
    )

with open(SQLF, "w", encoding="utf-8") as f:
    f.write("-- recipes_ka: CREATE TABLE + INSERTs\n")
    f.write("-- contributor_id=2 | source='khairulaming_tiktok'\n")
    f.write("-- Do NOT run without reviewing recipes_ka_review.csv first.\n\n")
    f.write("BEGIN;\n\n")
    f.write(CREATE_TABLE)
    f.write("\n".join(sql_rows))
    f.write("\n\nCOMMIT;\n")
print(f"Wrote {SQLF}  ({len(sql_rows)} INSERTs)")

# ── STEP 4b: recipes_ka_map.json (title -> video_id) ─────────────────────
title_map = {r["title"]: r["video_id"] for r in recipes if r.get("is_recipe", True)}
with open(MAPF, "w", encoding="utf-8") as f:
    json.dump(title_map, f, ensure_ascii=False, indent=2)
print(f"Wrote {MAPF}  ({len(title_map)} entries)")
