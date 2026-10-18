#!/usr/bin/env python3
"""fix_all.py – one-shot fix:
  A. Patch ingredient_names.json (name changes + new entries)
  B. Write split recipe files for all compilation videos
  C. Delete original compilation files
  D. Global pass: NAME_REMAP, CUISINE_MAP, regenerate ingredients[]
"""
import json, os, glob

BASE   = os.path.dirname(__file__)
RDIR   = os.path.join(BASE, "recipes")
NAMESF = os.path.join(BASE, "ingredient_names.json")

# ─────────────────────────────────────────────────────────────────────────────
# A. ingredient_names.json
# ─────────────────────────────────────────────────────────────────────────────
with open(NAMESF, encoding="utf-8") as f:
    names = json.load(f)

names["bawang merah"]   = "shallot"              # was "onion"
names["bawang ros"]     = "shallot"              # was "small red shallot"
names["bawang holland"] = "onion"                # was "sweet onion"
names["susu cair"]      = "evaporated milk"      # was "evaporated milk (liquid)"
names["lada besar"]     = "large red chilli"     # was "large chilli"

# new entries for drinks
names["aiskrim vanila"]  = "vanilla ice cream"
names["air berkarbonat"] = "sparkling water"
names["air gula"]        = "sugar syrup"
names["kopi segera"]     = "instant coffee"
names["pewarna merah"]   = "red food colouring"
names["sarsi"]           = "sarsi (cream soda)"
names["teh bunga ros"]   = "roselle tea"
names["vitagen"]         = "probiotic drink"
names["zapple"]          = "apple sparkling drink"
names["susu pekat manis"] = "sweetened condensed milk"   # duplicate of krimer manis; flag to user

with open(NAMESF, "w", encoding="utf-8") as f:
    json.dump(dict(sorted(names.items())), f, ensure_ascii=False, indent=2)
print("A. ingredient_names.json updated.")

# ─────────────────────────────────────────────────────────────────────────────
# B. SPLIT FILES
# ─────────────────────────────────────────────────────────────────────────────
def ing(name, name_ms, qty, unit, note=""):
    return {"name": name, "name_ms": name_ms, "quantity": qty, "unit": unit, "note": note}

SPLITS = []   # list of (filename, recipe_dict)

# ══ V8 – Six Sahur Dishes ══════════════════════════════════════════════════
VID8 = "7476807227114835218"

SPLITS.append((f"{VID8}_1.json", {
  "video_id": VID8, "is_recipe": True, "needs_review": True,
  "review_notes": "mackerel quantity not stated; sugar quantity to taste",
  "title": "Fried Mackerel with Chilli Padi (Ikan Kembung Goreng Cili Padi)",
  "title_ms": "Ikan Kembung Goreng Cili Padi",
  "description": "Crispy fried mackerel tossed with fried shallots, lemongrass, garlic and bird's eye chilli in a quick savory sauce.",
  "description_ms": "Ikan kembung yang digoreng garing dicampurkan dengan tumisan bawang merah, serai, bawang putih dan cili padi.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 10, "cook_time": 15, "servings": 2,
  "ingredients": ["Indian mackerel","salt","turmeric powder","cooking oil","shallot","bird's eye chilli","garlic","lemongrass","oyster sauce","fish sauce","lime","sugar"],
  "steps": [
    "Score the mackerel deeply; coat with salt and a pinch of turmeric powder.",
    "Fry in hot oil until golden and crispy on both sides. Drain and set aside.",
    "In the same pan, sauté 1 shallot (chopped), some bird's eye chilli, 1 garlic clove and 1 lemongrass stalk (sliced) until softened.",
    "Add 1 tbsp oyster sauce, a dash of fish sauce, salt and sugar to taste.",
    "Add the fried mackerel back; toss to coat. Squeeze over lime juice and serve."
  ],
  "steps_ms": [
    "Kelar ikan kembung dalam-dalam; salit dengan garam dan sedikit serbuk kunyit.",
    "Goreng dalam minyak panas sehingga golden garing di kedua-dua belah. Toskan dan ketepikan.",
    "Dalam kuali yang sama, tumis 1 bawang merah (dicincang), cili padi, 1 ulas bawang putih dan 1 batang serai (dihiris) sehingga layu.",
    "Masukkan 1 sudu sos tiram, sedikit sos ikan, garam dan gula secukup rasa.",
    "Masukkan balik ikan goreng; gaul rata. Perah jus limau dan hidang."
  ],
  "tags": ["halal","fish","fried","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("Indian mackerel","ikan kembung",None,None,"quantity not stated; scored"),
    ing("salt","garam",None,None,"to taste"),
    ing("turmeric powder","serbuk kunyit",None,None,"pinch for coating"),
    ing("cooking oil","minyak goreng",None,None,"for frying"),
    ing("shallot","bawang merah",1,None,"chopped"),
    ing("bird's eye chilli","cili padi",None,None,"to taste"),
    ing("garlic","bawang putih",1,"clove",""),
    ing("lemongrass","serai",1,None,"sliced"),
    ing("oyster sauce","sos tiram",1,"tbsp",""),
    ing("fish sauce","sos ikan",None,None,"a dash"),
    ing("lime","limau nipis",None,None,"squeezed over at end"),
    ing("sugar","gula",None,None,"to taste"),
  ]
}))

SPLITS.append((f"{VID8}_2.json", {
  "video_id": VID8, "is_recipe": True, "needs_review": True,
  "review_notes": "chicken fillet quantity not stated",
  "title": "Minced Chicken Egg Roll (Telur Bungkus)",
  "title_ms": "Telur Bungkus Isi Ayam",
  "description": "A thin egg omelette wrapped around a sticky-sweet minced chicken filling — a simple and popular Malaysian sahur dish.",
  "description_ms": "Telur dadar nipis yang dibungkus dengan inti ayam cincang berkicap — hidangan sahur Malaysia yang mudah dan popular.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 10, "cook_time": 15, "servings": 2,
  "ingredients": ["chicken fillet","shallot","garlic","oyster sauce","sweet soy sauce","black pepper","water","cornstarch","egg","salt","cooking oil"],
  "steps": [
    "Sauté 1 shallot and 3 garlic cloves; add minced chicken fillet.",
    "Season with 1 tbsp oyster sauce, 2 tbsp sweet soy sauce and 0.5 tbsp crushed black pepper.",
    "Add a splash of water and a cornstarch slurry (1 tsp cornstarch + water); stir until the filling is thick and glossy. Set aside.",
    "Beat 3 eggs with a pinch of salt; pour into a lightly oiled pan to form a large thin omelette — do not brown.",
    "Place the filling in the centre of the omelette; fold all four edges over to enclose.",
    "Serve seam-side down."
  ],
  "steps_ms": [
    "Tumis 1 bawang merah dan 3 ulas bawang putih; masukkan isi ayam yang dicincang.",
    "Tambah 1 sudu sos tiram, 2 sudu kicap manis dan setengah sudu black pepper yang dihancurkan.",
    "Masukkan sedikit air dan bancuhan tepung jagung (1 sudu kecil tepung jagung + air); kacau sehingga inti pekat dan berkilat. Ketepikan.",
    "Pukul 3 biji telur dengan secubit garam; tuang ke dalam kuali berminyak untuk jadi telur dadar besar yang nipis — jangan biar perang.",
    "Letakkan inti di tengah telur dadar; lipat keempat-empat sisi ke dalam untuk bungkus.",
    "Hidang dengan bahagian lipatan ke bawah."
  ],
  "tags": ["halal","chicken","egg","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("chicken fillet","isi ayam",None,None,"minced; quantity not stated"),
    ing("shallot","bawang merah",1,None,""),
    ing("garlic","bawang putih",3,"clove",""),
    ing("oyster sauce","sos tiram",1,"tbsp",""),
    ing("sweet soy sauce","kicap manis",2,"tbsp",""),
    ing("black pepper","black pepper",0.5,"tbsp","crushed"),
    ing("water","air",None,None,"a splash for filling"),
    ing("cornstarch","tepung jagung",1,"tsp","for slurry"),
    ing("egg","telur",3,None,"for omelette wrapper"),
    ing("salt","garam",None,None,"pinch for eggs"),
    ing("cooking oil","minyak goreng",None,None,"for omelette"),
  ]
}))

SPLITS.append((f"{VID8}_3.json", {
  "video_id": VID8, "is_recipe": True, "needs_review": True,
  "review_notes": "chicken quantity not stated",
  "title": "Chicken in Sweet Soy Sauce (Ayam Masak Kicap)",
  "title_ms": "Ayam Masak Kicap",
  "description": "Crispy fried chicken simmered in a sweet soy sauce glaze with aromatics — a classic Malaysian home-cooked dish.",
  "description_ms": "Ayam yang digoreng garing kemudian direneh dalam sos kicap manis bersama rempah — hidangan rumah Malaysia yang klasik.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 15, "cook_time": 20, "servings": 3,
  "ingredients": ["chicken","salt","turmeric powder","cooking oil","shallot","garlic","lemongrass","ginger","sweet soy sauce","oyster sauce","bird's eye chilli","tomato","spring onion"],
  "steps": [
    "Coat chicken pieces with salt and turmeric; fry in hot oil until golden and crispy. Set aside.",
    "Sauté 1 shallot, 3 garlic cloves, 1 lemongrass stalk and a knob of ginger until fragrant.",
    "Add sweet soy sauce to taste, 1 tbsp oyster sauce, bird's eye chilli and 1 tomato (chopped).",
    "Return the fried chicken; toss to coat in the sauce. Simmer briefly.",
    "Garnish with spring onion and serve."
  ],
  "steps_ms": [
    "Salit kepingan ayam dengan garam dan kunyit; goreng dalam minyak panas sehingga golden garing. Ketepikan.",
    "Tumis 1 bawang merah, 3 ulas bawang putih, 1 batang serai dan seketul halia sehingga wangi.",
    "Masukkan kicap manis secukup rasa, 1 sudu sos tiram, cili padi dan 1 biji tomato (dicincang).",
    "Masukkan balik ayam goreng; gaul dalam sos. Reneh sebentar.",
    "Hiaskan dengan daun bawang dan hidang."
  ],
  "tags": ["halal","chicken","soy sauce","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("chicken","ayam",None,None,"quantity not stated; any cut"),
    ing("salt","garam",None,None,"to taste"),
    ing("turmeric powder","serbuk kunyit",None,None,"for coating"),
    ing("cooking oil","minyak goreng",None,None,""),
    ing("shallot","bawang merah",1,None,""),
    ing("garlic","bawang putih",3,"clove",""),
    ing("lemongrass","serai",1,None,""),
    ing("ginger","halia",None,None,"1 knob"),
    ing("sweet soy sauce","kicap manis",None,None,"to taste"),
    ing("oyster sauce","sos tiram",1,"tbsp",""),
    ing("bird's eye chilli","cili padi",None,None,"to taste"),
    ing("tomato","tomato",1,None,"chopped"),
    ing("spring onion","daun bawang",None,None,"garnish"),
  ]
}))

SPLITS.append((f"{VID8}_4.json", {
  "video_id": VID8, "is_recipe": True, "needs_review": True,
  "review_notes": "prawn quantity not stated; cooked rice quantity not stated",
  "title": "Butter Fried Rice (Nasi Goreng Butter)",
  "title_ms": "Nasi Goreng Butter",
  "description": "Simple and quick butter fried rice with prawn, egg and garlic — flavoured with a packet of instant fried rice seasoning.",
  "description_ms": "Nasi goreng butter yang mudah dan cepat dengan udang, telur dan bawang putih — dibumbui dengan satu paket perencah nasi goreng.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 10, "servings": 2,
  "ingredients": ["butter","egg","prawn","garlic","cooked white rice","instant fried rice seasoning","bird's eye chilli","spring onion"],
  "steps": [
    "Melt 2 tbsp butter in a hot wok.",
    "Add 1 egg (broken) and prawn; stir until egg is just set and prawn turns pink.",
    "Add 3 minced garlic cloves; sauté briefly.",
    "Add leftover cooked rice; break up any clumps and toss well.",
    "Season with 1 packet instant fried rice seasoning; toss to combine.",
    "Add bird's eye chilli and spring onion; serve."
  ],
  "steps_ms": [
    "Cairkan 2 sudu besar butter dalam kuali panas.",
    "Masukkan 1 biji telur (pecahkan) dan udang; kacau sehingga telur baru masak dan udang bertukar merah jambu.",
    "Masukkan 3 ulas bawang putih yang dihacam; tumis sebentar.",
    "Masukkan nasi masak sejuk; hancurkan ketulan dan gaul rata.",
    "Tambah 1 paket perencah nasi goreng; gaul sebati.",
    "Masukkan cili padi dan daun bawang; hidang."
  ],
  "tags": ["halal","fried rice","butter","prawn","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("butter","butter",2,"tbsp",""),
    ing("egg","telur",1,None,""),
    ing("prawn","udang",None,None,"quantity not stated"),
    ing("garlic","bawang putih",3,"clove","minced"),
    ing("cooked white rice","nasi putih",None,None,"day-old rice preferred; quantity not stated"),
    ing("instant fried rice seasoning","perencah nasi goreng",1,None,"1 packet"),
    ing("bird's eye chilli","cili padi",None,None,"to taste"),
    ing("spring onion","daun bawang",None,None,"garnish"),
  ]
}))

SPLITS.append((f"{VID8}_5.json", {
  "video_id": VID8, "is_recipe": True, "needs_review": True,
  "review_notes": "chicken quantity not stated",
  "title": "Chicken Paprik (Ayam Paprik)",
  "title_ms": "Ayam Paprik",
  "description": "Thai-influenced stir-fried chicken with lemongrass, blended chilli, oyster sauce and kaffir lime leaf — aromatic and slightly spicy.",
  "description_ms": "Ayam paprik gaya Thai yang ditumis bersama serai, cili kisar, sos tiram dan daun limau purut — wangi dan sedikit pedas.",
  "cuisine": "Fusion", "difficulty": "Easy", "prep_time": 10, "cook_time": 15, "servings": 3,
  "ingredients": ["chicken","cooking oil","onion","garlic","lemongrass","blended chilli","oyster sauce","tomato sauce","chilli sauce","fish sauce","kaffir lime leaf","bird's eye chilli"],
  "steps": [
    "Sauté 0.5 onion (bawang Holland), 3 garlic cloves and 1 lemongrass stalk in hot oil.",
    "Add 1 tbsp blended chilli; fry until fragrant.",
    "Add chicken pieces; stir-fry until sealed.",
    "Add 1 tbsp oyster sauce, 1 tbsp tomato sauce, 1 tbsp chilli sauce and a dash of fish sauce.",
    "Add 2–3 kaffir lime leaves and bird's eye chilli; toss and cook until the chicken is done.",
    "Serve with rice."
  ],
  "steps_ms": [
    "Tumis setengah biji bawang Holland, 3 ulas bawang putih dan 1 batang serai dalam minyak panas.",
    "Masukkan 1 sudu cili kisar; goreng sehingga wangi.",
    "Masukkan kepingan ayam; tumis sehingga bertukar warna.",
    "Masukkan 1 sudu sos tiram, 1 sudu sos tomato, 1 sudu sos cili dan sedikit sos ikan.",
    "Masukkan 2-3 helai daun limau purut dan cili padi; gaul dan masak sehingga ayam masak.",
    "Hidang bersama nasi."
  ],
  "tags": ["halal","chicken","stir-fry","thai","fusion","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("chicken","ayam",None,None,"quantity not stated"),
    ing("cooking oil","minyak goreng",None,None,""),
    ing("onion","bawang holland",0.5,None,"half a Holland onion"),
    ing("garlic","bawang putih",3,"clove",""),
    ing("lemongrass","serai",1,None,""),
    ing("blended chilli","cili kisar",1,"tbsp",""),
    ing("oyster sauce","sos tiram",1,"tbsp",""),
    ing("tomato sauce","sos tomato",1,"tbsp",""),
    ing("chilli sauce","sos cili",1,"tbsp",""),
    ing("fish sauce","sos ikan",None,None,"a dash"),
    ing("kaffir lime leaf","daun limau purut",None,None,"2-3 leaves"),
    ing("bird's eye chilli","cili padi",None,None,"to taste"),
  ]
}))

SPLITS.append((f"{VID8}_6.json", {
  "video_id": VID8, "is_recipe": True, "needs_review": False,
  "review_notes": "sardine tin 1 can; egg quantity flexible for omelette base",
  "title": "Sardine Omelette (Telur Dadar Sardin)",
  "title_ms": "Telur Dadar Sardin",
  "description": "A simple sardine filling spooned over a plain fried egg omelette — finished with sweet soy sauce and bird's eye chilli.",
  "description_ms": "Inti sardin yang dimasak dihidang di atas telur dadar goreng — diselesaikan dengan kicap manis dan cili padi.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 10, "servings": 2,
  "ingredients": ["canned sardine","shallot","garlic","cooking oil","water","sweet soy sauce","bird's eye chilli","coriander leaves","egg","salt"],
  "steps": [
    "Sauté 1 shallot and 3 garlic cloves in a little oil until soft.",
    "Add 1 can sardines — pour the sauce in first and add a little water.",
    "Break up the sardine flesh; add sweet soy sauce to taste and bird's eye chilli.",
    "Cook until the filling thickens. Stir in coriander leaves; remove from heat.",
    "Fry 2–3 eggs into a thin plain omelette.",
    "Serve the sardine filling on top of the omelette."
  ],
  "steps_ms": [
    "Tumis 1 bawang merah dan 3 ulas bawang putih dalam sedikit minyak sehingga layu.",
    "Masukkan 1 tin sardin — tuang sos dulu dan tambah sedikit air.",
    "Pecah-pecahkan isi sardin; masukkan kicap manis secukup rasa dan cili padi.",
    "Masak sehingga inti pekat. Masukkan daun ketumbar; angkat dari api.",
    "Goreng 2-3 biji telur jadi telur dadar nipis.",
    "Hidang inti sardin di atas telur dadar."
  ],
  "tags": ["halal","fish","egg","sardine","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("canned sardine","sardin tin",1,"can","use sauce liquid; break up flesh"),
    ing("shallot","bawang merah",1,None,""),
    ing("garlic","bawang putih",3,"clove",""),
    ing("cooking oil","minyak goreng",None,None,"a little"),
    ing("water","air",None,None,"a little"),
    ing("sweet soy sauce","kicap manis",None,None,"to taste"),
    ing("bird's eye chilli","cili padi",None,None,"to taste"),
    ing("coriander leaves","daun ketumbar",None,None,"stirred in at end"),
    ing("egg","telur",None,None,"2-3 for omelette base"),
    ing("salt","garam",None,None,"pinch for eggs"),
  ]
}))

# ══ V14 – Two Siamese Soups ════════════════════════════════════════════════
VID14 = "7478170848759696648"

SPLITS.append((f"{VID14}_1.json", {
  "video_id": VID14, "is_recipe": True, "needs_review": False,
  "review_notes": "1 whole chicken used; total cook time approx. 30 min",
  "title": "Siamese Chicken Soup (Sup Ayam Siam)",
  "title_ms": "Sup Ayam Siam",
  "description": "A peppery, sour and spicy Thai-style chicken soup with coriander roots, dried chilli and a generous finish of fish sauce and lime.",
  "description_ms": "Sup ayam gaya Thai yang pedas, masam dan berempah dengan akar ketumbar, cili kering dan perahan limau serta sos ikan yang banyak.",
  "cuisine": "Fusion", "difficulty": "Easy", "prep_time": 10, "cook_time": 30, "servings": 4,
  "ingredients": ["chicken","shallot","garlic","coriander roots","dried chilli","salt","water","soup powder","tomato","bird's eye chilli","fish sauce","lime","coriander leaves"],
  "steps": [
    "Sauté 2 shallots and 5 garlic cloves briefly in a pot.",
    "Add 5 coriander roots and 5 dried chillies.",
    "Add 1 whole chicken; season with salt and cover with water.",
    "Add 3 tbsp Siamese chicken soup powder (1 packet); simmer until the chicken is tender and the broth has thickened, about 25–30 minutes.",
    "Add 1 tomato and generous bird's eye chilli.",
    "Remove from heat; stir in 3 tbsp fish sauce and juice of 1–2 limes.",
    "Garnish with fresh coriander leaves and serve."
  ],
  "steps_ms": [
    "Tumis 2 bawang merah dan 5 ulas bawang putih sebentar dalam periuk.",
    "Masukkan 5 akar ketumbar dan 5 biji cili kering.",
    "Masukkan 1 ekor ayam; tambah garam dan tutup dengan air.",
    "Masukkan 3 sudu serbuk sup Siam ayam (1 paket); reneh sehingga ayam empuk dan kuah pekat, lebih kurang 25-30 minit.",
    "Masukkan 1 biji tomato dan banyak cili padi.",
    "Padamkan api; masukkan 3 sudu sos ikan dan jus 1-2 biji limau nipis.",
    "Tabur daun ketumbar segar dan hidang."
  ],
  "tags": ["halal","chicken","soup","thai","sour","spicy","fusion","malaysian","ramadan"],
  "ingredients_detailed": [
    ing("chicken","ayam",1,None,"1 whole chicken"),
    ing("shallot","bawang merah",2,None,"per pot"),
    ing("garlic","bawang putih",5,"clove",""),
    ing("coriander roots","akar ketumbar",5,None,""),
    ing("dried chilli","cili kering",5,None,""),
    ing("salt","garam",None,None,"to taste"),
    ing("water","air",None,None,"enough to cover chicken"),
    ing("soup powder","perencah sup",1,None,"1 packet Siamese chicken flavour"),
    ing("tomato","tomato",1,None,""),
    ing("bird's eye chilli","cili padi",None,None,"generously"),
    ing("fish sauce","sos ikan",3,"tbsp","added off heat"),
    ing("lime","limau nipis",None,None,"1-2 limes; added off heat"),
    ing("coriander leaves","daun ketumbar",None,None,"garnish"),
  ]
}))

SPLITS.append((f"{VID14}_2.json", {
  "video_id": VID14, "is_recipe": True, "needs_review": True,
  "review_notes": "fish quantity not stated",
  "title": "Siamese Fish Soup (Sup Ikan Siam)",
  "title_ms": "Sup Ikan Siam",
  "description": "The fish version of Sup Ayam Siam — same tangy, spicy broth but made with fish and a fish-flavoured Siamese soup packet.",
  "description_ms": "Versi ikan bagi Sup Ayam Siam — kuah yang sama masam-pedas tetapi menggunakan ikan dan paket sup Siam rasa ikan.",
  "cuisine": "Fusion", "difficulty": "Easy", "prep_time": 10, "cook_time": 20, "servings": 4,
  "ingredients": ["red snapper","shallot","garlic","coriander roots","dried chilli","salt","water","soup powder","tomato","bird's eye chilli","fish sauce","lime","coriander leaves"],
  "steps": [
    "Sauté 2 shallots and 5 garlic cloves briefly.",
    "Add 5 coriander roots and 5 dried chillies.",
    "Add fish (red snapper or sea bass); season with salt and cover with water.",
    "Add 3 tbsp Siamese fish soup powder (look for the packet with a fish-head image); simmer until the fish is cooked through.",
    "Add 1 tomato and generous bird's eye chilli.",
    "Remove from heat; stir in 3 tbsp fish sauce and juice of 1–2 limes.",
    "Garnish with coriander leaves and serve."
  ],
  "steps_ms": [
    "Tumis 2 bawang merah dan 5 ulas bawang putih sebentar.",
    "Masukkan 5 akar ketumbar dan 5 biji cili kering.",
    "Masukkan ikan (siakap atau ikan merah); tambah garam dan tutup dengan air.",
    "Masukkan 3 sudu serbuk sup Siam rasa ikan (cari yang ada gambar kepala ikan); reneh sehingga ikan masak.",
    "Masukkan 1 biji tomato dan banyak cili padi.",
    "Padamkan api; masukkan 3 sudu sos ikan dan jus 1-2 biji limau nipis.",
    "Tabur daun ketumbar dan hidang."
  ],
  "tags": ["halal","fish","soup","thai","sour","spicy","fusion","malaysian","ramadan"],
  "ingredients_detailed": [
    ing("red snapper","ikan merah",None,None,"quantity not stated; or sea bass"),
    ing("shallot","bawang merah",2,None,""),
    ing("garlic","bawang putih",5,"clove",""),
    ing("coriander roots","akar ketumbar",5,None,""),
    ing("dried chilli","cili kering",5,None,""),
    ing("salt","garam",None,None,"to taste"),
    ing("water","air",None,None,"enough to cover fish"),
    ing("soup powder","perencah sup",1,None,"1 packet Siamese fish flavour"),
    ing("tomato","tomato",1,None,""),
    ing("bird's eye chilli","cili padi",None,None,"generously"),
    ing("fish sauce","sos ikan",3,"tbsp","added off heat"),
    ing("lime","limau nipis",None,None,"1-2 limes; added off heat"),
    ing("coriander leaves","daun ketumbar",None,None,"garnish"),
  ]
}))

# ══ V38 – 4 Drinks ═════════════════════════════════════════════════════════
VID38 = "7477057275442564359"

SPLITS.append((f"{VID38}_1.json", {
  "video_id": VID38, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities are by feel; serve 1 tall glass",
  "title": "Vanilla Sarsi Float",
  "title_ms": "Vanilla Sarsi Float",
  "description": "A creamy Malaysian-style cream soda float with vanilla ice cream, evaporated milk and a drop of vanilla essence.",
  "description_ms": "Float sarsi gaya Malaysia berkrim dengan aiskrim vanila, susu cair dan esen vanila.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 1,
  "ingredients": ["sarsi (cream soda)","vanilla ice cream","evaporated milk","vanilla essence","ice"],
  "steps": [
    "Fill a glass with ice.",
    "Add a few drops of vanilla essence and a splash of evaporated milk.",
    "Pour sarsi (cream soda) over the ice.",
    "Top with 1 scoop of vanilla ice cream and serve immediately."
  ],
  "steps_ms": [
    "Isi gelas dengan ais.",
    "Masukkan beberapa titik esen vanila dan sedikit susu cair.",
    "Tuang sarsi di atas ais.",
    "Letak 1 skop aiskrim vanila dan hidang dengan segera."
  ],
  "tags": ["halal","drink","cold","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("sarsi (cream soda)","sarsi",None,None,"any brand; fill glass"),
    ing("vanilla ice cream","aiskrim vanila",1,None,"1 scoop"),
    ing("evaporated milk","susu cair",None,None,"a splash"),
    ing("vanilla essence","esen vanila",None,None,"a few drops"),
    ing("ice","ais",None,None,"to fill glass"),
  ]
}))

SPLITS.append((f"{VID38}_2.json", {
  "video_id": VID38, "is_recipe": True, "needs_review": False,
  "review_notes": "amounts are to taste; quantities are by feel",
  "title": "Roselle Tea and Apple Soda (Teh Bunga Zapple)",
  "title_ms": "Teh Bunga Zapple",
  "description": "A refreshing layered iftar drink: chilled roselle tea topped with apple sparkling drink, lychee, lemon, lemongrass and preserved sour plum.",
  "description_ms": "Minuman berbuka berlapis yang menyegarkan: teh bunga ros sejuk ditambah air zapple, laici, lemon, serai dan asam boi.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 10, "cook_time": 0, "servings": 2,
  "ingredients": ["roselle tea","apple sparkling drink","lychee","lemon","lemongrass","preserved sour plum","mint","ice"],
  "steps": [
    "Brew dried roselle flowers in hot water; sweeten to taste and chill.",
    "In a glass, add ice, lychee pieces, a bruised lemongrass stalk, 1 preserved sour plum, lemon slices and mint leaves.",
    "Pour the chilled roselle tea over.",
    "Top with Zapple (apple sparkling drink); stir gently and serve."
  ],
  "steps_ms": [
    "Seduh bunga ros kering dalam air panas; manis secukup rasa dan sejukkan.",
    "Dalam gelas, masukkan ais, laici, 1 batang serai diketuk, 1 biji asam boi, hirisan lemon dan daun pudina.",
    "Tuang teh bunga ros sejuk di atas.",
    "Tambah Zapple (air epal berkarbonat); kacau perlahan dan hidang."
  ],
  "tags": ["halal","drink","cold","roselle","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("roselle tea","teh bunga ros",None,None,"brewed and chilled; sweeten to taste"),
    ing("apple sparkling drink","zapple",None,None,"any apple soda brand"),
    ing("lychee","laici",None,None,"canned or fresh"),
    ing("lemon","lemon",None,None,"sliced"),
    ing("lemongrass","serai",1,None,"bruised"),
    ing("preserved sour plum","asam boi",1,None,""),
    ing("mint","daun pudina",None,None,"a few leaves"),
    ing("ice","ais",None,None,"to fill glass"),
  ]
}))

SPLITS.append((f"{VID38}_3.json", {
  "video_id": VID38, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities are by feel; Vitagen = probiotic drink",
  "title": "Vitagen Longan Drink",
  "title_ms": "Vitagen Longan",
  "description": "A simple and refreshing iced drink: canned longan with syrup, diced watermelon and a probiotic Vitagen drink.",
  "description_ms": "Minuman ais yang mudah dan menyegarkan: longan tin bersama airnya, kiub tembikai dan minuman probiotik Vitagen.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 1,
  "ingredients": ["probiotic drink","longan","watermelon","ice"],
  "steps": [
    "Fill a glass with ice.",
    "Add canned longan with its syrup.",
    "Add diced watermelon.",
    "Pour in 1 bottle of Vitagen (or any probiotic/vitamin drink); stir and serve."
  ],
  "steps_ms": [
    "Isi gelas dengan ais.",
    "Masukkan longan tin bersama air longan.",
    "Masukkan kiub tembikai.",
    "Tuang 1 botol Vitagen (atau mana-mana minuman probiotik/vitamin); kacau dan hidang."
  ],
  "tags": ["halal","drink","cold","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("probiotic drink","vitagen",1,None,"1 bottle Vitagen or similar"),
    ing("longan","buah longan",1,"can","with syrup"),
    ing("watermelon","tembikai",None,None,"diced"),
    ing("ice","ais",None,None,"to fill glass"),
  ]
}))

SPLITS.append((f"{VID38}_4.json", {
  "video_id": VID38, "is_recipe": True, "needs_review": False,
  "review_notes": "coconut milk 2 small boxes and condensed milk 0.5 cup are stated; serves 2 tall glasses",
  "title": "Vietnamese Coconut Coffee (Kopi Santan Vietnam)",
  "title_ms": "Kopi Santan Vietnam",
  "description": "A viral creamy slushy drink: blended coconut milk slushy layered with strong instant coffee — a Vietnamese-inspired iftar favourite.",
  "description_ms": "Minuman slushy yang viral: slushy santan yang diblend dilapis dengan kopi segera yang pekat — kegemaran berbuka gaya Vietnam.",
  "cuisine": "Fusion", "difficulty": "Easy", "prep_time": 10, "cook_time": 0, "servings": 2,
  "ingredients": ["coconut milk","sweetened condensed milk","salt","ice","instant coffee","water"],
  "steps": [
    "Blend ice, 2 small boxes coconut milk, 0.5 cup sweetened condensed milk and a pinch of salt until a slushy forms.",
    "Dissolve 3 tsp instant coffee in 2 tbsp hot water; stir until dissolved and let cool slightly.",
    "Fill a tall glass with the coconut slushy.",
    "Pour the coffee liquid over the top; serve immediately — stir before drinking."
  ],
  "steps_ms": [
    "Blend ais, 2 kotak kecil santan, setengah cawan susu pekat manis dan secubit garam sehingga jadi slushy.",
    "Larutkan 3 sudu kecil kopi segera dalam 2 sudu besar air panas; kacau sehingga larut dan biarkan sedikit sejuk.",
    "Isi gelas tinggi dengan slushy santan.",
    "Tuang cecair kopi di atas; hidang dengan segera — kacau sebelum minum."
  ],
  "tags": ["halal","drink","coffee","cold","vietnamese","fusion","ramadan","iftar"],
  "ingredients_detailed": [
    ing("coconut milk","santan",2,None,"2 small boxes"),
    ing("sweetened condensed milk","krimer manis",0.5,"cup",""),
    ing("salt","garam",None,None,"a pinch"),
    ing("ice","ais",None,None,"generous amount for slushy"),
    ing("instant coffee","kopi segera",3,"tsp","dissolved in 2 tbsp hot water"),
    ing("water","air",2,"tbsp","hot; for dissolving coffee"),
  ]
}))

# ══ V42 – Sardine + Fried Rice ═════════════════════════════════════════════
VID42 = "7608088446246128914"

SPLITS.append((f"{VID42}_1.json", {
  "video_id": VID42, "is_recipe": True, "needs_review": False,
  "review_notes": "recipe for 1 can sardine; cook/prep times estimated; serves 3",
  "title": "Creamy Sardine in Coconut Milk (Sardin Bersantan)",
  "title_ms": "Sardin Bersantan",
  "description": "Canned sardine gently simmered in coconut milk with aromatics — a simple, comforting side dish for sahur or lunch.",
  "description_ms": "Sardin tin direneh perlahan dalam santan bersama rempah — lauk yang mudah dan menyelerakan untuk sahur atau makan tengah hari.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 10, "cook_time": 15, "servings": 3,
  "ingredients": ["canned sardine","cooking oil","shallot","garlic","ginger","lemongrass","tomato","coconut milk","salt","seasoning powder","sugar"],
  "steps": [
    "Sauté 1 shallot, 5 garlic cloves, a knob of ginger and 2 bruised lemongrass stalks until fragrant.",
    "Add 1 tomato (chopped); cook until softened.",
    "Add 1 can sardines with their sauce; stir gently to avoid breaking the fish.",
    "Pour in 0.5 small box coconut milk; season with salt, seasoning powder and a little sugar.",
    "Simmer until the gravy thickens. Do not over-stir. Serve with rice."
  ],
  "steps_ms": [
    "Tumis 1 bawang merah, 5 ulas bawang putih, seketul halia dan 2 batang serai diketuk sehingga wangi.",
    "Masukkan 1 biji tomato (dicincang); masak sehingga lembut.",
    "Masukkan 1 tin sardin bersama sosnya; gaul perlahan supaya ikan tidak hancur.",
    "Tuang setengah kotak kecil santan; tambah garam, serbuk perasa dan sedikit gula.",
    "Reneh sehingga kuah pekat. Jangan kacau terlalu kerap. Hidang bersama nasi."
  ],
  "tags": ["halal","fish","sardine","coconut milk","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("canned sardine","sardin tin",1,"can","with sauce; stir gently"),
    ing("cooking oil","minyak goreng",None,None,"for sautéing"),
    ing("shallot","bawang merah",1,None,""),
    ing("garlic","bawang putih",5,"clove",""),
    ing("ginger","halia",None,None,"1 knob"),
    ing("lemongrass","serai",2,None,"bruised"),
    ing("tomato","tomato",1,None,"chopped"),
    ing("coconut milk","santan",0.5,None,"0.5 small box"),
    ing("salt","garam",None,None,"to taste"),
    ing("seasoning powder","serbuk perasa",None,None,"to taste"),
    ing("sugar","gula",None,None,"a little"),
  ]
}))

SPLITS.append((f"{VID42}_2.json", {
  "video_id": VID42, "is_recipe": True, "needs_review": True,
  "review_notes": "cooked rice quantity not stated; day-old rice preferred",
  "title": "Coconut Oil Fried Rice with Dried Chilli (Nasi Goreng Cili Kering)",
  "title_ms": "Nasi Goreng Cili Kering",
  "description": "Smoky, fragrant fried rice cooked in coconut oil with a blended dried chilli paste — a distinctive and aromatic alternative to regular fried rice.",
  "description_ms": "Nasi goreng yang berasap dan wangi dimasak dalam minyak kelapa dengan pes cili kering — alternatif yang berbeza dan aromatik daripada nasi goreng biasa.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 10, "cook_time": 10, "servings": 2,
  "ingredients": ["cooked white rice","dried chilli","shallot","garlic","coconut oil","soy sauce","oyster sauce","egg","spring onion"],
  "steps": [
    "Soak 10 dried chillies in hot water for 10 minutes; blend with 1 shallot and 5 garlic cloves until smooth.",
    "Heat 2 tbsp coconut oil in a wok; fry the paste until fragrant and the oil separates.",
    "Add cooked rice; toss well to combine with the paste.",
    "Season with soy sauce and oyster sauce to taste.",
    "Push rice to the side; crack in 2 eggs and scramble, then fold into the rice.",
    "Garnish with spring onion and serve."
  ],
  "steps_ms": [
    "Rendam 10 biji cili kering dalam air panas 10 minit; blend bersama 1 bawang merah dan 5 ulas bawang putih sehingga lumat.",
    "Panaskan 2 sudu minyak kelapa dalam kuali; goreng pes sehingga wangi dan pecah minyak.",
    "Masukkan nasi masak; gaul rata bersama pes.",
    "Tambah kicap dan sos tiram secukup rasa.",
    "Tolak nasi ke tepi; pecahkan 2 biji telur dan scramble, kemudian gaul bersama nasi.",
    "Hiaskan dengan daun bawang dan hidang."
  ],
  "tags": ["halal","fried rice","coconut oil","spicy","malaysian","ramadan","sahur"],
  "ingredients_detailed": [
    ing("cooked white rice","nasi putih",None,None,"day-old rice preferred; quantity not stated"),
    ing("dried chilli","cili kering",10,None,"soaked and blended"),
    ing("shallot","bawang merah",1,None,"blended with chilli"),
    ing("garlic","bawang putih",5,"clove","blended with chilli"),
    ing("coconut oil","minyak kelapa",2,"tbsp","gives distinctive flavour"),
    ing("soy sauce","kicap",None,None,"to taste"),
    ing("oyster sauce","sos tiram",None,None,"to taste"),
    ing("egg","telur",2,None,"scrambled in"),
    ing("spring onion","daun bawang",None,None,"garnish"),
  ]
}))

# ══ V58 – Roselle Jelly + Strawberry Mocktail ══════════════════════════════
VID58 = "7481511745421315336"

SPLITS.append((f"{VID58}_1.json", {
  "video_id": VID58, "is_recipe": True, "needs_review": True,
  "review_notes": "roselle syrup quantity not stated; evaporated milk and sweetened condensed milk quantities not stated",
  "title": "Roselle Lychee Jelly (Jeli Ros Laici)",
  "title_ms": "Jeli Ros Laici",
  "description": "A wobbly roselle-flavoured jelly mixed with canned lychee and served cold in a creamy evaporated milk sauce.",
  "description_ms": "Jeli bunga ros yang gebu-gebu dicampur laici tin dan dihidang sejuk dalam sos susu cair yang berkrim.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 10, "cook_time": 10, "servings": 4,
  "ingredients": ["jelly powder","roselle syrup","water","lychee","evaporated milk","sweetened condensed milk"],
  "steps": [
    "Mix 1 packet jelly powder with water per packet instructions; add roselle syrup for colour and flavour.",
    "Bring to a boil stirring until fully dissolved; pour into moulds and set for 2 hours at room temperature.",
    "Once set, cut into cubes.",
    "Mix evaporated milk and sweetened condensed milk in a bowl; stir in canned lychee with its syrup.",
    "Add jelly cubes; chill in the fridge and serve cold."
  ],
  "steps_ms": [
    "Gaul 1 paket serbuk jeli dengan air ikut arahan pakej; masukkan sirap ros untuk warna dan rasa.",
    "Didihkan sambil kacau sehingga larut sepenuhnya; tuang ke dalam acuan dan biarkan set 2 jam di suhu bilik.",
    "Bila dah set, potong jadi kiub.",
    "Gaul susu cair dan susu pekat manis dalam mangkuk; masukkan laici tin bersama airnya.",
    "Masukkan kiub jeli; sejukkan dalam peti dan hidang dingin."
  ],
  "tags": ["halal","dessert","jelly","roselle","lychee","cold","malaysian","ramadan","iftar"],
  "ingredients_detailed": [
    ing("jelly powder","serbuk jeli",1,None,"1 packet"),
    ing("roselle syrup","sirap ros",None,None,"quantity not stated; for colour and flavour"),
    ing("water","air",None,None,"per packet instructions"),
    ing("lychee","laici",1,"can","with syrup"),
    ing("evaporated milk","susu cair",None,None,"quantity not stated"),
    ing("sweetened condensed milk","krimer manis",None,None,"quantity not stated"),
  ]
}))

SPLITS.append((f"{VID58}_2.json", {
  "video_id": VID58, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities all flexible/to taste; simple assembly drink",
  "title": "Strawberry Mint Mocktail",
  "title_ms": "Strawberry Cocktail",
  "description": "A quick, fresh strawberry and mint mocktail — muddled with lime and honey, topped with ice and sparkling water.",
  "description_ms": "Mocktail strawberi dan pudina yang segar — dikisar dengan limau dan madu, ditambah ais dan air berkarbonat.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 1,
  "ingredients": ["strawberry","mint","lime","honey","ice","sparkling water"],
  "steps": [
    "Muddle fresh strawberries and mint leaves in a glass until bruised and fragrant.",
    "Add a squeeze of lime juice and a drizzle of honey.",
    "Fill with ice; top with sparkling water (or plain water).",
    "Stir and serve."
  ],
  "steps_ms": [
    "Giling strawberi segar dan daun pudina dalam gelas sehingga hancur dan wangi.",
    "Perah jus limau dan titiskan madu.",
    "Isi dengan ais; tuang air berkarbonat (atau air biasa).",
    "Kacau dan hidang."
  ],
  "tags": ["halal","drink","mocktail","strawberry","cold","malaysian","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("strawberry","strawberi",None,None,"fresh; a few per glass"),
    ing("mint","daun pudina",None,None,"a few leaves"),
    ing("lime","limau nipis",None,None,"squeezed to taste"),
    ing("honey","madu",None,None,"a drizzle"),
    ing("ice","ais",None,None,"to fill glass"),
    ing("sparkling water","air berkarbonat",None,None,"or plain water"),
  ]
}))

# ══ V59 – 5 Drinks ═════════════════════════════════════════════════════════
VID59 = "7608279986633510162"

SPLITS.append((f"{VID59}_1.json", {
  "video_id": VID59, "is_recipe": True, "needs_review": False,
  "review_notes": "all quantities to taste; simple assembly",
  "title": "Pink Lemonade",
  "title_ms": "Pink Lemonade",
  "description": "A classic sweet-sour pink lemonade coloured with a drop of food colouring — quick to make and refreshing for iftar.",
  "description_ms": "Pink lemonade masam-manis klasik yang diwarnai dengan sedikit pewarna merah — cepat dibuat dan menyegarkan untuk berbuka.",
  "cuisine": "Western", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 2,
  "ingredients": ["lemon","sugar syrup","water","red food colouring","ice"],
  "steps": [
    "Squeeze fresh lemon juice into a pitcher.",
    "Add sugar syrup to taste and fill with cold water; stir.",
    "Add a few drops of red food colouring for the pink colour.",
    "Serve over ice."
  ],
  "steps_ms": [
    "Perah jus lemon segar ke dalam jag.",
    "Masukkan air gula secukup rasa dan isi dengan air sejuk; kacau.",
    "Masukkan beberapa titik pewarna merah untuk warna pink.",
    "Hidang atas ais."
  ],
  "tags": ["halal","drink","cold","lemonade","western","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("lemon","lemon",None,None,"squeezed fresh"),
    ing("sugar syrup","air gula",None,None,"to taste; or dissolve sugar in a little hot water"),
    ing("water","air",None,None,"cold"),
    ing("red food colouring","pewarna merah",None,None,"a few drops"),
    ing("ice","ais",None,None,""),
  ]
}))

SPLITS.append((f"{VID59}_2.json", {
  "video_id": VID59, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities flexible; 1 ripe avocado per 2 glasses",
  "title": "Avocado Milkshake",
  "title_ms": "Avocado Milkshake",
  "description": "A smooth and creamy avocado milkshake blended with fresh milk and sweetened condensed milk — popular at Malaysian iftar stalls.",
  "description_ms": "Milkshake avokado yang licin dan berkrim diblend dengan susu segar dan susu pekat manis — popular di gerai berbuka Malaysia.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 2,
  "ingredients": ["avocado","fresh milk","sweetened condensed milk","ice"],
  "steps": [
    "Scoop 1 ripe avocado into a blender.",
    "Add fresh milk, sweetened condensed milk to taste and a handful of ice.",
    "Blend until smooth and creamy; pour and serve immediately."
  ],
  "steps_ms": [
    "Masukkan isi 1 biji avokado masak ke dalam blender.",
    "Masukkan susu segar, susu pekat manis secukup rasa dan segenggam ais.",
    "Blend sehingga licin dan berkrim; tuang dan hidang dengan segera."
  ],
  "tags": ["halal","drink","milkshake","cold","avocado","malaysian","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("avocado","avokado",1,None,"ripe"),
    ing("fresh milk","fresh milk",None,None,""),
    ing("sweetened condensed milk","krimer manis",None,None,"to taste"),
    ing("ice","ais",None,None,"handful"),
  ]
}))

SPLITS.append((f"{VID59}_3.json", {
  "video_id": VID59, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities to taste; serve 1 tall glass",
  "title": "Sirap Bandung Fizz",
  "title_ms": "Sirap Bandung Fizz",
  "description": "A fizzy take on the classic Malaysian Sirap Bandung — rose syrup and evaporated milk topped with sparkling water.",
  "description_ms": "Versi berkarbonat Sirap Bandung Malaysia — sirap ros dan susu cair ditambah air berkarbonat.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 3, "cook_time": 0, "servings": 1,
  "ingredients": ["roselle syrup","evaporated milk","sparkling water","ice"],
  "steps": [
    "Fill a glass with ice.",
    "Add a generous pour of rose/roselle syrup.",
    "Add evaporated milk; stir briefly.",
    "Top with sparkling water and serve."
  ],
  "steps_ms": [
    "Isi gelas dengan ais.",
    "Masukkan sirap ros secara banyak.",
    "Masukkan susu cair; kacau sebentar.",
    "Tambah air berkarbonat dan hidang."
  ],
  "tags": ["halal","drink","cold","bandung","malaysian","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("roselle syrup","sirap ros",None,None,"generous pour; any rose/roselle syrup"),
    ing("evaporated milk","susu cair",None,None,"to taste"),
    ing("sparkling water","air berkarbonat",None,None,"to top up"),
    ing("ice","ais",None,None,"to fill glass"),
  ]
}))

SPLITS.append((f"{VID59}_4.json", {
  "video_id": VID59, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities flexible; 1 mango per 2 glasses",
  "title": "Mango Lassi",
  "title_ms": "Mango Lassi",
  "description": "A classic Indian-style mango lassi blended with yogurt, milk and honey — light, tangy and perfect for iftar.",
  "description_ms": "Mango lassi gaya India klasik yang diblend dengan yogurt, susu dan madu — ringan, masam-manis dan sempurna untuk berbuka.",
  "cuisine": "Indian", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 2,
  "ingredients": ["mango","plain yogurt","fresh milk","honey","ice"],
  "steps": [
    "Blend mango flesh (from 1 ripe mango), plain yogurt, fresh milk, honey to taste and ice until smooth.",
    "Pour into glasses and serve cold."
  ],
  "steps_ms": [
    "Blend isi mangga (dari 1 biji mangga masak), yogurt original, susu segar, madu secukup rasa dan ais sehingga licin.",
    "Tuang ke dalam gelas dan hidang dingin."
  ],
  "tags": ["halal","drink","cold","mango","lassi","indian","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("mango","mangga",1,None,"ripe"),
    ing("plain yogurt","yogurt original",None,None,""),
    ing("fresh milk","fresh milk",None,None,""),
    ing("honey","madu",None,None,"to taste"),
    ing("ice","ais",None,None,""),
  ]
}))

SPLITS.append((f"{VID59}_5.json", {
  "video_id": VID59, "is_recipe": True, "needs_review": False,
  "review_notes": "quantities flexible; use red dragon fruit for bright pink colour",
  "title": "Dragon Fruit Slushie",
  "title_ms": "Dragon Fruit Slushie",
  "description": "A vibrant pink dragon fruit slushy blended with ice, honey and a squeeze of lime — naturally coloured and refreshing.",
  "description_ms": "Slushy buah naga merah jambu yang cantik diblend dengan ais, madu dan perahan limau — warna semulajadi dan menyegarkan.",
  "cuisine": "Malaysian", "difficulty": "Easy", "prep_time": 5, "cook_time": 0, "servings": 2,
  "ingredients": ["dragon fruit","ice","honey","lime"],
  "steps": [
    "Blend dragon fruit flesh with a generous amount of ice, honey to taste and a squeeze of lime until a slushy forms.",
    "Pour into glasses and serve immediately."
  ],
  "steps_ms": [
    "Blend isi buah naga dengan banyak ais, madu secukup rasa dan perahan limau sehingga jadi slushy.",
    "Tuang ke dalam gelas dan hidang dengan segera."
  ],
  "tags": ["halal","drink","cold","dragon fruit","slushy","malaysian","ramadan","iftar","easy"],
  "ingredients_detailed": [
    ing("dragon fruit","buah naga",1,None,"red variety for pink colour"),
    ing("ice","ais",None,None,"generous amount"),
    ing("honey","madu",None,None,"to taste"),
    ing("lime","limau nipis",None,None,"a squeeze"),
  ]
}))

# ── Write all split files ────────────────────────────────────────────────
for fname, recipe in SPLITS:
    path = os.path.join(RDIR, fname)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(recipe, f, ensure_ascii=False, indent=2)

print(f"B. Created {len(SPLITS)} split recipe files.")

# ── Delete originals ─────────────────────────────────────────────────────
ORIG = [f"{v}.json" for v in [VID8, VID14, VID38, VID42, VID58, VID59]]
for fn in ORIG:
    p = os.path.join(RDIR, fn)
    if os.path.exists(p):
        os.remove(p)

print(f"C. Deleted {len(ORIG)} original compilation files.")

# ─────────────────────────────────────────────────────────────────────────────
# D. GLOBAL FIX PASS
# ─────────────────────────────────────────────────────────────────────────────
NAME_REMAP = {
    ("onion",                   "bawang merah"):  "shallot",
    ("small red shallot",       "bawang ros"):    "shallot",
    ("sweet onion",             "bawang holland"): "onion",
    ("evaporated milk (liquid)","susu cair"):     "evaporated milk",
    ("large chilli",            "lada besar"):    "large red chilli",
}

CUISINE_MAP = {
    "Malaysian-fusion":  "Fusion",
    "Western-inspired":  "Fusion",
    "Indonesian/Padang": "Indonesian",
    "Malaysian/Thai":    "Fusion",
    "Chinese-Malaysian": "Chinese",
    "Thai-inspired":     "Fusion",
    "Western-fusion":    "Fusion",
    "Malaysian-Indian":  "Fusion",
}

fixed = []
for fp in sorted(glob.glob(os.path.join(RDIR, "*.json"))):
    with open(fp, encoding="utf-8") as f:
        r = json.load(f)
    changed = False

    # Fix ingredients_detailed names
    for ingr in r.get("ingredients_detailed", []):
        key = (ingr.get("name",""), ingr.get("name_ms",""))
        if key in NAME_REMAP:
            ingr["name"] = NAME_REMAP[key]
            changed = True

    # Regenerate ingredients[] from ingredients_detailed (deduplicated, ordered)
    if r.get("ingredients_detailed"):
        seen, new_list = set(), []
        for ingr in r["ingredients_detailed"]:
            n = ingr["name"]
            if n not in seen:
                seen.add(n)
                new_list.append(n)
        if r.get("ingredients") != new_list:
            r["ingredients"] = new_list
            changed = True

    # Fix cuisine
    c = r.get("cuisine", "")
    if c in CUISINE_MAP:
        r["cuisine"] = CUISINE_MAP[c]
        changed = True

    if changed:
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(r, f, ensure_ascii=False, indent=2)
        fixed.append(os.path.basename(fp))

print(f"D. Applied global fixes to {len(fixed)} files: {', '.join(fixed[:5])}{'...' if len(fixed)>5 else ''}")

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
all_files = sorted(glob.glob(os.path.join(RDIR, "*.json")))
print(f"\nTotal recipe files now: {len(all_files)}")
