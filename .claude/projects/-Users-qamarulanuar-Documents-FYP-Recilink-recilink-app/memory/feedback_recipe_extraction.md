---
name: feedback-recipe-extraction
description: Rules for extracting recipes from Khairul Aming TikTok transcripts into JSON/SQL
metadata:
  type: feedback
---

Rules applied to all @khairulaming recipe JSON files (updated rules supersede earlier ones where they conflict):

1. **All ingredients** — include everything: minyak masak, air (if used for batter/cooking), garam, gula.
2. **needs_review = true** if any main ingredient has no stated quantity. Salt/pepper/oil "secukup rasa" do NOT trigger review. Estimated times/servings alone do NOT trigger review.
3. **Consistent ingredient names** — one canonical Malay name per ingredient across all recipes. Maintain `ingredient_names.json` (name → name_en). Fix typos (e.g. "cayenne pepper" not "cayen pepper"). Use "mayonis" not "mayo", etc.
4. **Brand names** — generic name as `name`, brand in `note`. E.g. `name: "tepung goreng ayam", note: "jenama Bestari", name_en: "fried chicken batter mix"`.
5. **Tags in lowercase English** to match existing DB data (e.g. "chicken", "fried", "spicy", "western", "ramadan", "halal"). Captions, title, description, steps stay in Malay.
6. **quantity must be a JSON number** (0.5 not "0.5") or null.
7. **sudu ambiguity** — if transcript context indicates tablespoon vs teaspoon, use "sudu besar" / "sudu kecil". Otherwise keep "sudu".

**Why:** User wants consistent DB loading and ingredient name graph. Applied from batch 1 onwards.
**How to apply:** Every recipe JSON and every ingredient_names.json entry must conform before showing the user.
