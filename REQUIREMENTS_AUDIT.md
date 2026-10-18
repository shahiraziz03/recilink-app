# ReciLink — Requirements Audit Report

**Auditor:** Claude Sonnet 4.6  
**Date:** 2026-10-16  
**Branch:** `ktest`  
**Codebase:** React Native (Expo) mobile app + FastAPI backend + Neo4j knowledge graph

---

## 1. Architecture Summary

| Layer | Technology | Key Files |
|---|---|---|
| Mobile frontend | React Native (Expo SDK 54), NativeWind, React Navigation | `frontend-mobile/src/` |
| Web frontend | React + Vite (login/register/home only — landing page, NOT full app) | `frontend-web/src/` |
| REST API | FastAPI (Python), async SQLAlchemy, JWT via PyJWT + bcrypt | `backend/app/` |
| Relational DB | PostgreSQL (tables: users, profiles, recipes, posts, saved_recipes, comments, follows) | `backend/app/models/` |
| Knowledge graph | Neo4j (nodes: Recipe, Ingredient; edges: CONTAINS, CO_OCCURS) | `backend/app/db/neo4j.py`, `routers/recommendations.py` |
| Auth | JWT Bearer (24h TTL) stored in AsyncStorage; no server-side revocation | `backend/app/core/security.py` |
| Image storage | **None** — cover photos stored as local device URIs, not uploaded to cloud | `frontend-mobile/src/screens/PostScreen.tsx:119` |

Navigation structure (mobile): `Login → Register → [Main: Home | Community | Post | Match (Shopping) | Profile]`. No dedicated Recommendation page or Dashboard page exists in the bottom tab navigator.

**Dead code:** `RecipesScreen.tsx` (full filter UI) is never imported into any navigator.

---

## 2. Summary Table

| UC | Name | Status | Main Flow | Alt Flows | Exception Flows | Key Gap |
|---|---|---|---|---|---|---|
| UC-1 | Register | 🟡 Partial | 8/9 | 1/3 | 2/2 | Google OAuth stubbed (Coming Soon); no password rules |
| UC-2 | Login | 🟡 Partial | 5/5 | 0/1 | 1/2 | Google OAuth not implemented |
| UC-3 | Forgot Password | ❌ Missing | 1/9 | 0/1 | 0/2 | "Forgot Password" link has no handler; entire flow missing |
| UC-4 | Logout | 🟡 Partial | 4/4 | 1/1 | — | No server-side token invalidation |
| UC-5 | Manage Account | 🟡 Partial | 3/8 | 1/1 | 0/1 | No email/username edit; no change-password; profile saves to AsyncStorage only |
| UC-6 | Dietary Preferences | 🟡 Partial | 4/6 | 1/1 | — | Saved locally (not DB); not used by recommendation engine |
| UC-7 | Browse Recipes | 🟡 Partial | 3/5 | — | 1/1 | No filter UI accessible (RecipesScreen.tsx dead code); wrong sort order |
| UC-8 | Search Recipes | 🟡 Partial | 4/5 | 0/1 | 2/2 | Title-only search; no ingredient-based ranking |
| UC-9 | View Recipe Details | 🟡 Partial | 4/4 | 1/1 | 0/1 | Error screen has "Go Back" but no retry button |
| UC-10 | Save / Bookmark Recipe | 🟡 Partial | 4/4 | 0/1 | — | No confirmation dialog on unsave; heart icon ≠ bookmark icon |
| UC-11 | Post Recipe | 🟡 Partial | 9/11 | — | 0/1 | Cover photo not uploaded to cloud; cover photo not enforced as required |
| UC-12 | Manage Own Recipe | 🟡 Partial | 4/5 | 0/1 | — | No delete functionality; edits don't update Neo4j graph |
| UC-13 | Comment and Rate | 🟡 Partial | 4/5 | 0/1 | — | Rating (1–5 stars) entirely absent |
| UC-14 | Get Recommendation | ❌ Missing | 1/6 | 0/1 | 0/1 | No dedicated recommendation page; dietary preferences ignored |
| UC-15 | View Recommendation Results | 🟡 Partial | 3/5 | 0/1 | 0/1 | Results embedded in shopping list; no navigation to detail; no save button |
| UC-16 | Get Grocery Suggestion | 🟡 Partial | 4/6 | 1/1 | 0/1 | Pantry in AsyncStorage (not profile); Neo4j grocery endpoint unused |
| UC-17 | View Grocery List | 🟡 Partial | 3/5 | 1/1 | — | No per-item category or "recipes unlocked" count |
| UC-18 | Manage Shopping List | 🟡 Partial | 3/4 | 0/1 | — | Local storage only; "Clear completed" button commented out |
| UC-19 | View Dashboard | 🟡 Partial | 3/6 | — | 0/1 | No dedicated dashboard; wrong graph type; favourite cuisine missing |

---

## 3. Detailed Findings

### UC-1: Register

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. "Sign up" option exists | ✅ | `LoginScreen.tsx:116–119` — TouchableOpacity navigates to Register |
| 2. Registration form displayed | ✅ | `RegisterScreen.tsx:68–165` |
| 3. Fields: username, email, password | ✅ | `RegisterScreen.tsx:79–115` |
| 4. Confirm password field | ✅ | `RegisterScreen.tsx:118–131` |
| 5. Form submit | ✅ | `RegisterScreen.tsx:134–143` |
| 6. Input validation | 🟡 | `RegisterScreen.tsx:27–41` validates empty fields + email format + password match. **No password complexity rules enforced** (neither frontend nor backend; `auth.py` accepts any non-empty string) |
| 7. Uniqueness check (email + username) | ✅ | `backend/app/routers/auth.py:20–27` — separate DB checks for both |
| 8. Account created | ✅ | `auth.py:30–44` — creates User + Profile row |
| 9. Success notification | ✅ | `RegisterScreen.tsx:51–54` — Alert.alert('Success', 'Account created successfully!') |
| **Alt:** Google sign-up | ❌ | `RegisterScreen.tsx:150–156` — `Alert.alert('Coming Soon', ...)` — no OAuth implementation |
| **Alt:** Password requirements error | ❌ | No password rules defined anywhere |
| **Alt:** Confirm mismatch error | ✅ | `RegisterScreen.tsx:38–40` — Alert.alert('Error', 'Passwords do not match') |
| **Exc:** Empty fields | ✅ | `RegisterScreen.tsx:27–30` — Alert.alert('Error', 'Please fill in all fields') |
| **Exc:** Email/username already taken | ✅ | `auth.py:22, 27` returns 400 detail; `RegisterScreen.tsx:55–63` renders the API error |

---

### UC-2: Login

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Username and password fields | 🟡 | `LoginScreen.tsx:62–69` — accepts **username OR email** (label reads "Username or Email"). Spec says "username" only; code is more permissive. Backend also accepts both (`auth.py:56–61`). |
| 2. Submit form | ✅ | `LoginScreen.tsx:93–99` |
| 3. Credentials validated | ✅ | `auth.py:56–65` |
| 4. User logged in (session created) | ✅ | `LoginScreen.tsx:37–40` — JWT + user stored in AsyncStorage |
| 5. Redirected to home | ✅ | `LoginScreen.tsx:41` — `navigation.replace('Main')` |
| **Alt:** Continue with Google | ❌ | `LoginScreen.tsx:107–113` — Alert.alert('Coming Soon') |
| **Exc:** Invalid credentials | ✅ | `auth.py:65` raises 401; `LoginScreen.tsx:43–45` shows Alert |
| **Exc:** Google not linked → error (not auto-create) | ❌ | N/A — Google OAuth not implemented |

---

### UC-3: Forgot Password

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. "Forgot Password" option on login page | 🟡 | `LoginScreen.tsx:75–77` — TouchableOpacity renders the text but **has no `onPress` handler**. Tapping does nothing. |
| 2–9. Full password reset flow | ❌ | No reset endpoint in `auth.py`, no reset screen, no email sending |
| **Alt:** Resend link / spam hint | ❌ | Not implemented |
| **Exc:** Email not found | ❌ | Not implemented |
| **Exc:** New password fails requirements | ❌ | Not implemented |

---

### UC-4: Logout

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Logout option | ✅ | `ProfileScreen.tsx:331–337` — logout icon button |
| 2. Confirmation prompt | ✅ | `ProfileScreen.tsx:192–200` — Alert with Cancel / Logout |
| 3. User confirms | ✅ | `ProfileScreen.tsx:195–199` |
| 4. Session terminated + protected routes inaccessible | 🟡 | `ProfileScreen.tsx:197` removes 'token' and 'user' from AsyncStorage; `AppNavigator.tsx:16–18` re-checks on next mount. **No server-side token invalidation** — token remains valid on server until it expires (24h). Existing token holders are not blocked mid-session. |
| **Alt:** Cancel → stays logged in | ✅ | `ProfileScreen.tsx:193–194` — style: 'cancel' |

---

### UC-5: Manage Account

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Profile page accessible | ✅ | `ProfileScreen.tsx` — Profile tab in navigator |
| 2. Current profile info displayed (username, email) | 🟡 | Username shown (`ProfileScreen.tsx:272`). **Email is NOT displayed** anywhere on the profile screen. |
| 3. User edits fields | 🟡 | Edit modal shows Bio and Dietary Preferences only (`ProfileScreen.tsx:511–557`). **No username or email editing UI.** |
| 4. "Save Changes" button | ✅ | `ProfileScreen.tsx:519` |
| 5. Inputs validated | 🟡 | `saveEdit()` at `ProfileScreen.tsx:180–185` does **no validation** — saves any string including empty |
| 6. Changes saved | ❌ | `ProfileScreen.tsx:183` saves to **AsyncStorage only**, no API call. The `Profile.bio` and `Profile.dietary_preferences` DB columns exist but are never written from the app. |
| 7. Success message | ❌ | `saveEdit()` closes the modal silently — no Alert or toast |
| 8. Change Password sub-flow | ❌ | No change-password screen, no endpoint in profile.py or auth.py |
| **Alt:** Cancel | ✅ | `ProfileScreen.tsx:515` — setEditVisible(false) |
| **Exc:** Invalid/empty fields | ❌ | No validation in saveEdit |
| Also: uniqueness re-check on username/email change | ❌ | Username/email editing not supported |

---

### UC-6: Manage Dietary Preferences

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Dietary Preferences section within profile | ✅ | `ProfileScreen.tsx:535–555` — inside Edit Profile modal |
| 2. Options with pre-populated selections | 🟡 | Options at `ProfileScreen.tsx:40`: Plant-Based, Gluten-Free, Vegan, **Halal** ✅, Mediterranean, Keto, **Vegetarian** ✅. **"Allergen-free" is absent** (spec minimum). Current selections pre-populated from AsyncStorage (`ProfileScreen.tsx:177`). |
| 3. Multi-select | ✅ | `ProfileScreen.tsx:187–189` (toggleDiet) |
| 4. Submit | ✅ | `ProfileScreen.tsx:519` |
| 5. Validated and saved | 🟡 | Saved to **AsyncStorage only** (`ProfileScreen.tsx:183`). The DB column `Profile.dietary_preferences` (`user.py:31`) is never written from the app. |
| 6. Success message | ❌ | No message after saving dietary preferences |
| **Alt:** Cancel | ✅ | `ProfileScreen.tsx:515` |
| **Integration with UC-14 recommendation engine** | ❌ | Dietary preferences are never sent to any API endpoint; `recommendations.py` has no dietary filtering logic |

---

### UC-7: Browse Recipes

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Home / Recipe Discovery page | ✅ | `HomeScreen.tsx` + `RecipesScreen.tsx` (dead) |
| 2. Full recipe list sorted by saves by default | 🟡 | `HomeScreen.tsx:142` calls `/recipes` paginated. Backend `recipes.py:125` orders by `Recipe.created_at.desc()` — **not by saves count** as spec requires. |
| 3. Filters: cuisine, difficulty, cooking time, tags | ❌ | `RecipesScreen.tsx` has all four filter types but **is never imported into any navigator** — it is dead code. `HomeScreen.tsx` has no filter UI. |
| 4. Filtered list displayed | ❌ | No filters accessible from the main screen |
| 5. Select a recipe → UC-9 | ✅ | `HomeScreen.tsx:203` — `navigation.navigate('RecipeDetail', ...)` |
| **Exc:** No matches → message + filter suggestion | ✅ | `HomeScreen.tsx:320–325` — "No recipes found" empty component |

---

### UC-8: Search Recipes

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Search bar on Recipe Discovery page | ✅ | `HomeScreen.tsx:284–300` |
| 2. Enter ingredients or keywords | ✅ | `HomeScreen.tsx:286–292` |
| 3. Submit search | ✅ | `HomeScreen.tsx:109–113` — auto-searches on change |
| 4. Results ranked by relevance | 🟡 | `recipes.py:130–150` does `title.ilike(f"%{q}%")` ordered by `created_at.desc()` — **not ranked by relevance** |
| 5. Select recipe → UC-9 | ✅ | `HomeScreen.tsx:203` |
| **Alt:** Multi-ingredient search returns AT LEAST ONE, ranked by match count | ❌ | Search is **title/keyword substring only** (`recipes.py:141–142`). No ingredient-based search path from the Home search bar. |
| **Exc:** Empty search → all by popularity | 🟡 | `HomeScreen.tsx:109–113` falls back to paginated `/recipes`, but ordered by date not popularity |
| **Exc:** No matches → message + try different keywords | ✅ | `HomeScreen.tsx:320–325` |

---

### UC-9: View Recipe Details

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Reachable from browse, search, recommendation results | ✅ | `HomeStack`, `CommunityStack`, `ProfileStack` all include RecipeDetail; `SimilarRecipesScreen.tsx:62` navigates to it |
| 2. Displays all required fields | ✅ | Recipe name (`RecipeDetailScreen.tsx:179`), cuisine (`l228`), owner username (`l182`), difficulty (`l233`), prep time (`l241–246`), cooking time (`l248–253`), ingredients (`l265–295`), steps (`l308–321`) — all present |
| 3. User reads details | ✅ | |
| 4. Option to save or navigate back | ✅ | Back button `l168–175`, save/heart `l215–217` |
| **Alt:** Save Recipe → UC-10 | ✅ | `RecipeDetailScreen.tsx:72–80` (handleToggleSave) |
| **Exc:** Recipe fails to load → error + retry | 🟡 | `RecipeDetailScreen.tsx:147–157` shows error message + "Go Back" button. **No "Retry" option** — only back navigation |

---

### UC-10: Save / Bookmark Recipe

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Bookmark icon on details page | 🟡 | `RecipeDetailScreen.tsx:215` — uses **heart icon** (`Ionicons 'heart'`), not a bookmark icon. Functionally equivalent. |
| 2. Checks if already saved | ✅ | `RecipeDetailScreen.tsx:61` — calls `GET /social/recipes/{id}/is-saved` |
| 3. Saves to user's bookmarks (persisted in DB) | ✅ | `social.py:59–87` — `SavedRecipe` row in PostgreSQL; unique constraint enforced |
| 4. Icon updates to saved state | ✅ | `RecipeDetailScreen.tsx:72–80` — updates `saved` state |
| **Alt:** Already bookmarked → message + option to remove | 🟡 | `social.py:72–76` toggles (silently unsaves). **No confirmation dialog or "already saved" message** shown to user — icon just changes. |
| **View saved recipes later** | ✅ | `ProfileScreen.tsx:393–415` — "Collections" tab |

---

### UC-11: Post Recipe

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. "Post Recipe" option | ✅ | Post tab in `TabNavigator.tsx:89` |
| 2. Posting form | ✅ | `PostScreen.tsx:55–348` |
| 3. Cover photo upload | 🟡 | `PostScreen.tsx:71–76` — picks from device gallery (`expo-image-picker`). **Image is stored as a local device URI and sent as `image_url`** to the API. It will not be accessible by other users — no cloud upload (no S3, Supabase Storage, etc.). |
| 4. Name, cuisine, difficulty, prep time, cook time | ✅ | `PostScreen.tsx:192–259` |
| 5. Ingredients list | ✅ | `PostScreen.tsx:261–282` |
| 6. Step-by-step instructions | ✅ | `PostScreen.tsx:284–311` |
| 7. Tags | ✅ | `PostScreen.tsx:313–329` |
| 8. Submit | ✅ | `PostScreen.tsx:332–343` |
| 9. Validation | 🟡 | `PostScreen.tsx:99–103` checks title, ingredients, steps. **Cover photo is NOT required** — no check for `imageUri`. Spec says cover photo is required. |
| 10. Published and visible in community feed | ✅ | `PostScreen.tsx:122–127` creates recipe then post; `CommunityScreen` loads from `GET /posts` |
| 11. Knowledge graph updated | ✅ | `recipes.py:272–298` — on POST /recipes creates Recipe node, Ingredient nodes, CONTAINS edges, updates CO_OCCURS edges in Neo4j |
| **Exc:** Missing required fields or cover photo | 🟡 | Title/ingredients/steps checked (`PostScreen.tsx:99–103`); cover photo not enforced |

---

### UC-12: Manage Own Recipe

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. "My posted recipes" view | ✅ | `ProfileScreen.tsx:365–391` — "My Recipes" tab |
| 2. Select a recipe | ✅ | `ProfileScreen.tsx:208–230` — tap to navigate |
| 3. Management options shown | ✅ | `ProfileScreen.tsx:220–229` — pencil/edit icon |
| 4. Edit (form → update → validate → save) | ✅ | `EditRecipeScreen.tsx` — full edit form; `recipes.py:302–332` (PUT /recipes/{id}) validates ownership |
| 5. Delete (confirm → remove) | ❌ | **No delete button in `EditRecipeScreen.tsx`**. No `DELETE /recipes/{id}` endpoint in `recipes.py`. |
| **Alt:** Cancel deletion | ❌ | N/A — delete not implemented |
| **Ownership enforced server-side** | ✅ | `recipes.py:314–316` — 403 if `contributor_id != current_user.id` |
| **Edits/deletes update knowledge graph** | ❌ | `recipes.py:302–332` (PUT) does **not** update Neo4j. Graph can become stale after edits. |

---

### UC-13: Comment and Rate Recipe

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Recipe post page | ✅ | `RecipeDetailScreen.tsx` |
| 2. Comment section AND rating option displayed | 🟡 | Comment section ✅ (`RecipeDetailScreen.tsx:219`). **Rating option absent** — no stars, no rating model (`social.py` has no Rating table), no rating endpoint. |
| 3. User picks an action | ✅ | (for comments) |
| 4. Comment: enter text → submit → saved with username + timestamp | ✅ | `RecipeDetailScreen.tsx:83–104`; `social.py:164–180`; displayed with username + formatted date |
| 5. Rate: 1–5 stars | ❌ | **Completely unimplemented** — no model, no API, no UI |
| **Alt:** Already rated → update (1 rating per user per recipe) | ❌ | Not implemented |

---

### UC-14: Get Recipe Recommendation

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Personalised Recommendation page | ❌ | **No dedicated recommendation page exists** in the tab navigator. The Match/Shopping tab goes to `ShoppingListScreen`. |
| 2. Popular ingredient suggestions displayed | 🟡 | The pantry feature in `ShoppingListScreen.tsx:303–310` lets users search/add ingredients. Not a "popular suggestions" flow as spec describes. The backend `GET /recommendations/popular-ingredients` exists but is only used in the Profile Insights graph. |
| 3. User selects ingredients on hand | 🟡 | Via the "My Pantry" section in `ShoppingListScreen.tsx:256–330` |
| 4. Optional dietary preferences | ❌ | Dietary preferences from UC-6 are **never passed** to any recommendation API call |
| 5. Submit request | 🟡 | Implicit — pantry update triggers fetchSuggestions (`ShoppingListScreen.tsx:141`) |
| 6. Request to recommendation engine | 🟡 | `ShoppingListScreen.tsx:170` calls `POST /recipes/match` (PostgreSQL ingredient substring match). **Not the Neo4j-based recommendation engine.** The `POST /recommendations/recipes` endpoint (Neo4j ingredient matching + Jaccard similarity) at `recommendations.py:56–107` is never called from the frontend. |
| **Alt:** No dietary preferences → proceeds without | 🟡 | Implicitly true, but dietary preferences are never checked |
| **Exc:** No ingredients selected → error | ❌ | `ShoppingListScreen.tsx:153–154` silently returns empty array — **no error message shown to user** |

**Engine classification:** The partial recommendation in `ShoppingListScreen` uses PostgreSQL text matching (not the knowledge graph). The real Neo4j Jaccard similarity endpoint exists in the backend but is only reachable via `SimilarRecipesScreen` (from a viewed recipe). Neither implementation constitutes "link prediction" — both are neighbourhood-similarity approaches, not GNN/embedding-based prediction.

---

### UC-15: View Recommendation Results

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Request processed | 🟡 | Via `ShoppingListScreen` pantry flow |
| 2. Ranked list returned | 🟡 | `recipes.py:187` sorts by `missing_count` (ascending) — closest to completion first |
| 3. User views results | 🟡 | "Almost Ready to Cook" section in `ShoppingListScreen.tsx:396–480` |
| 4. Each result shows: recipe name ✅, cuisine type ❌, match relevance (score/%) | 🟡 | Shows title and `missing_count` badge, but **no match % / Jaccard score** (that is shown only in `SimilarRecipesScreen.tsx:53`) |
| 5. Select recipe → UC-9 | ❌ | The suggestion cards in `ShoppingListScreen.tsx:430–475` **have no navigation to RecipeDetail**. Tapping a missing ingredient adds it to the shopping list; the recipe card itself is not tappable. |
| **Alt:** Save a recommended recipe → UC-10 | ❌ | No save/bookmark button on suggestion cards |
| **Exc:** No recommendations → message + suggestion | 🟡 | Section hidden when empty — no explicit "no recommendations found" message |

---

### UC-16: Get Grocery Suggestion

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Grocery Suggestion page | 🟡 | **No dedicated page** — grocery suggestions embedded in `ShoppingListScreen` ("Almost Ready to Cook" section) |
| 2. Analyses user's current ingredient list FROM THEIR PROFILE | 🟡 | Pantry stored in **AsyncStorage** (`PANTRY_KEY`) — not in the user's DB profile. The `Profile.frequently_used_ingredients` column (`user.py:33`) exists but is never populated. **There is no spec-defined UC to build a pantry/ingredient list** — this is an undocumented prerequisite. |
| 3. Identifies missing ingredients using knowledge graph | 🟡 | Uses `POST /recipes/match` (PostgreSQL substring matching), not the Neo4j `POST /recommendations/grocery` endpoint (`recommendations.py:110–131`) which uses CO_OCCURS relationships. |
| 4. Ranks by number of recipes they would unlock | 🟡 | `/recipes/match` sorts by `missing_count` (ascending). Backend `/recommendations/grocery` ranks by `CO_OCCURS.frequency` sum — but this endpoint is unused by the frontend. |
| 5. Prioritised list displayed | ✅ | `ShoppingListScreen.tsx:396–480` |
| 6. User views suggestions | ✅ | |
| **Alt:** Add to shopping list → UC-17 | ✅ | `ShoppingListScreen.tsx:456–473` |
| **Exc:** No missing ingredients → message | ❌ | Section silently hidden; no "no additional ingredients suggested" message |

---

### UC-17: View Grocery List

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Grocery suggestion list displayed | 🟡 | "Almost Ready to Cook" section in `ShoppingListScreen` (combined with shopping list management) |
| 2. Each item shows: ingredient name ✅, category ❌, recipes unlocked count ❌ | 🟡 | Shows ingredient name and "missing" badge count only. **No category displayed per missing ingredient, no "recipes it would unlock" count** |
| 3. User reviews | ✅ | |
| 4. User selects ingredients to add | ✅ | `ShoppingListScreen.tsx:460–474` — "+" button per ingredient |
| 5. Selected items added to shopping list | ✅ | `ShoppingListScreen.tsx:209–215` |
| **Alt:** Added → UC-18 | ✅ | Same screen, shopping list section below |

---

### UC-18: Manage Shopping List

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Shopping list page | ✅ | `ShoppingListScreen.tsx` (Match tab) |
| 2. List displayed GROUPED BY CATEGORY | ✅ | `ShoppingListScreen.tsx:248–251` — SectionList with category sections; `l540–544` renders section headers |
| 3. Actions: mark bought ✅, add manually ✅, remove item ✅ | ✅ | `l224–232` (toggle), `l217–222` (addItem), `l233` (removeItem) |
| 4. List updates after each action (persisted) | 🟡 | `l204–207` saves to **AsyncStorage only** — not to backend DB. Data lost on reinstall; not cross-device. |
| **Alt:** All bought → option to clear completed | 🟡 | `clearCompleted()` function exists at `ShoppingListScreen.tsx:235–239` but the **button is commented out** at `l520–523`. Only "Clear all" is available. |

---

### UC-19: View Dashboard

| Step | Status | Evidence / Gap |
|---|---|---|
| 1. Dashboard page | 🟡 | **No dedicated Dashboard screen**. Closest equivalent: "Insights" tab in `ProfileScreen.tsx:424–508` + Cooking Streak in `HomeScreen.tsx:27–79` |
| 2. Ingredient–recipe relationship graph (interactive) | 🟡 | `ProfileScreen.tsx:475–506` shows an SVG graph of **ingredient co-occurrence** (ingredient↔ingredient, not ingredient↔recipe). Tabs are interactive (click to change centre ingredient). Graph is rendered but labelled incorrectly vs spec. |
| 3. Personal stats: saved count ✅, top ingredient 🟡, favourite cuisine ❌ | 🟡 | Saved count: `ProfileScreen.tsx:299` ✅. Top ingredient: derived from **shopping list** AsyncStorage (`l78–79`), not from user recipe interactions. **Favourite cuisine not implemented anywhere.** |
| 4. Cooking streak | 🟡 | `ProfileScreen.tsx:148–154` and `profile.py:12–29`. **Driven by manual daily check-in** — no "cooking event" is automatically recorded when a user views/saves/cooks a recipe. |
| 5. Filters by cuisine or ingredient | 🟡 | Ingredient filter for the graph: `ProfileScreen.tsx:447–463` ✅. **No cuisine filter** anywhere. |
| 6. Dashboard updates per filter | ✅ | `ProfileScreen.tsx:94–109` — selectIngredient triggers loadCooccurrences and graph re-renders |
| **Exc:** No interaction data → prompt user | 🟡 | `ProfileScreen.tsx:471–474` shows message for empty ingredient graph. **No message for empty saved/streak stats.** |

---

## 4. Relationship Check

| Relationship | Status | Evidence |
|---|---|---|
| UC-3 <<extend>> UC-2 | ❌ | "Forgot Password" link at `LoginScreen.tsx:75–77` renders but **has no `onPress` handler**. UC-3 flow does not exist. |
| UC-7 <<include>> UC-9 | ✅ | `HomeScreen.tsx:203` → `navigation.navigate('RecipeDetail', ...)` |
| UC-8 <<include>> UC-9 | ✅ | Search results in HomeScreen navigate to RecipeDetail |
| UC-11 <<include>> UC-9 | ❌ | After posting, `PostScreen.tsx:141–144` navigates to Community feed, **not to the newly created recipe's detail page** |
| UC-9 <<extend>> UC-10 | ✅ | `RecipeDetailScreen.tsx:215` — heart/save button invokes handleToggleSave |
| UC-15 <<extend>> UC-10 | ❌ | Suggestion cards in `ShoppingListScreen.tsx` have **no save button and no navigation to RecipeDetail** |
| UC-15 <<extend>> UC-9 | 🟡 | `SimilarRecipesScreen.tsx:62` navigates to RecipeDetail ✅. But the "recommendation results" in `ShoppingListScreen` (which is the primary UC-15 implementation) do **not** navigate to RecipeDetail. |
| UC-14 <<include>> UC-15 | ❌ | No dedicated UC-14 page exists. The result display (UC-15) is embedded in ShoppingListScreen without a clear UC-14 trigger flow. |
| UC-16 <<include>> UC-17 | 🟡 | Both embedded in `ShoppingListScreen.tsx`. Functional but not as separate pages. |
| UC-17 <<extend>> UC-18 | ✅ | Adding a missing ingredient from the suggestion card (`addToShoppingList`) adds it to the shopping list in the same screen. |

---

## 5. Cross-Cutting Issues

### 5.1 Auth Guard

| Aspect | Status | Detail |
|---|---|---|
| UI route protection | ✅ | `AppNavigator.tsx:16–18` checks AsyncStorage for token on startup; routes to Login or Main |
| API protection (write ops) | ✅ | `get_current_user_dep` dependency used on: POST/PUT /recipes, POST /posts, POST /social/*/save, POST /social/*/comments, POST/DELETE /social/*/follow, POST /profile/checkin, GET /profile/streak |
| Public read access | ✅ | `GET /recipes`, `GET /recipes/search`, `GET /recipes/{id}`, `GET /posts` — no auth required (correct per spec for browsing) |
| Server-side token revocation | ❌ | JWT is stateless; logout only clears AsyncStorage client-side. A stolen token remains valid for 24h. |
| Runtime session expiry handling | ❌ | `apiClient.ts` interceptor adds the token to requests but does not handle 401 responses (expired token) by redirecting to login |

### 5.2 Image Storage (Critical)

Cover photos selected in `PostScreen.tsx:71–76` are stored as local device URIs and sent as `image_url` to the backend. Other users fetching the recipe will receive a URI pointing to the original poster's phone filesystem, which is inaccessible. No cloud storage is configured. Affects: UC-11, UC-9, UC-7, UC-15, UC-19.

### 5.3 Profile / Dietary Data Persistence

`Profile.bio` and `Profile.dietary_preferences` columns exist in the PostgreSQL schema (`user.py:31,32`) but are **never written to from the mobile app**. The `saveEdit()` function (`ProfileScreen.tsx:180–185`) writes only to AsyncStorage. This means profile data is not synced between devices, is lost on reinstall, and the recommendation engine cannot access it.

### 5.4 Shopping List / Pantry Persistence

Both `SHOPPING_KEY` and `PANTRY_KEY` are stored exclusively in AsyncStorage. No backend API exists for these. Impact: UC-16, UC-17, UC-18.

### 5.5 Knowledge Graph Synchronisation

- **Create:** ✅ `recipes.py:272–298` updates Neo4j on recipe creation
- **Edit:** ❌ `recipes.py:302–332` (PUT) does NOT update Neo4j. After editing a recipe's ingredients, the graph becomes stale.
- **Delete:** ❌ No DELETE endpoint exists. Recipes cannot be removed from either PostgreSQL or Neo4j.

### 5.6 Dead Code

`RecipesScreen.tsx` (~344 lines) implements full filter functionality (cuisine chips, difficulty pills, under-30-min toggle, search bar, paginated results with save toggle) but is **never imported** into `AppNavigator.tsx` or `TabNavigator.tsx`. It is unreachable.

### 5.7 Rating System

No `Rating` model, no `POST /social/recipes/{id}/rate` endpoint, no star UI component anywhere in the codebase. UC-13 (rating sub-flow) is entirely absent.

### 5.8 Recipe Delete

No `DELETE /recipes/{id}` endpoint. No delete button in `EditRecipeScreen.tsx`. UC-12 step 5 is unimplemented.

### 5.9 Recommendation Engine Architecture

The app contains **three different recommendation mechanisms**, only one of which is wired to the UI from the spec's UC-14/15 perspective:

| Mechanism | Where | Tech | Spec alignment |
|---|---|---|---|
| `/recipes/match` (ShoppingListScreen "Almost Ready to Cook") | Frontend ✅ | PostgreSQL substring matching | Partial — ingredient matching works but uses DB not graph |
| `/recommendations/recipes` (Neo4j ingredient match + Jaccard) | Frontend ❌ (endpoint exists, never called) | Neo4j Cypher, Jaccard similarity | Closest to spec's UC-14 intent |
| `/recommendations/recipes/{id}/similar` (SimilarRecipesScreen) | Frontend ✅ (from recipe detail only) | Neo4j Jaccard similarity | Fulfills a recommendation use case but not UC-14 as described |

None of these implements "link prediction" in the GNN/embedding sense. The Jaccard similarity approach is a sound graph-neighbourhood method and defensible for an FYP.

### 5.10 Non-Spec Features (Scope Creep / Extras)

These features exist in code but are NOT in the specification:

1. **Cooking streak & daily check-in** (`profile.py`, `ProfileScreen.tsx`, `HomeScreen.tsx`) — gamification feature
2. **Social follow/unfollow** (`social.py:/social/users/{id}/follow`, `PublicProfileScreen.tsx`) — user graph
3. **Neo4j personalised feed** (`social.py:/social/feed`) — implemented but not wired to any screen
4. **"Can Cook Now"** (`ShoppingListScreen` + `/recipes/can-cook`) — shows recipes achievable with current pantry
5. **"Similar Recipes"** (`SimilarRecipesScreen.tsx` + `/recommendations/recipes/{id}/similar`) — Jaccard-based recipe similarity from detail view
6. **Quick-Add pantry categories** (`ShoppingListScreen.tsx:24–29`) — predefined ingredient picker
7. **Ingredient co-occurrence graph** in Profile Insights
8. **Community post captions** (`Post.caption`) — separate from recipe description
9. **Public profile view** (`PublicProfileScreen.tsx`) — view other users' profiles

---

## 6. Prioritised Fix List

Ordered by impact on FYP demo / evaluation (highest impact first).

| Priority | Issue | Files to Change | Effort |
|---|---|---|---|
| 1 | **UC-14/15: Create a dedicated Recommendation page** — Add a "Match" or "Recommend" screen that calls `POST /recommendations/recipes` (Neo4j Jaccard), shows popular ingredient suggestions, allows dietary preference selection, and navigates to RecipeDetail on result tap | `TabNavigator.tsx` (add tab), new `RecommendScreen.tsx`, `recommendations.py` (add dietary filter) | L |
| 2 | **UC-3: Implement Forgot Password** — Add `POST /auth/forgot-password` (send reset email) and `POST /auth/reset-password` (validate token, update hash). Add `ForgotPasswordScreen.tsx` wired to the existing link at `LoginScreen.tsx:75` | `LoginScreen.tsx`, new `ForgotPasswordScreen.tsx`, `auth.py`, `user.py` (add reset_token column), email provider config | L |
| 3 | **UC-13: Implement Recipe Rating (1–5 stars)** — Add `Rating` model, `POST /social/recipes/{id}/rate`, `GET /social/recipes/{id}/ratings`. Add star UI to `RecipeDetailScreen.tsx` | `social.py`, new `Rating` model, `RecipeDetailScreen.tsx`, `alembic migration` | M |
| 4 | **UC-5/UC-6: Persist profile changes to DB** — Wire `saveEdit()` in `ProfileScreen.tsx` to `PUT /profile/me` endpoint that writes `bio` and `dietary_preferences` to the `profiles` table | `ProfileScreen.tsx:180–185`, new `PUT /profile/me` in `profile.py` | S |
| 5 | **UC-11: Fix image storage** — Integrate a cloud storage service (Supabase Storage or S3) to upload the image and return a public URL before calling `POST /recipes` | `PostScreen.tsx:71–76, 108–120`, backend image upload endpoint or direct-to-cloud upload | M |
| 6 | **UC-7: Wire RecipesScreen.tsx into navigation** — `RecipesScreen.tsx` has full filter functionality. Import it as the Home tab screen (or a secondary screen from Home). Alternatively, merge its filter UI into `HomeScreen.tsx` | `TabNavigator.tsx` (swap HomeScreen for RecipesScreen in HomeStack), minor RecipesScreen navigation param fix | S |
| 7 | **UC-12: Implement recipe delete** — Add `DELETE /recipes/{id}` (ownership check + PostgreSQL delete + Neo4j node removal) and a delete button/confirmation in `EditRecipeScreen.tsx` | `EditRecipeScreen.tsx`, `recipes.py`, Neo4j cleanup query | S |
| 8 | **UC-12/UC-11: Sync knowledge graph on edit** — Add Neo4j update logic to `PUT /recipes/{id}`: remove old CONTAINS edges, re-add new ones, update CO_OCCURS | `recipes.py:302–332` | S |
| 9 | **UC-18: Persist shopping list to backend** — Add a `shopping_list_items` table and CRUD endpoints; update `ShoppingListScreen` to use API instead of AsyncStorage | New model + migration, new router, `ShoppingListScreen.tsx` | M |
| 10 | **UC-16: Use Profile pantry (persist to DB)** — Move pantry data from AsyncStorage to `Profile.frequently_used_ingredients`; add `PUT /profile/pantry` endpoint | `ShoppingListScreen.tsx`, `profile.py`, `user.py` | S |
| 11 | **UC-3 (quick fix): Add onPress to Forgot Password** — Minimum: wire the link to a screen. Until full flow is built, show an Alert with instructions | `LoginScreen.tsx:75` | S |
| 12 | **UC-1/UC-2: Define password rules** — Add minimum length + at least 1 digit or special char validation in `RegisterScreen.tsx:26–41` and mirror in backend `schemas/user.py` (Pydantic validator) | `RegisterScreen.tsx`, `schemas/user.py` | S |
| 13 | **UC-5: Add email display + username/email editing** — Show email in profile header; add username/email fields to Edit modal with uniqueness re-validation | `ProfileScreen.tsx`, `profile.py` or `auth.py` | M |
| 14 | **UC-4: Handle token expiry client-side** — Add Axios response interceptor in `apiClient.ts` to detect 401 and navigate to Login | `src/api/apiClient.ts` | S |
| 15 | **UC-18: Uncomment "Clear completed" button** | `ShoppingListScreen.tsx:520–523` | S (1 line) |
| 16 | **UC-9: Add retry button on error screen** | `RecipeDetailScreen.tsx:147–157` | S |
| 17 | **UC-6: Add "allergen-free" to dietary options** | `ProfileScreen.tsx:40` (DIET_OPTIONS array) | S (1 line) |
| 18 | **UC-19: Favourite cuisine stat** — Compute most frequent cuisine from saved recipes list; display in Insights | `ProfileScreen.tsx:427–440` | S |
| 19 | **UC-7: Default sort by saves count** — Change `recipes.py:125` from `order_by(Recipe.created_at.desc())` to a subquery join on `SavedRecipe` count | `recipes.py:110–127` | S |

---

## 7. Overall Completion

### By Step Count

Across all 19 use cases, approximately **163 checkpoints** (main + alt + exception steps) were evaluated:

| Label | Count | % |
|---|---|---|
| ✅ Fully implemented | ~73 | ~45% |
| 🟡 Partial / deviates from spec | ~53 | ~32% |
| ❌ Missing | ~37 | ~23% |

**Step-level completion: ~61%** (counting ✅ as 1.0 and 🟡 as 0.5)

### By Use Case

| Category | Count | % |
|---|---|---|
| ✅ Substantially complete (≥ 75% steps) | 4 (UC-1, UC-4, UC-9, UC-10) | 21% |
| 🟡 Partial (25–74% steps) | 13 | 68% |
| ❌ Mostly/entirely missing (< 25% steps) | 2 (UC-3, UC-14) | 11% |

**Use case completion (weighted 0.5 for partial): ~10.5 / 19 = 55%**

### Summary Assessment

The application has a **solid core** (auth, recipe CRUD, community posts, comments, save/bookmark, Neo4j knowledge graph for similar recipes) that is largely working. The main gaps for the FYP evaluation are:

1. The **recommendation engine** (UC-14/15) has a backend implementation but no dedicated UI page and is not wired to the frontend.
2. **Forgot Password** (UC-3) is entirely absent despite the link existing.
3. **Recipe rating** (UC-13) is entirely absent.
4. **Recipe delete** (UC-12) is absent.
5. **Profile persistence** (UC-5/6) saves to local storage only.
6. **Image uploads** (UC-11) use local URIs that are inaccessible to other users.
7. **Filter/discovery UI** (UC-7) exists as dead code in `RecipesScreen.tsx`.
