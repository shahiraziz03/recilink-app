#!/usr/bin/env python3
"""
Self-check for recipe JSON files.
For each file: (1) Malay words in English fields, (2) step/ingredient coverage,
(3) ingredient_names.json coverage.
"""

import json, os, re, sys

BASE   = os.path.dirname(__file__)
ING_MAP = json.load(open(os.path.join(BASE, 'ingredient_names.json')))
RECIPES_DIR = os.path.join(BASE, 'recipes')

# ── Malay word list (words that clearly don't belong in English text) ──────────
MALAY_WORDS = {
    # common function words
    'dan', 'dengan', 'ke', 'di', 'dalam', 'pada', 'untuk', 'yang', 'dari',
    'atas', 'bawah', 'sampai', 'jangan', 'boleh', 'atau', 'tak', 'ada',
    'sikit', 'bagi', 'dah', 'lagi', 'pun', 'ni', 'tu',
    # cooking verbs
    'masukkan', 'campurkan', 'kacau', 'goreng', 'tumis', 'rebus', 'kukus',
    'bakar', 'tapis', 'tuang', 'potong', 'ambil', 'letak',
    # common nouns / adjectives
    'sedap', 'manis', 'pekat', 'panas', 'sejuk', 'garing', 'kering',
    'basah', 'nipis', 'tebal', 'besar', 'kecil', 'putih', 'merah', 'kuning',
    # Malay ingredient/unit words
    'sudu', 'cawan', 'biji', 'keping', 'ulas', 'batang', 'helai', 'blok',
    'roti', 'telur', 'gula', 'garam', 'minyak', 'ayam', 'pisang', 'tepung',
    'mentega', 'coklat', 'santan', 'bawang', 'kunyit', 'esen', 'krimer',
    'sos', 'daun', 'serbuk',
}

def malay_words_in(text: str) -> list[str]:
    """Return list of Malay words found in an English text string."""
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    return sorted({w for w in words if w in MALAY_WORDS})

def check_recipe(path: str) -> dict:
    with open(path) as f:
        r = json.load(f)

    issues = {
        'malay_in_english_fields': {},
        'steps_ingredients_not_in_list': [],
        'name_ms_not_in_ingredient_names': [],
        'name_en_mismatch': [],
        'quantity_not_numeric': [],
    }

    # ── 1. Malay words in English fields ──────────────────────────────────────
    check_fields = {
        'title':       r.get('title', ''),
        'description': r.get('description', ''),
    }
    for i, step in enumerate(r.get('steps', [])):
        check_fields[f'steps[{i}]'] = step
    for i, ing in enumerate(r.get('ingredients', [])):
        check_fields[f'ingredients[{i}]'] = ing

    for field, text in check_fields.items():
        found = malay_words_in(text)
        if found:
            issues['malay_in_english_fields'][field] = found

    # ── 2. Ingredient names referenced in steps but absent from list ──────────
    ing_set = {x.lower() for x in r.get('ingredients', [])}
    # also add single-word sub-parts so "chicken" matches "chicken fillet" etc.
    expanded = set()
    for name in ing_set:
        expanded.update(name.split())
    for i, step in enumerate(r.get('steps', [])):
        words = set(re.findall(r'\b[a-zA-Z]+(?:\s+[a-zA-Z]+)?\b', step.lower()))
        for phrase in words:
            if phrase in {'the', 'a', 'an', 'and', 'or', 'in', 'on', 'of',
                          'to', 'with', 'from', 'into', 'until', 'over',
                          'each', 'all', 'very', 'hot', 'dry', 'wet'}:
                continue

    # ── 3. ingredients_detailed checks ───────────────────────────────────────
    for det in r.get('ingredients_detailed', []):
        name_ms = det.get('name_ms', '')
        name_en = det.get('name', '')
        qty     = det.get('quantity')

        # 3a. name_ms must be a key in ingredient_names.json
        if name_ms and name_ms not in ING_MAP:
            issues['name_ms_not_in_ingredient_names'].append(name_ms)

        # 3b. if name_ms is in map, the English name should match
        if name_ms and name_ms in ING_MAP and ING_MAP[name_ms] != name_en:
            issues['name_en_mismatch'].append(
                f'name_ms="{name_ms}" → map says "{ING_MAP[name_ms]}" but recipe has "{name_en}"'
            )

        # 3c. quantity must be number or null
        if qty is not None and not isinstance(qty, (int, float)):
            issues['quantity_not_numeric'].append(
                f'{name_ms}: quantity={qty!r} (type {type(qty).__name__})'
            )

    return issues

# ── run over requested files ──────────────────────────────────────────────────
targets = sys.argv[1:] if len(sys.argv) > 1 else sorted(os.listdir(RECIPES_DIR))

for fname in targets:
    if not fname.endswith('.json'):
        continue
    fpath = os.path.join(RECIPES_DIR, fname)
    if not os.path.exists(fpath):
        fpath = fname  # allow absolute/relative path

    with open(fpath) as f:
        r = json.load(f)

    print(f'\n{"═"*60}')
    print(f'  {r.get("title","?")}  ({fname})')
    print(f'{"═"*60}')

    issues = check_recipe(fpath)

    # Malay in English fields
    if issues['malay_in_english_fields']:
        print('  ⚠ Malay words in English fields:')
        for field, words in issues['malay_in_english_fields'].items():
            print(f'      {field}: {words}')
    else:
        print('  ✓ No Malay words detected in English fields')

    # name_ms not in map
    if issues['name_ms_not_in_ingredient_names']:
        print('  ⚠ name_ms not in ingredient_names.json:')
        for m in issues['name_ms_not_in_ingredient_names']:
            print(f'      "{m}"')
    else:
        print('  ✓ All name_ms values are in ingredient_names.json')

    # English name mismatch
    if issues['name_en_mismatch']:
        print('  ⚠ English name mismatch vs ingredient_names.json:')
        for m in issues['name_en_mismatch']:
            print(f'      {m}')
    else:
        print('  ✓ All English names match ingredient_names.json')

    # quantity type
    if issues['quantity_not_numeric']:
        print('  ⚠ Non-numeric quantity values:')
        for m in issues['quantity_not_numeric']:
            print(f'      {m}')
    else:
        print('  ✓ All quantities are numeric (or null)')

print()
