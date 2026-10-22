# Ingredients, Servings Adjuster & Basket — Design Analysis

_Analysis only. No code was changed._

---

## 1. Current State

### PostgreSQL Tables (relevant subset)

| Table | Key columns | Notes |
|---|---|---|
| `recipes` | `id`, `title`, `servings INT`, `ingredients JSON` (string array), `steps JSON` (string array), `source` | `ingredients` has no quantities; amounts only appear in free-text `steps` |
| `users` | `id`, `username`, `email` | |
| `profiles` | `user_id FK`, `dietary_preferences JSON`, `frequently_used_ingredients JSON` | `frequently_used_ingredients` stored but not auto-updated |
| `saved_recipes` | `user_id FK`, `recipe_id FK`, UNIQUE together | Social save, not a basket |
| `comments`, `follows`, `posts` | — | Not relevant |

There is **no** `ingredients`, `recipe_ingredients`, `pantry_items`, or basket/cart table in PostgreSQL.

**Staging table `recipes_ka`** (not yet merged):

| Extra column | Type | Notes |
|---|---|---|
| `video_id` | VARCHAR(25) | TikTok video ID |
| `title_ms`, `description_ms`, `steps_ms` | TEXT / JSONB | Malay translations |
| `ingredients_detailed` | JSONB | Array of `{name, name_ms, quantity, unit, note}` — ~856 rows, ~50 % have a quantity |
| `is_recipe`, `needs_review`, `review_notes` | BOOL / TEXT | QA flags |

### Neo4j Graph

| Element | Properties | Notes |
|---|---|---|
| `Recipe` node | `name` (= title), `difficulty`, `cuisine` | Keyed by title string |
| `Ingredient` node | `name` (lowercase) | Created on recipe insert |
| `Recipe -[:CONTAINS]-> Ingredient` | — | Many-to-many |
| `Ingredient -[:CO_OCCURS]-> Ingredient` | `frequency INT` | Used for grocery suggestions |

Ingredient names in Neo4j come from `recipes.ingredients` JSON — plain strings, lowercased, no normalization beyond that.

### Shopping list & Pantry — current state

Both live **entirely in AsyncStorage on the device**. There is no backend table.

| Feature | Where | Persisted to server |
|---|---|---|
| Shopping list | `AsyncStorage('shopping_list')` | No |
| Pantry ("ingredients at home") | `AsyncStorage('pantry_items')` | No |
| "Can cook now" / "Almost ready" | Computed on-demand by `POST /api/v1/recipes/can-cook` and `/match` using pantry list sent from client | No state saved |

**Pantry item structure (TypeScript):**
```ts
{ id: string; name: string }   // name only, no quantity, no canonical id
```

**Shopping item structure (TypeScript):**
```ts
{ id: string; name: string; checked: boolean; category: string }
```

### API routes that touch recipes / ingredients

| Method + path | What it does |
|---|---|
| `GET /api/v1/recipes/` | Paginated recipe list |
| `GET /api/v1/recipes/search` | Title/cuisine/difficulty filter |
| `GET /api/v1/recipes/{id}` | Recipe detail |
| `POST /api/v1/recipes/` | Create recipe (writes to PostgreSQL + Neo4j) |
| `PUT /api/v1/recipes/{id}` | Update recipe |
| `POST /api/v1/recipes/match` | Recipes missing 1-3 ingredients (substring match against pantry) |
| `POST /api/v1/recipes/can-cook` | Recipes where all ingredients are in pantry |
| `GET /api/v1/recommendations/ingredients/search?q=` | Neo4j ingredient autocomplete |
| `GET /api/v1/recommendations/popular-ingredients` | Top-10 by co-occurrence |
| `GET /api/v1/recommendations/grocery` | Grocery suggestions from pantry (co-occurrence) |

### Frontend screens that touch this area

| Screen | File | Relevant behaviour |
|---|---|---|
| `RecipeDetailScreen` | `screens/RecipeDetailScreen.tsx` | Shows ingredient name list (no quantities from DB), "Add N ingredients" → pushes names to AsyncStorage shopping list |
| `ShoppingListScreen` | `screens/ShoppingListScreen.tsx` | Pantry chips, quick-add categories, shopping SectionList, "Almost Ready" cards, auto-promote checked items to pantry |
| `RecipesScreen` | `screens/RecipesScreen.tsx` | Browse/search; no ingredient detail |

### Nothing from the proposed design that already exists

| Proposed | Status |
|---|---|
| `ingredients` table | Does not exist |
| `recipe_ingredients` table | Does not exist |
| `pantry_items` table | Does not exist |
| Servings adjuster / scaling | Does not exist anywhere |
| Step amount placeholders | Does not exist |
| Basket (server-side) | Does not exist |
| Missing-ingredients logic with canonical IDs | Does not exist (only substring matching on raw names) |

---

## 2. Collisions

### 2a. Ingredient name mismatch across data sources

- `recipes.ingredients` stores **raw strings** (e.g. `"garlic"`, `"soy sauce"`, `"1 tbsp oyster sauce"` — some even contain quantities embedded in the string).
- `recipes_ka.ingredients_detailed[].name` stores clean English names from `ingredient_names.json`.
- Neo4j `Ingredient.name` is lowercased from `recipes.ingredients` — so it will contain dirty strings if any recipes have quantity-embedded names.
- The proposed `ingredients` table requires a UNIQUE `name`. Merging the two datasets without deduplification will either fail the UNIQUE constraint or silently create duplicates depending on capitalisation.

**Collision:** You cannot safely do `INSERT INTO ingredients (name) SELECT DISTINCT unnest(ingredients) FROM recipes` — the existing dummy data `ingredients` column is not cleaned.

### 2b. Neo4j keyed by title, not id

Neo4j `Recipe` nodes use `name = title` (string). If you merge `recipes_ka` into `recipes`, the new rows get a new `id` but the Neo4j node is never created unless you explicitly call the recipe-creation route (which also writes to Neo4j). Running the SQL INSERT directly bypasses Neo4j.

**Collision:** After a direct SQL merge, `recipes_ka` rows will have no Neo4j counterpart → Jaccard similarity, co-occurrence, and feed personalization won't know about these 74 recipes.

### 2c. `/recipes/match` and `/recipes/can-cook` use substring matching on `recipes.ingredients`

These endpoints iterate over `recipes.ingredients` (string array) and do substring containment against pantry item names. If you move to a `recipe_ingredients` join table but keep `recipes.ingredients` as-is for backward compatibility, these endpoints continue to work — but they will never use quantities, units, or canonical IDs. They will drift from the new tables.

**Collision:** Having two ingredient representations (`recipes.ingredients` JSON and `recipe_ingredients` table) means you must keep both in sync or accept divergence in the matching logic.

### 2d. `RecipeDetailScreen` adds ingredients to shopping list by name string

`RecipeDetailScreen.tsx` pushes `recipe.ingredients` (string array) directly into AsyncStorage. This code doesn't know about `recipe_ingredients` at all. After the migration, `recipe.ingredients` will still exist (you proposed keeping it), so this screen keeps working — but it still won't carry quantities.

**Collision:** The "Add ingredients to shopping list" flow in `RecipeDetailScreen` needs to be updated to use the new `recipe_ingredients` data if users are to see quantities in their shopping list.

### 2e. `profiles.frequently_used_ingredients` is a JSON array of name strings

This field was designed to mirror pantry/usage patterns. If you introduce canonical `ingredient_id` references, this field becomes inconsistent with the new model.

**Collision:** Minor. The field isn't actively used in any business logic yet, but it will diverge.

### 2f. Proposed `pantry_items(user_id, ingredient_id)` vs current AsyncStorage pantry

The current pantry is device-local. Moving it to the server is a one-way migration: any user with existing pantry data in AsyncStorage will not see it after they upgrade the app unless you add a migration endpoint (read local → POST to server on first launch).

**Collision:** If you ship server-side pantry without a migration path, every existing user's pantry is silently lost on app update.

### 2g. cuisine enum vs existing recipes

The proposal says `cuisine` must be one of `Malaysian, Indonesian, Thai, Chinese, Indian, Western, Fusion`. The existing `recipes` table has `cuisine VARCHAR` with values like `"Italian"`, `"Asian"`, `"General"` (from dummy data) and `RecipesScreen` hardcodes filter chips: `["All","Malaysian","Italian","Asian","Thai","General"]`.

**Collision:** Adding a strict enum now would require cleaning existing data AND updating the filter chips UI.

### 2h. Step placeholder syntax `{{ingredient_name}}`

No existing step text uses this pattern. But step text in dummy recipes often embeds quantities differently (e.g. `"Add 2 cloves of garlic"`). If you introduce placeholders, the dummy recipes need a rewrite pass, not just a backfill.

---

## 3. Feasibility

| Part | Verdict | Reason |
|---|---|---|
| **`ingredients` table** (id, name UNIQUE, name_ms, is_staple) | ✅ Achievable | Straightforward. Populate from `ingredient_names.json` (185 entries) + `recipes_ka` names + cleaned dummy data names. Main risk is deduplication of existing dirty names. |
| **`recipe_ingredients` table** | ✅ Achievable | For `recipes_ka` data this is clean (all from `ingredients_detailed`). For dummy data it requires a backfill pass — either manual or LLM-assisted. The `scalable` bool on each row is a nice touch and is feasible. |
| **`pantry_items(user_id, ingredient_id)`** | ✅ Achievable with changes | The table itself is trivial. The challenge is migrating away from AsyncStorage and writing the migration-on-first-launch logic in the app. Also requires auth (pantry must be per-user). |
| **Keep `recipes.ingredients` JSON in parallel** | ✅ Achievable | Keep it as a denormalised cache. Regenerate it from `recipe_ingredients` on write. Be explicit that `recipe_ingredients` is the source of truth. |
| **Servings adjuster (frontend scaling)** | ✅ Achievable | Pure frontend math. `quantity * desired / recipe.servings`. `null` quantity → show "to taste". `scalable=false` → show unchanged. Rounding rules (eggs/cloves = whole, spoons/cups to ¼) are a bit fiddly but manageable. |
| **Step text scaling via `{{name}}` placeholders** | ⚠️ Achievable with changes | Works for `recipes_ka` (you control step text). For dummy data it requires a full rewrite of all step text — large manual effort. Regex replacement in the frontend is straightforward once placeholders exist. Risk: templates break if ingredient names change. |
| **Missing ingredients = basket minus pantry minus staples** | ✅ Achievable | With `recipe_ingredients` and server-side pantry this is a clean SQL query. Much better than the current substring hack. |
| **Sum per ingredient per unit across basket recipes** | ✅ Achievable | Group by `(ingredient_id, unit)`. No unit conversion needed initially — matching units exactly is fine for v1. |
| **Backfill realistic quantities for dummy recipes** | ⚠️ Achievable with changes | You have ~50 dummy recipes. Realistic quantities need to come from somewhere: manual entry, LLM pass, or just mark `scalable=false` and leave quantity null. Recommend leaving null initially and marking as `needs_review`. |
| **Merge `recipes_ka` into `recipes`** | ✅ Achievable | Add the extra columns to `recipes` via Alembic migration. Insert with appropriate `source`. The only hard part is the Neo4j sync (see §4). |

---

## 4. Challenges and Risks

### 4a. Ingredient name matching between old and new data (HIGH)

The dummy recipes have ingredients like `"garlic"`, `"soy sauce"`, `"chilli flakes"`. The `recipes_ka` data uses `ingredient_names.json` canonical names like `"bird's eye chilli"`, `"sweet soy sauce"`. These are different strings even if they mean the same thing.

When you populate the `ingredients` table, you will get duplicates like `"chilli flakes"` (dummy) vs `"chilli flakes"` (ka) — that's fine. But you'll also get near-misses: `"garlic"` vs `"garlic clove"`, `"chilli"` vs `"large red chilli"` vs `"bird's eye chilli"`. The current substring matching in `/match` masks this; the new join table will expose it.

**Risk:** If you normalise `recipes_ka` properly but leave dummy recipes with dirty names, the matching quality will be split — great for KA recipes, poor for dummy recipes. Users won't know why.

**Mitigation:** Accept this for now; mark dummy recipes `source='dataset'` and filter them out of quantity-aware features until backfilled. Or do a one-shot LLM pass to extract `recipe_ingredients` rows from the dummy step text.

### 4b. Keeping PostgreSQL and Neo4j in sync (MEDIUM)

Neo4j is written only from the recipe creation route (`POST /recipes/`). Any direct SQL insert (e.g. merging `recipes_ka`) will not create Neo4j nodes.

You need either:
- A post-merge sync script that reads the new recipe rows and creates Neo4j nodes + `CONTAINS` + `CO_OCCURS` relationships; or
- Modify the merge process to call the same Neo4j creation logic that the creation route uses.

If Neo4j gets out of sync, Jaccard similarity returns wrong results and the feed personalization doesn't know about KA recipes.

### 4c. Sequence / ID collisions when merging `recipes_ka` (LOW-MEDIUM)

`recipes_ka` has a SERIAL `id`. When you INSERT `recipes_ka` rows into `recipes`, Postgres will use the `recipes_id_seq` sequence, which may skip or conflict with existing IDs if you try to preserve `recipes_ka.id` values. Don't try to preserve IDs — let `recipes.id` be assigned fresh. But then your `recipes_ka_map.json` (`title → video_id`) needs to be updated to `recipes.id → video_id` for any downstream lookup.

### 4d. Missing quantities in `recipes_ka` (MEDIUM)

Of 856 `ingredients_detailed` rows, ~50% have no quantity (secukup rasa / to taste / not stated). For the servings adjuster these rows will show "to taste" — that's acceptable and already handled by `quantity IS NULL`. But it means ~44 of 74 recipes have `needs_review=true`, which may confuse users who see "add 1 garlic" on one recipe and "add garlic — to taste" on another from the same creator.

**Mitigation:** This is a data quality issue, not a schema issue. Accept it for now; the `needs_review` flag is already there.

### 4e. Unit heterogeneity (MEDIUM)

Units in `recipes_ka` include: `tbsp`, `tsp`, `cup`, `clove`, `can`, `packet`, `stalk`, `g`, and `null`. No unit normalisation has been done. The "sum per ingredient per unit" basket aggregation will produce rows like:

```
garlic: 3 clove + 5 clove = 8 clove  ✓
coconut milk: 1 can + 0.5 box = ???   ✗ (different units, no conversion)
```

**Risk:** Unit mismatch means the aggregation will show two separate rows for the same ingredient — not wrong, but not user-friendly.

**Mitigation:** For v1, accept this. Add a `canonical_unit` column later and a conversion table if needed. Displaying both rows with their units is honest.

### 4c. Step placeholder maintenance (MEDIUM)

`{{ingredient_name}}` in step text ties the step to the `ingredients` table `name` column. If a canonical name ever changes (e.g. `"sweet soy sauce"` → `"kecap manis"`), all step text containing `{{sweet soy sauce}}` breaks silently. You'd need a migration to update step text whenever a name changes, or use `{{ingredient_id}}` instead of the name string.

**Recommendation:** Use `{{ingredient_id}}` internally and resolve to the current `name` at render time. More robust.

### 4f. Rounding logic complexity (LOW)

Scaling `0.5 cup coconut milk` for 3 servings when recipe is for 4 → `0.375 cup`. Rounding to nearest ¼ → `0.25 cup`. The rule "eggs/cloves are whole numbers" needs a list of which units/ingredients snap to integers. This list will have edge cases. Keep it as a simple lookup (unit: `clove`, `egg`, `slice`, `piece` → round to nearest int; everything else → round to nearest ¼). It will be slightly wrong sometimes but is good enough.

### 4g. Supabase migration (MEDIUM)

You plan to move to Supabase. Supabase is PostgreSQL under the hood, so the schema is fully compatible. The main impact:
- Alembic migrations → run them against the Supabase DB before launch.
- Async SQLAlchemy session (currently `asyncpg`) works with Supabase's connection string.
- Supabase Auth could replace the current custom JWT auth — that's a separate decision.
- Supabase Realtime could power live pantry/basket sync — a future enhancement.
- The Neo4j graph database is **not** part of Supabase. You'll need to keep a separate Neo4j instance (Aura free tier) or replace it with pgvector + a similarity approach.

**Risk:** If you're planning a Supabase move, defer any schema decisions that are hard to migrate (e.g. complex JSONB structures) — prefer normalised tables, which are easier to move.

### 4h. Pantry data loss on app upgrade (HIGH for existing users)

Currently `pantry_items` is in AsyncStorage. Moving to a server table requires an app-side migration on first launch: read AsyncStorage → POST to server → clear AsyncStorage. If you forget this, every user's pantry is silently lost on upgrade.

Since this is an FYP / early product with few users, this risk is manageable — you can wipe pantry on upgrade and ask users to re-add.

---

## 5. Alternatives

### 5a. `{{ingredient_id}}` instead of `{{ingredient_name}}` in steps

Using the ingredient's `id` as the placeholder key (e.g. `{{42}}`) decouples step text from name changes. The frontend resolves `id → current name + scaled quantity` at render time. Worth doing from the start — retrofitting later is expensive.

### 5b. Don't add step placeholders to dummy recipes

The step-placeholder feature is valuable for `recipes_ka` (74 recipes you control) but very expensive for dummy data (requires rewriting ~50 recipes). Instead, render steps as plain text for `source='dataset'` recipes and only show the dynamic scaler for `source='khairulaming_tiktok'` recipes (and future user-uploaded recipes that follow the template). This gates the feature on data quality without blocking the launch.

### 5c. Keep pantry in AsyncStorage but sync on mutation

Instead of a full server migration, add a background sync: on pantry add/remove, fire a `POST /api/v1/pantry` endpoint. On app launch, fetch server state if newer than local. This is simpler than a one-time migration and gives you persistence without losing local responsiveness.

### 5d. Use `is_staple` to cut shopping list noise

The proposed `ingredients.is_staple` column is a good idea — staples (salt, oil, sugar, water) should be excluded from the missing-ingredients list by default. Pre-populate ~20 staples from `ingredient_names.json`. Let users override per-pantry later.

### 5e. Defer unit conversion, accept multi-row aggregation

Don't build a unit conversion table in v1. Show the user `2 can + 1 box coconut milk` and let them figure it out. Add a note "units may differ" if two rows have different units for the same ingredient. Conversion is a separate feature (M effort) that can be added later.

### 5f. One migration endpoint rather than splitting the merge into steps

Rather than:
1. Alembic migration to add columns
2. Manual SQL run of `recipes_ka_insert.sql`
3. Separate script to sync Neo4j

Consider a single `python migrate_ka.py` script that:
- Runs the Alembic migration
- Inserts `recipes_ka` rows into `recipes` (skipping the staging table)
- Immediately calls the Neo4j sync for each new recipe
- Regenerates `recipes.ingredients` JSON from `ingredients_detailed`

This is safer than running raw SQL because it goes through your ORM validation and Neo4j logic.

---

## 6. Recommended Plan

### Phase 0 — Foundation (S, ~0.5 day)
1. Alembic migration: add `title_ms`, `description_ms`, `steps_ms`, `video_id`, `is_recipe`, `needs_review`, `review_notes`, `ingredients_detailed JSONB` to `recipes`.
2. Run `recipes_ka_insert.sql` to populate staging table, then write a migration script to INSERT staging rows into `recipes`.
3. Sync Neo4j for the 74 new rows (script, not manual).
4. **Test:** Recipe detail page renders KA recipes; Jaccard similarity returns KA recipes.
5. **Rollback:** DELETE FROM recipes WHERE source = 'khairulaming_tiktok'.

### Phase 1 — Canonical ingredients table (M, ~1 day)
1. Alembic migration: create `ingredients(id SERIAL PK, name TEXT UNIQUE, name_ms TEXT, is_staple BOOL DEFAULT FALSE)`.
2. Seed from `ingredient_names.json` (185 entries).
3. Alembic migration: create `recipe_ingredients(recipe_id FK, ingredient_id FK, quantity NUMERIC NULL, unit TEXT, note TEXT, scalable BOOL DEFAULT TRUE, sort_order INT)`.
4. Populate `recipe_ingredients` for all 74 KA recipes from `ingredients_detailed` JSONB.
5. Leave dummy recipes with empty `recipe_ingredients` for now (they still have `recipes.ingredients` JSON).
6. **Test:** `GET /api/v1/recipes/{id}/ingredients` returns structured data for KA recipes; nothing breaks for dummy recipes.
7. **Rollback:** Drop the two new tables; no existing tables touched.

### Phase 2 — Servings adjuster (S, ~0.5 day)
1. Add `GET /api/v1/recipes/{id}/ingredients` endpoint returning `recipe_ingredients` rows (with ingredient name, name_ms, quantity, unit, scalable).
2. In `RecipeDetailScreen`: fetch the new endpoint. If data is present, render interactive quantity fields that scale on servings change. If not (dummy recipe), fall back to the existing string list.
3. Scaling math in the frontend: `scaled = quantity * desired / base_servings`, round per unit type.
4. **Test:** Changing servings on a KA recipe updates all quantities. Dummy recipes are unchanged.
5. **Rollback:** Remove the endpoint and frontend branch; trivial.

### Phase 3 — Server-side pantry (M, ~1 day)
1. Alembic migration: create `pantry_items(id SERIAL PK, user_id INT FK, ingredient_id INT FK, UNIQUE(user_id, ingredient_id))`.
2. Add endpoints: `GET /api/v1/pantry`, `POST /api/v1/pantry/{ingredient_id}`, `DELETE /api/v1/pantry/{ingredient_id}`.
3. Update `ShoppingListScreen` to call the new endpoints (keep AsyncStorage as optimistic cache).
4. On first app launch after update, offer user "migrate your pantry" — read AsyncStorage items, match names against `ingredients.name`, POST matched ones.
5. **Test:** Add item on device A; it appears on device B.
6. **Rollback:** Revert to AsyncStorage-only; pantry table can remain empty.

### Phase 4 — Improved missing-ingredients (M, ~1 day)
1. Rewrite `/recipes/match` and `/recipes/can-cook` to JOIN `recipe_ingredients` + `pantry_items` (for recipes that have `recipe_ingredients` rows). Fall back to substring matching for recipes without rows.
2. Add `is_staple` filtering: staples never count as missing.
3. **Test:** "Can cook now" returns correct results for KA recipes with canonical ingredient IDs.
4. **Rollback:** Swap back to substring logic.

### Phase 5 — Step placeholders (L, ~2 days)
1. Rewrite `recipes_ka` step text to use `{{ingredient_id}}` placeholders (script).
2. Frontend renderer: parse `{{123}}` → look up `recipe_ingredients` row for that ingredient, render `scaled_quantity unit name`.
3. Add a flag `has_step_placeholders BOOL DEFAULT FALSE` to `recipes` so the renderer knows which mode to use.
4. Dummy recipes stay as plain text.
5. **Test:** Steps in a KA recipe update when servings change.
6. **Rollback:** Strip placeholders from steps; render as plain text.

### Phase 6 — Basket aggregation (S, ~0.5 day)
1. Alembic migration: create `basket_recipes(user_id FK, recipe_id FK, desired_servings INT, added_at TIMESTAMPTZ)`.
2. Add `GET /api/v1/basket/missing-ingredients` endpoint: JOIN basket + recipe_ingredients, LEFT JOIN pantry, exclude staples, GROUP BY (ingredient_id, unit), SUM quantities.
3. Update `ShoppingListScreen` "Almost Ready" / missing ingredients sections to use the new endpoint.
4. **Test:** Adding 2 recipes to basket and removing pantry items shows the correct aggregated shopping list.

**Total effort estimate:** ~6 development days for all phases. Phases 0–3 alone (foundation + scaler + pantry) are ~3 days and already deliver the two headline features.

---

## 7. Open Questions

1. **Supabase timing:** When are you moving to Supabase? If it's before Phase 1, set up the Supabase DB first and run all Alembic migrations there from the start. If after, design nothing that's hard to migrate.

2. **Step placeholders scope:** Do you want step scaling for ALL recipes (requiring a dummy data rewrite) or only `recipes_ka` / future user recipes? This changes Phase 5 from L to XL.

3. **`{{ingredient_id}}` vs `{{ingredient_name}}`:** Confirmed preference? IDs are more robust; names are more readable in raw JSON. Which do you want?

4. **Dummy recipe backfill:** Do you want realistic quantities for the ~50 dummy recipes? If yes, is an LLM-assisted pass acceptable, or do these need to be hand-verified? (Affects Phase 1 effort significantly.)

5. **Pantry migration UX:** On app update, should the migration dialog be mandatory (user must confirm) or silent (just try to match and migrate automatically)? What happens to pantry items whose names don't match any `ingredients.name`?

6. **Multi-device basket:** Is the basket (list of recipe IDs the user is planning to cook) also server-side, or is it OK to leave it local and only move pantry to the server?

7. **Existing dirty `recipes.ingredients` data:** The dummy recipes have some entries like `"1 tbsp oyster sauce"` (quantity embedded in the name string). Before Phase 1 you need to decide: manually clean these 50 recipes, run a script, or just accept that dummy recipes won't get a servings adjuster until someone cleans them.

8. **`is_staple` seed list:** Who decides what's a staple? Default suggestion: `salt, cooking oil, water, sugar, black pepper, white pepper, garam (salt)`. Should this be configurable per user or global?

9. **Auth requirement for pantry:** The current `/match` and `/can-cook` endpoints accept ingredient lists unauthenticated. Moving to `pantry_items` requires auth. Is that acceptable (i.e., pantry is only available to logged-in users)?
