#!/usr/bin/env python3
"""Generate recipe JSONs for videos V41-V59."""
import json, os
BASE = os.path.dirname(__file__)
OUT  = os.path.join(BASE, "recipes")
os.makedirs(OUT, exist_ok=True)

RECIPES = [

# ── V41 ─────────────────────────────────────────────────────────────────────
{"video_id":"7609170882749041928","is_recipe":True,"needs_review":True,
"review_notes":"chicken quantity not stated; peri peri sauce (bottled) amount flexible",
"title":"Peri Peri Chicken",
"title_ms":"Ayam Peri Peri",
"description":"Tender chicken thighs marinated overnight in homemade peri peri sauce — grilled or baked, then basted and finished on a griddle for a charred finish.",
"description_ms":"Peha ayam yang diperap semalaman dalam sos peri peri buatan sendiri — dibakar atau dipanggang, kemudian digrid untuk kesan hangus yang wangi.",
"cuisine":"Western-inspired","difficulty":"Easy","prep_time":720,"cook_time":40,"servings":4,
"ingredients":["chicken","bird's eye chilli","large red chilli","garlic","lemon","cooking oil","paprika powder","oregano","salt","black pepper","butter","peri peri sauce"],
"steps":[
  "Blend 5 bird's eye chillies, 3 large red chillies, 6 garlic cloves, juice of 1 lemon, 3 tbsp cooking oil, 1 tbsp paprika powder, 1 tsp oregano, 1 tsp salt and black pepper until smooth.",
  "Score the chicken thighs (skin-on) deeply; coat thoroughly with the marinade.",
  "Marinate overnight in the fridge for best results.",
  "Bake at 200°C for 30 minutes until cooked through.",
  "For the basting sauce: melt 2 tbsp butter; add 3 tbsp bottled peri peri sauce (Nando's or any brand) and a squeeze of lemon.",
  "Sear the baked chicken on a hot griddle pan; baste with the butter-peri peri mix until lightly charred on both sides.",
  "Serve with rice or sides of choice."
],
"steps_ms":[
  "Blend 5 biji cili padi, 3 biji lada besar merah, 6 ulas bawang putih, jus 1 biji lemon, 3 sudu minyak goreng, 1 sudu serbuk paprika, 1 sudu kecil oregano, 1 sudu kecil garam dan black pepper sehingga lumat.",
  "Calit ayam (dengan kulit) secara dalam; salut dengan pes marinad secara menyeluruh.",
  "Perap semalaman dalam peti sejuk untuk hasil terbaik.",
  "Bakar pada suhu 200°C selama 30 minit sehingga masak.",
  "Untuk sos sapuan: cairkan 2 sudu butter; masukkan 3 sudu sos peri peri dari botol (Nando's atau mana-mana jenama) dan perahan lemon.",
  "Masak ayam yang telah dibakar dalam kuali griddle panas; sapu dengan campuran butter-peri peri sehingga sedikit hangus di kedua-dua belah.",
  "Hidang dengan nasi atau ulam pilihan."
],
"tags":["halal","chicken","grilled","peri peri","western","raya","easy"],
"ingredients_detailed":[
  {"name":"chicken",          "name_ms":"ayam",          "quantity":None,"unit":None,   "note":"thigh pieces, skin-on; quantity not stated"},
  {"name":"bird's eye chilli","name_ms":"cili padi",     "quantity":5,   "unit":None,   "note":"for marinade"},
  {"name":"large red chilli", "name_ms":"cili besar",    "quantity":3,   "unit":None,   "note":"for marinade"},
  {"name":"garlic",           "name_ms":"bawang putih",  "quantity":6,   "unit":"clove","note":"for marinade"},
  {"name":"lemon",            "name_ms":"lemon",         "quantity":1,   "unit":None,   "note":"juiced; more for basting sauce"},
  {"name":"cooking oil",      "name_ms":"minyak goreng", "quantity":3,   "unit":"tbsp", "note":"for marinade"},
  {"name":"paprika powder",   "name_ms":"serbuk paprika","quantity":1,   "unit":"tbsp", "note":"for marinade"},
  {"name":"oregano",          "name_ms":"oregano",       "quantity":1,   "unit":"tsp",  "note":"for marinade"},
  {"name":"salt",             "name_ms":"garam",         "quantity":1,   "unit":"tsp",  "note":"for marinade"},
  {"name":"black pepper",     "name_ms":"black pepper",  "quantity":None,"unit":None,   "note":"to taste; for marinade"},
  {"name":"butter",           "name_ms":"butter",        "quantity":2,   "unit":"tbsp", "note":"for basting sauce"},
  {"name":"peri peri sauce",  "name_ms":"sos peri peri", "quantity":3,   "unit":"tbsp", "note":"bottled; any brand; for basting sauce"}
]},

# ── V42 ─────────────────────────────────────────────────────────────────────
{"video_id":"7608088446246128914","is_recipe":True,"needs_review":True,
"review_notes":"2-dish compilation (sardine coconut milk + coconut oil fried rice); sardine and rice quantities not stated",
"title":"Creamy Sardine in Coconut Milk and Coconut Oil Fried Rice (2-Dish Compilation)",
"title_ms":"Sardin Bersantan dan Nasi Goreng Cili Kering",
"description":"Two complementary dishes for a simple weeknight set meal: creamy sardine in coconut milk and a smoky, fragrant dried chilli fried rice cooked in coconut oil.",
"description_ms":"Dua hidangan pelengkap untuk set makan sederhana: sardin bersantan dan nasi goreng cili kering yang wangi dimasak dalam minyak kelapa.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":15,"cook_time":20,"servings":3,
"ingredients":["canned sardine","onion","garlic","ginger","lemongrass","tomato","coconut milk","salt","seasoning powder","sugar","cooking oil","cooked white rice","dried chilli","coconut oil","soy sauce","oyster sauce","egg","spring onion"],
"steps":[
  "[Sardin Bersantan] Sauté 1 onion, 5 garlic cloves, a knob of ginger and 2 bruised lemongrass stalks until fragrant.",
  "Add 1 tomato (chopped); cook until softened.",
  "Add 1 can sardines (with sauce); stir gently to avoid breaking the fish.",
  "Pour in 0.5 small box coconut milk; season with salt, seasoning powder and a little sugar.",
  "Simmer until the gravy thickens. Do not over-stir.",
  "[Nasi Goreng Cili Kering] Soak 10 dried chillies in hot water; blend with 1 onion and 5 garlic cloves.",
  "Fry the paste in 2 tbsp coconut oil until fragrant and the oil separates.",
  "Add cooked rice; toss well. Season with soy sauce and oyster sauce.",
  "Push rice to the side; scramble 2 eggs and fold into the rice.",
  "Garnish with spring onion and serve."
],
"steps_ms":[
  "[Sardin Bersantan] Tumis 1 bawang, 5 ulas bawang putih, seketul halia dan 2 batang serai diketuk sehingga wangi.",
  "Masukkan 1 biji tomato (dicincang); masak sehingga lembut.",
  "Masukkan 1 tin sardin (bersama sos); gaul perlahan supaya ikan tidak hancur.",
  "Tuang setengah kotak kecil santan; tambah garam, serbuk perasa dan sedikit gula.",
  "Reneh sehingga kuah pekat. Jangan kacau terlalu kerap.",
  "[Nasi Goreng Cili Kering] Rendam 10 biji cili kering dalam air panas; blend bersama 1 bawang dan 5 ulas bawang putih.",
  "Goreng pes dalam 2 sudu minyak kelapa sehingga wangi dan pecah minyak.",
  "Masukkan nasi masak; gaul rata. Tambah kicap dan sos tiram.",
  "Tolak nasi ke tepi; scramble 2 telur dan gaul bersama nasi.",
  "Hiaskan dengan daun bawang dan hidang."
],
"tags":["halal","fish","sardine","coconut milk","fried rice","malaysian","ramadan","sahur"],
"ingredients_detailed":[
  {"name":"canned sardine",  "name_ms":"sardin tin",    "quantity":1,   "unit":"can",  "note":"with sauce; quantity not stated if more than 1 can"},
  {"name":"onion",           "name_ms":"bawang merah",  "quantity":2,   "unit":None,   "note":"1 for sardin; 1 blended for fried rice"},
  {"name":"garlic",          "name_ms":"bawang putih",  "quantity":10,  "unit":"clove","note":"5 for sardin; 5 blended for fried rice"},
  {"name":"ginger",          "name_ms":"halia",         "quantity":None,"unit":None,   "note":"1 knob; for sardin"},
  {"name":"lemongrass",      "name_ms":"serai",         "quantity":2,   "unit":None,   "note":"bruised; for sardin"},
  {"name":"tomato",          "name_ms":"tomato",        "quantity":1,   "unit":None,   "note":"for sardin"},
  {"name":"coconut milk",    "name_ms":"santan",        "quantity":0.5, "unit":None,   "note":"0.5 small box; for sardin"},
  {"name":"salt",            "name_ms":"garam",         "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"seasoning powder","name_ms":"serbuk perasa", "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"sugar",           "name_ms":"gula",          "quantity":None,"unit":None,   "note":"a little; for sardin"},
  {"name":"cooking oil",     "name_ms":"minyak goreng", "quantity":None,"unit":None,   "note":"for sautéing sardin ingredients"},
  {"name":"cooked white rice","name_ms":"nasi putih",   "quantity":None,"unit":None,   "note":"day-old rice preferred; quantity not stated"},
  {"name":"dried chilli",    "name_ms":"cili kering",   "quantity":10,  "unit":None,   "note":"soaked and blended; for fried rice"},
  {"name":"coconut oil",     "name_ms":"minyak kelapa", "quantity":2,   "unit":"tbsp", "note":"for frying fried rice; gives distinct flavour"},
  {"name":"soy sauce",       "name_ms":"kicap",         "quantity":None,"unit":None,   "note":"to taste; for fried rice"},
  {"name":"oyster sauce",    "name_ms":"sos tiram",     "quantity":None,"unit":None,   "note":"to taste; for fried rice"},
  {"name":"egg",             "name_ms":"telur",         "quantity":2,   "unit":None,   "note":"for fried rice"},
  {"name":"spring onion",    "name_ms":"daun bawang",   "quantity":None,"unit":None,   "note":"garnish"}
]},

# ── V43 ─────────────────────────────────────────────────────────────────────
{"video_id":"7524576884361891079","is_recipe":True,"needs_review":True,
"review_notes":"non-dairy cream quantity not stated; durian filling amount flexible; recipe is for crepes with durian cream filling",
"title":"Durian Crepe",
"title_ms":"Durian Crepe",
"description":"Thin pandan crepe wrappers filled with a light, fluffy durian whipped cream — a popular Malaysian dessert.",
"description_ms":"Kulit crepe pandan yang nipis diisi dengan krim durian yang ringan dan gebu — pencuci mulut Malaysia yang popular.",
"cuisine":"Malaysian","difficulty":"Medium","prep_time":60,"cook_time":20,"servings":10,
"ingredients":["egg","sugar","salt","all-purpose flour","fresh milk","butter","pandan extract","non-dairy whipping cream","durian flesh"],
"steps":[
  "Beat 4 eggs with 3 tbsp sugar and a pinch of salt.",
  "Gradually add 2 cup all-purpose flour, alternating with 2.5 cup fresh milk, whisking until smooth.",
  "Stir in 3 tbsp melted butter and a few drops of pandan extract for colour.",
  "Strain the batter; rest for 30 minutes.",
  "Cook thin crepes in a non-stick pan — pour a small ladle of batter, swirl to spread, cook until just set (no browning).",
  "Stack and cool completely.",
  "Whisk non-dairy cream until stiff peaks; fold in durian flesh until combined.",
  "Place a spoonful of durian cream in the centre of each crepe; fold or roll to enclose.",
  "Refrigerate for at least 1 hour before serving."
],
"steps_ms":[
  "Pukul 4 biji telur bersama 3 sudu gula dan secubit garam.",
  "Masukkan 2 cawan tepung gandum secara berselang-seli dengan 2 cawan setengah susu segar, kacau sehingga licin.",
  "Masukkan 3 sudu butter cair dan beberapa titik pewarna/ekstrak pandan.",
  "Tapis adunan; rehat 30 minit.",
  "Masak crepe nipis dalam kuali non-stick — tuang sedikit adunan, pusingkan supaya rata, masak sehingga set (jangan perang).",
  "Susun dan biarkan sejuk sepenuhnya.",
  "Pukul non-dairy cream sehingga kaku; lipat bersama isi durian sehingga sebati.",
  "Letakkan sesenduk krim durian di tengah-tengah setiap crepe; lipat atau gulung.",
  "Simpan dalam peti sejuk sekurang-kurangnya 1 jam sebelum dihidang."
],
"tags":["halal","dessert","crepe","durian","pandan","malaysian","raya"],
"ingredients_detailed":[
  {"name":"egg",               "name_ms":"telur",          "quantity":4,   "unit":None,  "note":"for crepe batter"},
  {"name":"sugar",             "name_ms":"gula",           "quantity":3,   "unit":"tbsp","note":"for crepe batter"},
  {"name":"salt",              "name_ms":"garam",          "quantity":None,"unit":None,  "note":"a pinch"},
  {"name":"all-purpose flour", "name_ms":"tepung gandum",  "quantity":2,   "unit":"cup", "note":"for crepe batter"},
  {"name":"fresh milk",        "name_ms":"fresh milk",     "quantity":2.5, "unit":"cup", "note":"for crepe batter"},
  {"name":"butter",            "name_ms":"butter",         "quantity":3,   "unit":"tbsp","note":"melted; for crepe batter"},
  {"name":"pandan extract",    "name_ms":"ekstrak pandan", "quantity":None,"unit":None,  "note":"a few drops for colour; or pandan paste"},
  {"name":"non-dairy whipping cream","name_ms":"non-dairy cream","quantity":None,"unit":None,"note":"quantity not stated; whipped to stiff peaks"},
  {"name":"durian flesh",      "name_ms":"durian",         "quantity":None,"unit":None,  "note":"quantity flexible to taste"}
]},

# ── V44 ─────────────────────────────────────────────────────────────────────
{"video_id":"7480080996398828807","is_recipe":True,"needs_review":False,
"review_notes":"recipe for 1 block tempeh and 1 block tofu; sambal kicap is served on the side; prep/cook times estimated",
"title":"Crispy Tempeh and Tofu with Sambal Kicap",
"title_ms":"Tempe Goreng Crispy dan Tauhu dengan Sambal Kicap",
"description":"Golden crispy fried tempeh slices and tofu served with a fresh blended sweet soy and chilli dipping sauce.",
"description_ms":"Hirisan tempe dan tauhu yang digoreng garing dan golden dihidang bersama sambal kicap manis-pedas.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":10,"cook_time":15,"servings":3,
"ingredients":["tempeh","tofu","cooking oil","sweet soy sauce","bird's eye chilli","garlic","calamansi lime"],
"steps":[
  "Slice 1 block tempeh thinly; cut 1 block firm tofu into cubes.",
  "Deep-fry both in hot oil until golden and crispy on all sides. Drain.",
  "[Sambal kicap] Blend sweet soy sauce, 5 bird's eye chillies and 3 garlic cloves until smooth.",
  "Squeeze in juice of 3 calamansi limes.",
  "Serve the fried tempeh and tofu with sambal kicap on the side."
],
"steps_ms":[
  "Potong 1 blok tempe nipis-nipis; potong 1 blok tauhu keras menjadi kiub.",
  "Goreng kedua-duanya dalam minyak panas sehingga golden crispy semua sisi. Toskan.",
  "[Sambal kicap] Blend kicap manis, 5 biji cili padi dan 3 ulas bawang putih sehingga lumat.",
  "Perah jus 3 biji limau kasturi.",
  "Hidang tempe dan tauhu goreng bersama sambal kicap."
],
"tags":["halal","vegetarian","tempeh","tofu","sambal","malaysian","ramadan"],
"ingredients_detailed":[
  {"name":"tempeh",        "name_ms":"tempe",        "quantity":1,   "unit":None,   "note":"1 block; sliced thin"},
  {"name":"tofu",          "name_ms":"tauhu",        "quantity":1,   "unit":None,   "note":"1 block firm tofu; cubed"},
  {"name":"cooking oil",   "name_ms":"minyak goreng","quantity":None,"unit":None,   "note":"for deep frying"},
  {"name":"sweet soy sauce","name_ms":"kicap manis", "quantity":None,"unit":None,   "note":"for sambal kicap; amount to taste"},
  {"name":"bird's eye chilli","name_ms":"cili padi", "quantity":5,   "unit":None,   "note":"blended into sambal kicap"},
  {"name":"garlic",        "name_ms":"bawang putih", "quantity":3,   "unit":"clove","note":"blended into sambal kicap"},
  {"name":"calamansi lime","name_ms":"limau kasturi","quantity":3,   "unit":None,   "note":"juiced into sambal kicap"}
]},

# ── V45 ─────────────────────────────────────────────────────────────────────
{"video_id":"7610678008025976071","is_recipe":True,"needs_review":False,
"review_notes":"fry 2-3 min at high heat; makes approx 20-25 balls; prep includes 1 hr rest",
"title":"Fried Doughnut Balls (Cekodok Donat)",
"title_ms":"Bebola Donat Goreng (Cekodok Donat)",
"description":"Soft, fluffy yeast-risen doughnut balls rolled in sugar — crispy outside, airy inside.",
"description_ms":"Bebola donat yang lembut dan gebu menggunakan yis — garing kat luar, gebu kat dalam, digulingkan dalam gula.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":80,"cook_time":15,"servings":20,
"ingredients":["all-purpose flour","sugar","salt","yeast","warm water","egg","butter","cooking oil","icing sugar"],
"steps":[
  "Mix 2.5 cup all-purpose flour, 3 tbsp sugar, 0.5 tsp salt and 1 packet yeast.",
  "Add 0.75 cup warm water, 1 egg and 2 tbsp melted butter; mix until a rough dough forms.",
  "Knead until smooth and non-sticky. Cover and rest 1 hour until doubled.",
  "Knock back; roll into small balls (golf-ball size).",
  "Deep-fry in hot oil over high heat for 2–3 minutes, turning, until evenly golden.",
  "Drain; while still warm, toss or dust with icing sugar."
],
"steps_ms":[
  "Gaul 2 cawan setengah tepung gandum, 3 sudu gula, setengah sudu kecil garam dan 1 paket yis.",
  "Masukkan 3/4 cawan air suam, 1 biji telur dan 2 sudu butter cair; gaul sehingga jadi adunan kasar.",
  "Uli sehingga licin dan tidak melekat. Tutup dan rehat 1 jam sehingga dua kali ganda.",
  "Hembus keluar udara; gulung menjadi bola-bola kecil (saiz bola golf).",
  "Goreng dalam minyak panas atas api besar 2-3 minit, pusingkan, sehingga golden rata.",
  "Toskan; selagi panas, guling atau tabur dengan gula serbuk."
],
"tags":["halal","dessert","doughnut","fried","sweet","ramadan","easy"],
"ingredients_detailed":[
  {"name":"all-purpose flour","name_ms":"tepung gandum","quantity":2.5, "unit":"cup",  "note":""},
  {"name":"sugar",            "name_ms":"gula",         "quantity":3,   "unit":"tbsp", "note":"in dough"},
  {"name":"salt",             "name_ms":"garam",        "quantity":0.5, "unit":"tsp",  "note":""},
  {"name":"yeast",            "name_ms":"yis",          "quantity":1,   "unit":None,   "note":"1 packet instant yeast"},
  {"name":"warm water",       "name_ms":"air",           "quantity":None,"unit":None,   "note":"3/4 cup warm (not hot)"},
  {"name":"egg",              "name_ms":"telur",         "quantity":1,   "unit":None,   "note":""},
  {"name":"butter",           "name_ms":"butter",        "quantity":2,   "unit":"tbsp", "note":"melted"},
  {"name":"cooking oil",      "name_ms":"minyak goreng", "quantity":None,"unit":None,   "note":"for deep frying"},
  {"name":"icing sugar",      "name_ms":"gula",          "quantity":None,"unit":None,   "note":"for dusting; amount to preference"}
]},

# ── V46 ─────────────────────────────────────────────────────────────────────
{"video_id":"7485999289957616914","is_recipe":True,"needs_review":True,
"review_notes":"some garnish quantities (kucai, taugeh, torch ginger bud, laksa noodles) not explicitly stated; laksa paste qty flexible; fish quantity for poaching not stated",
"title":"Siamese Laksa (Laksa Siam)",
"title_ms":"Laksa Siam",
"description":"A rich, creamy Siamese-style laksa broth made from poached fish, coconut milk and a fragrant pounded spice paste — served with rice vermicelli, cockles, boiled egg and fresh herbs.",
"description_ms":"Kuah laksa Siam yang kaya dan berkrim daripada ikan rebus, santan dan pes rempah yang ditumbuk — dihidang dengan bihun, kerang, telur rebus dan ulam-ulam segar.",
"cuisine":"Malaysian/Thai","difficulty":"Hard","prep_time":40,"cook_time":40,"servings":5,
"ingredients":["mackerel","water","lemongrass","galangal","fresh turmeric","onion","garlic","dried chilli","shrimp paste","blended chilli","coconut milk","tamarind paste","salt","sugar","seasoning powder","rice vermicelli","cockles","egg","garlic chives","bean sprouts","torch ginger bud","cucumber","Vietnamese mint"],
"steps":[
  "Poach 2–3 mackerel in water with bruised lemongrass, galangal and a knob of fresh turmeric; once cooked, remove flesh and discard bones. Reserve the broth.",
  "Pound or blend 2 lemongrass stalks, 1 knob galangal, 1 knob fresh turmeric, 2 onions, 5 garlic cloves, 10 soaked dried chillies and 1 roasted shrimp paste block into a fine paste.",
  "Fry the paste in oil until fragrant and oil separates; add 3 tbsp blended chilli.",
  "Add the reserved fish broth; stir in the shredded fish flesh.",
  "Add 1 small box coconut milk and 1 tbsp tamarind paste; season with salt, sugar and seasoning powder.",
  "Simmer for 10–15 minutes until the broth is rich and fragrant.",
  "Blanch rice vermicelli; boil eggs (7 minutes for medium); open cockles and blanch briefly.",
  "Serve broth over rice vermicelli with cockles, halved egg, garlic chives, bean sprouts, sliced torch ginger bud, cucumber julienne and Vietnamese mint."
],
"steps_ms":[
  "Rebus 2-3 ekor ikan kembung dalam air bersama serai diketuk, lengkuas dan seketul kunyit hidup; bila masak, ambil isi ikan dan buang tulang. Simpan air rebusan.",
  "Tumbuk atau blend 2 batang serai, 1 ketul lengkuas, 1 ketul kunyit hidup, 2 biji bawang, 5 ulas bawang putih, 10 biji cili kering yang direndam dan 1 ketul belacan bakar sehingga lumat.",
  "Goreng pes dalam minyak sehingga wangi dan pecah minyak; masukkan 3 sudu cili kisar.",
  "Masukkan air rebusan ikan; masukkan isi ikan yang sudah disuwir.",
  "Masukkan 1 kotak kecil santan dan 1 sudu pes asam jawa; tambah garam, gula dan serbuk perasa.",
  "Reneh 10-15 minit sehingga kuah kaya dan wangi.",
  "Celur bihun; rebus telur (7 minit untuk setengah masak); buka kerang dan celur sebentar.",
  "Hidang kuah di atas bihun bersama kerang, telur belah dua, kucai, taugeh, hirisan bunga kantan, julien timun dan daun kesum."
],
"tags":["halal","noodles","laksa","fish","coconut milk","thai","malaysian","ramadan"],
"ingredients_detailed":[
  {"name":"mackerel",        "name_ms":"ikan kembung",  "quantity":None,"unit":None,   "note":"2-3 fish for broth; quantity not stated exactly"},
  {"name":"water",           "name_ms":"air",            "quantity":None,"unit":None,   "note":"for poaching"},
  {"name":"lemongrass",      "name_ms":"serai",         "quantity":4,   "unit":None,   "note":"2 bruised for poaching; 2 for paste"},
  {"name":"galangal",        "name_ms":"lengkuas",      "quantity":None,"unit":None,   "note":"1 knob for poaching; 1 knob for paste"},
  {"name":"fresh turmeric",  "name_ms":"kunyit hidup",  "quantity":None,"unit":None,   "note":"1 knob for poaching; 1 knob for paste"},
  {"name":"onion",           "name_ms":"bawang merah",  "quantity":2,   "unit":None,   "note":"for paste"},
  {"name":"garlic",          "name_ms":"bawang putih",  "quantity":5,   "unit":"clove","note":"for paste"},
  {"name":"dried chilli",    "name_ms":"cili kering",   "quantity":10,  "unit":None,   "note":"soaked in hot water; for paste"},
  {"name":"shrimp paste",    "name_ms":"belacan",       "quantity":1,   "unit":None,   "note":"1 block; roasted; for paste"},
  {"name":"blended chilli",  "name_ms":"cili kisar",    "quantity":3,   "unit":"tbsp", "note":""},
  {"name":"coconut milk",    "name_ms":"santan",        "quantity":1,   "unit":None,   "note":"1 small box"},
  {"name":"tamarind paste",  "name_ms":"pes asam jawa", "quantity":1,   "unit":"tbsp", "note":""},
  {"name":"salt",            "name_ms":"garam",         "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"sugar",           "name_ms":"gula",          "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"seasoning powder","name_ms":"serbuk perasa", "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"rice vermicelli", "name_ms":"bihun",         "quantity":None,"unit":None,   "note":"blanched; for serving"},
  {"name":"cockles",         "name_ms":"kerang",        "quantity":None,"unit":None,   "note":"for serving"},
  {"name":"egg",             "name_ms":"telur",         "quantity":None,"unit":None,   "note":"boiled 7 min; for serving"},
  {"name":"garlic chives",   "name_ms":"kucai",         "quantity":None,"unit":None,   "note":"for serving"},
  {"name":"bean sprouts",    "name_ms":"taugeh",        "quantity":None,"unit":None,   "note":"for serving"},
  {"name":"torch ginger bud","name_ms":"bunga kantan",  "quantity":None,"unit":None,   "note":"sliced; for serving"},
  {"name":"cucumber",        "name_ms":"timun",         "quantity":None,"unit":None,   "note":"julienned; for serving"},
  {"name":"Vietnamese mint", "name_ms":"daun kesum",    "quantity":None,"unit":None,   "note":"for serving"}
]},

# ── V47 ─────────────────────────────────────────────────────────────────────
{"video_id":"7618118573059312916","is_recipe":True,"needs_review":False,
"review_notes":"sets at room temp in ~2 hrs then refrigerate; dragon fruit can be red or white; quantities all stated; prep/cook times estimated",
"title":"Dragon Fruit Jelly Pudding (Puding Buah Naga)",
"title_ms":"Puding Buah Naga",
"description":"A beautiful layered jelly pudding made with fresh dragon fruit blended into the jelly — sets to a gorgeous pink colour and needs no artificial colouring.",
"description_ms":"Puding jeli berlapis yang cantik dibuat dengan buah naga segar yang diblend masuk ke dalam jeli — warna merah jambu yang cantik semula jadi tanpa pewarna.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":30,"cook_time":15,"servings":8,
"ingredients":["jelly powder","sugar","water","dragon fruit","evaporated milk (liquid)","sweetened condensed milk"],
"steps":[
  "Blend the flesh of 1 dragon fruit (red or white) with 2 cup water until smooth.",
  "Strain through a sieve; combine with 1.5 cup additional water.",
  "Add 1 packet (10 g) jelly powder and 5 tbsp sugar; stir well.",
  "Bring to a boil over medium heat, stirring continuously, until the jelly powder dissolves completely.",
  "Remove from heat; pour into moulds or a large tray.",
  "Allow to set at room temperature for about 2 hours, then refrigerate.",
  "For the sauce: mix 0.5 cup evaporated milk and 0.5 cup sweetened condensed milk; serve drizzled over sliced jelly."
],
"steps_ms":[
  "Blend isi 1 biji buah naga (merah atau putih) dengan 2 cawan air sehingga lumat.",
  "Tapis melalui penapis; campurkan dengan 1 cawan setengah air tambahan.",
  "Masukkan 1 paket (10g) serbuk jeli dan 5 sudu gula; kacau rata.",
  "Masak atas api sederhana sambil kacau berterusan sehingga serbuk jeli larut sepenuhnya.",
  "Angkat dari api; tuang ke dalam acuan atau tray besar.",
  "Biarkan set di suhu bilik kira-kira 2 jam, kemudian simpan dalam peti sejuk.",
  "Untuk sos: gaul setengah cawan susu cair dan setengah cawan susu pekat manis; hidang dititis di atas jeli yang dipotong."
],
"tags":["halal","dessert","jelly","dragon fruit","no-bake","malaysian","raya"],
"ingredients_detailed":[
  {"name":"jelly powder",   "name_ms":"serbuk jeli",  "quantity":1,   "unit":None,   "note":"1 packet (10 g); any brand"},
  {"name":"sugar",          "name_ms":"gula",         "quantity":5,   "unit":"tbsp", "note":"adjust to taste"},
  {"name":"water",          "name_ms":"air",           "quantity":3.5, "unit":"cup",  "note":"2 cup for blending dragon fruit; 1.5 cup additional"},
  {"name":"dragon fruit",   "name_ms":"buah naga",    "quantity":1,   "unit":None,   "note":"red for pink colour; white also works"},
  {"name":"evaporated milk (liquid)","name_ms":"susu cair","quantity":0.5,"unit":"cup","note":"for sauce"},
  {"name":"sweetened condensed milk","name_ms":"krimer manis","quantity":0.5,"unit":"cup","note":"for sauce"}
]},

# ── V48 ─────────────────────────────────────────────────────────────────────
{"video_id":"7478542516279610642","is_recipe":True,"needs_review":True,
"review_notes":"egg count stated as '3 biji' but transcript mentions adding an extra — ambiguous whether 3 or 4 eggs total; bake time 55-65 min; cream cheese block size stated as 1 block",
"title":"Pandan Burnt Cheesecake (Basque Cheesecake)",
"title_ms":"Pandan Burnt Cheesecake",
"description":"A crustless Basque-style cheesecake with pandan flavour — creamy inside with a deliberately charred top.",
"description_ms":"Cheesecake Basque tanpa kerak dengan perisa pandan — lembut berkrim di dalam, dengan permukaan yang sengaja dihanguskan.",
"cuisine":"Western-inspired","difficulty":"Easy","prep_time":20,"cook_time":60,"servings":8,
"ingredients":["cream cheese","sugar","egg","all-purpose flour","whipping cream","pandan extract","vanilla essence","salt"],
"steps":[
  "Let 1 block cream cheese come to room temperature; beat until smooth.",
  "Add 0.5 cup sugar; beat well.",
  "Add 3 eggs one at a time, mixing after each.",
  "Sift in 2 tbsp all-purpose flour; fold in.",
  "Add 1 cup whipping cream, a few drops of pandan extract, 1 tsp vanilla essence and a pinch of salt; mix until smooth.",
  "Line a springform tin with baking paper; pour in the batter.",
  "Bake at 220°C (fan) for 55–65 minutes — the top should be deep brown/charred while the centre remains slightly jiggly.",
  "Cool completely at room temperature before slicing."
],
"steps_ms":[
  "Biarkan 1 blok krim cheese ke suhu bilik; pukul sehingga licin.",
  "Masukkan setengah cawan gula; pukul sebati.",
  "Masukkan 3 biji telur satu persatu, gaul setiap kali.",
  "Ayak masuk 2 sudu tepung gandum; lipat masuk.",
  "Masukkan 1 cawan whipping cream, beberapa titik pewarna/ekstrak pandan, 1 sudu kecil esen vanila dan secubit garam; gaul sehingga licin.",
  "Alaskan loyang springform dengan kertas pembakar; tuang adunan.",
  "Bakar pada suhu 220°C (kipas) selama 55-65 minit — bahagian atas sepatutnya perang gelap/hangus manakala tengah masih sedikit bergetar.",
  "Sejukkan sepenuhnya di suhu bilik sebelum dipotong."
],
"tags":["halal","dessert","cheesecake","pandan","baked","western","ramadan"],
"ingredients_detailed":[
  {"name":"cream cheese",   "name_ms":"krim cheese",  "quantity":1,   "unit":None,   "note":"1 block (approx. 250 g); at room temperature"},
  {"name":"sugar",          "name_ms":"gula",         "quantity":0.5, "unit":"cup",  "note":""},
  {"name":"egg",            "name_ms":"telur",        "quantity":3,   "unit":None,   "note":"transcript says 3; possibly 4 — needs_review"},
  {"name":"all-purpose flour","name_ms":"tepung gandum","quantity":2, "unit":"tbsp", "note":"sifted"},
  {"name":"whipping cream", "name_ms":"whipping cream","quantity":1,  "unit":"cup",  "note":""},
  {"name":"pandan extract", "name_ms":"ekstrak pandan","quantity":None,"unit":None,  "note":"a few drops; or pandan paste"},
  {"name":"vanilla essence","name_ms":"esen vanila",  "quantity":1,   "unit":"tsp",  "note":""},
  {"name":"salt",           "name_ms":"garam",        "quantity":None,"unit":None,   "note":"a pinch"}
]},

# ── V49 ─────────────────────────────────────────────────────────────────────
{"video_id":"7610699789948308744","is_recipe":True,"needs_review":True,
"review_notes":"fish quantity not stated; dried tamarind slices quantity vague ('3-4 keping'); cook/prep times estimated",
"title":"Spanish Mackerel in Vinegar Gravy (Tenggiri Masak Cuka)",
"title_ms":"Tenggiri Masak Cuka",
"description":"Fried Spanish mackerel steaks simmered in a piquant, slightly sweet sour gravy made with dried tamarind, vinegar and aromatic spices.",
"description_ms":"Steak ikan tenggiri yang digoreng kemudian direneh dalam kuah masam-manis dengan asam keping, cuka dan rempah yang aromatik.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":20,"cook_time":20,"servings":3,
"ingredients":["Spanish mackerel","turmeric powder","salt","cooking oil","onion","garlic","ginger","bird's eye chilli","dried tamarind slices","vinegar","water","palm sugar","seasoning powder","curry leaf"],
"steps":[
  "Rub fish steaks with 1 tsp turmeric powder and 0.5 tsp salt; fry until cooked through and golden. Set aside.",
  "In the same pan, sauté sliced onion, 4 garlic cloves and a knob of ginger until soft.",
  "Add 3 bird's eye chillies; sauté briefly.",
  "Add 3–4 dried tamarind slices, 1 tbsp vinegar, 1 cup water, 1 palm sugar block and seasoning powder.",
  "Simmer until the gravy is slightly thickened.",
  "Add the fried fish back; add curry leaf; simmer for a further 5 minutes.",
  "Adjust sourness and sweetness; serve hot with rice."
],
"steps_ms":[
  "Lumur kepingan ikan tenggiri dengan 1 sudu kecil serbuk kunyit dan setengah sudu kecil garam; goreng sehingga masak dan golden. Ketepikan.",
  "Dalam kuali yang sama, tumis hirisan bawang, 4 ulas bawang putih dan seketul halia sehingga layu.",
  "Masukkan 3 biji cili padi; tumis sebentar.",
  "Masukkan 3-4 keping asam keping, 1 sudu cuka, 1 cawan air, 1 ketul gula Melaka dan serbuk perasa.",
  "Reneh sehingga kuah sedikit pekat.",
  "Masukkan balik ikan yang sudah digoreng; masukkan daun kari; reneh 5 minit lagi.",
  "Laraskan rasa masam dan manis; hidang panas bersama nasi."
],
"tags":["halal","fish","sour","malaysian","ramadan","easy"],
"ingredients_detailed":[
  {"name":"Spanish mackerel","name_ms":"ikan tenggiri","quantity":None,"unit":None,   "note":"fish steaks; quantity not stated"},
  {"name":"turmeric powder", "name_ms":"serbuk kunyit","quantity":1,   "unit":"tsp",  "note":"for rubbing fish"},
  {"name":"salt",            "name_ms":"garam",        "quantity":0.5, "unit":"tsp",  "note":"for rubbing fish; more to taste"},
  {"name":"cooking oil",     "name_ms":"minyak goreng","quantity":None,"unit":None,   "note":"for frying fish and sautéing"},
  {"name":"onion",           "name_ms":"bawang merah", "quantity":None,"unit":None,   "note":"sliced"},
  {"name":"garlic",          "name_ms":"bawang putih", "quantity":4,   "unit":"clove","note":""},
  {"name":"ginger",          "name_ms":"halia",        "quantity":None,"unit":None,   "note":"1 knob"},
  {"name":"bird's eye chilli","name_ms":"cili padi",   "quantity":3,   "unit":None,   "note":""},
  {"name":"dried tamarind slices","name_ms":"asam keping","quantity":None,"unit":None,  "note":"3-4 pieces; quantity vague"},
  {"name":"vinegar",         "name_ms":"cuka",         "quantity":1,   "unit":"tbsp", "note":""},
  {"name":"water",           "name_ms":"air",           "quantity":1,   "unit":"cup",  "note":""},
  {"name":"palm sugar",      "name_ms":"gula melaka",  "quantity":1,   "unit":None,   "note":"1 block"},
  {"name":"seasoning powder","name_ms":"serbuk perasa","quantity":None,"unit":None,   "note":"to taste"},
  {"name":"curry leaf",      "name_ms":"daun kari",    "quantity":None,"unit":None,   "note":"a few stalks"}
]},

# ── V50 ─────────────────────────────────────────────────────────────────────
{"video_id":"7482282461641100562","is_recipe":True,"needs_review":True,
"review_notes":"chicken quantity not stated; spice paste powder brand 'Adabi' or any brand; cook/prep times estimated",
"title":"Curry Noodle Soup (Mee Kari)",
"title_ms":"Mee Kari",
"description":"Rich, coconut-based curry noodle soup with chicken, tofu puffs and fish cake — a classic Malaysian street food.",
"description_ms":"Sup mi kari yang kaya berasaskan santan dengan ayam, tauhu goreng dan fishcake — makanan jalanan Malaysia yang klasik.",
"cuisine":"Malaysian","difficulty":"Medium","prep_time":20,"cook_time":30,"servings":4,
"ingredients":["cooking oil","onion","garlic","ginger","curry powder","chilli powder","chicken","water","coconut milk","tofu puffs","fish cake","fish ball","salt","sugar","seasoning powder","yellow noodles","bean sprouts","spring onion"],
"steps":[
  "Sauté sliced onion, 5 garlic cloves and a knob of ginger until fragrant.",
  "Add 3 tbsp curry powder and 1 tbsp chilli powder; fry briefly until fragrant.",
  "Add chicken pieces; coat in the spice paste.",
  "Add water; bring to a boil.",
  "Add 1 box coconut milk; season with salt, sugar and seasoning powder.",
  "Add tofu puffs, sliced fish cake and fish balls; simmer until chicken is cooked.",
  "Blanch yellow noodles; place in bowls.",
  "Ladle hot curry soup over the noodles; top with bean sprouts and spring onion."
],
"steps_ms":[
  "Tumis hirisan bawang, 5 ulas bawang putih dan seketul halia sehingga wangi.",
  "Masukkan 3 sudu serbuk kari dan 1 sudu serbuk cili; goreng sebentar sehingga wangi.",
  "Masukkan kepingan ayam; gaul rata dengan pes rempah.",
  "Masukkan air; didihkan.",
  "Masukkan 1 kotak santan; tambah garam, gula dan serbuk perasa.",
  "Masukkan tauhu goreng, hirisan fishcake dan fishball; reneh sehingga ayam masak.",
  "Celur mi kuning; susun dalam mangkuk.",
  "Tuang sup kari panas di atas mi; tabur taugeh dan daun bawang."
],
"tags":["halal","noodles","curry","chicken","coconut milk","malaysian","ramadan"],
"ingredients_detailed":[
  {"name":"cooking oil",   "name_ms":"minyak goreng","quantity":None,"unit":None,   "note":"for sautéing"},
  {"name":"onion",         "name_ms":"bawang merah", "quantity":None,"unit":None,   "note":"sliced"},
  {"name":"garlic",        "name_ms":"bawang putih", "quantity":5,   "unit":"clove","note":""},
  {"name":"ginger",        "name_ms":"halia",        "quantity":None,"unit":None,   "note":"1 knob"},
  {"name":"curry powder",  "name_ms":"serbuk kari",  "quantity":3,   "unit":"tbsp", "note":"brand Adabi or any"},
  {"name":"chilli powder", "name_ms":"serbuk cili",  "quantity":1,   "unit":"tbsp", "note":""},
  {"name":"chicken",       "name_ms":"ayam",         "quantity":None,"unit":None,   "note":"quantity not stated"},
  {"name":"water",         "name_ms":"air",           "quantity":None,"unit":None,   "note":""},
  {"name":"coconut milk",  "name_ms":"santan",       "quantity":1,   "unit":None,   "note":"1 box"},
  {"name":"tofu puffs",    "name_ms":"tauhu goreng", "quantity":None,"unit":None,   "note":""},
  {"name":"fish cake",     "name_ms":"fishcake",     "quantity":None,"unit":None,   "note":"sliced"},
  {"name":"fish ball",     "name_ms":"fishball",     "quantity":None,"unit":None,   "note":""},
  {"name":"salt",          "name_ms":"garam",        "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"sugar",         "name_ms":"gula",         "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"seasoning powder","name_ms":"serbuk perasa","quantity":None,"unit":None, "note":"to taste"},
  {"name":"yellow noodles","name_ms":"mi kuning",    "quantity":None,"unit":None,   "note":"blanched"},
  {"name":"bean sprouts",  "name_ms":"taugeh",       "quantity":None,"unit":None,   "note":"for serving"},
  {"name":"spring onion",  "name_ms":"daun bawang",  "quantity":None,"unit":None,   "note":"for serving"}
]},

# ── V51 ─────────────────────────────────────────────────────────────────────
{"video_id":"7481141489939123463","is_recipe":True,"needs_review":True,
"review_notes":"chicken quantity not stated; bunga kantan (torch ginger bud) quantity not stated; cook/prep times estimated",
"title":"Fried Chicken with Torch Ginger Bud Sambal (Ayam Goreng Sambal Kantan)",
"title_ms":"Ayam Goreng Sambal Kantan",
"description":"Marinated fried chicken served with a fragrant fresh sambal made from blended torch ginger bud — aromatic and uniquely Malay.",
"description_ms":"Ayam goreng berempah dihidang dengan sambal bunga kantan yang segar dan wangi — aroma khas Melayu.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":30,"cook_time":25,"servings":4,
"ingredients":["chicken","turmeric powder","salt","seasoning powder","garlic","cooking oil","torch ginger bud","bird's eye chilli","onion","shrimp paste","calamansi lime","sugar"],
"steps":[
  "Marinate chicken with 1 tsp turmeric powder, 1 tsp salt, seasoning powder and 3 crushed garlic cloves; rest 20 minutes.",
  "Deep-fry until golden and cooked. Set aside.",
  "[Sambal Kantan] Blend torch ginger buds, 10 bird's eye chillies, 1 onion and 1 small roasted shrimp paste block until coarse.",
  "Squeeze in juice of 5 calamansi limes; add 1 tsp sugar and salt to taste.",
  "Serve the fried chicken topped with the sambal kantan."
],
"steps_ms":[
  "Perap ayam dengan 1 sudu kecil serbuk kunyit, 1 sudu kecil garam, serbuk perasa dan 3 ulas bawang putih yang dihancurkan; rehat 20 minit.",
  "Goreng dalam minyak panas sehingga golden dan masak. Ketepikan.",
  "[Sambal Kantan] Blend bunga kantan, 10 biji cili padi, 1 biji bawang dan 1 ketul kecil belacan bakar sehingga kasar.",
  "Perah jus 5 biji limau kasturi; tambah 1 sudu kecil gula dan garam secukupnya.",
  "Hidang ayam goreng dengan sambal kantan di atas."
],
"tags":["halal","chicken","fried","sambal","torch ginger","malaysian","ramadan"],
"ingredients_detailed":[
  {"name":"chicken",          "name_ms":"ayam",          "quantity":None,"unit":None,   "note":"quantity not stated"},
  {"name":"turmeric powder",  "name_ms":"serbuk kunyit", "quantity":1,   "unit":"tsp",  "note":"for marinade"},
  {"name":"salt",             "name_ms":"garam",         "quantity":1,   "unit":"tsp",  "note":"for marinade; more to taste"},
  {"name":"seasoning powder", "name_ms":"serbuk perasa", "quantity":None,"unit":None,   "note":"to taste; for marinade"},
  {"name":"garlic",           "name_ms":"bawang putih",  "quantity":3,   "unit":"clove","note":"crushed; for marinade"},
  {"name":"cooking oil",      "name_ms":"minyak goreng", "quantity":None,"unit":None,   "note":"for frying"},
  {"name":"torch ginger bud", "name_ms":"bunga kantan",  "quantity":None,"unit":None,   "note":"quantity not stated; blended into sambal"},
  {"name":"bird's eye chilli","name_ms":"cili padi",     "quantity":10,  "unit":None,   "note":"blended into sambal"},
  {"name":"onion",            "name_ms":"bawang merah",  "quantity":1,   "unit":None,   "note":"blended into sambal"},
  {"name":"shrimp paste",     "name_ms":"belacan",       "quantity":1,   "unit":None,   "note":"1 small block; roasted; blended into sambal"},
  {"name":"calamansi lime",   "name_ms":"limau kasturi", "quantity":5,   "unit":None,   "note":"juiced"},
  {"name":"sugar",            "name_ms":"gula",          "quantity":1,   "unit":"tsp",  "note":"for sambal"}
]},

# ── V52 ─────────────────────────────────────────────────────────────────────
{"video_id":"7612554976145001735","is_recipe":True,"needs_review":True,
"review_notes":"fish quantity not stated; tomato quantity for garnish flexible; cook/prep times estimated",
"title":"Red Snapper Soup (Sup Ikan Merah)",
"title_ms":"Sup Ikan Merah",
"description":"A clear, aromatic red snapper soup fragrant with ginger, lemongrass, tomato and fresh herbs — light and nourishing.",
"description_ms":"Sup ikan merah jernih yang wangi dengan halia, serai, tomato dan herba segar — ringan dan berkhasiat.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":15,"cook_time":25,"servings":4,
"ingredients":["red snapper","water","ginger","lemongrass","tomato","onion","salt","seasoning powder","sugar","spring onion","coriander leaves","lime"],
"steps":[
  "Clean and score the fish; rub with a little salt.",
  "Bring water to a boil with bruised ginger, 2 lemongrass stalks and sliced onion.",
  "Add the fish; simmer until cooked through (10–15 minutes).",
  "Add tomatoes (halved); season with salt, seasoning powder and a little sugar.",
  "Garnish with spring onion and coriander; serve with a wedge of lime."
],
"steps_ms":[
  "Bersihkan dan calit ikan; lumur dengan sedikit garam.",
  "Didihkan air bersama halia diketuk, 2 batang serai dan bawang merah yang dihiris.",
  "Masukkan ikan; reneh sehingga masak (10-15 minit).",
  "Masukkan tomato (dibelah); tambah garam, serbuk perasa dan sedikit gula.",
  "Hiaskan dengan daun bawang dan daun ketumbar; hidang dengan hirisan limau."
],
"tags":["halal","fish","soup","clear soup","malaysian","ramadan","easy"],
"ingredients_detailed":[
  {"name":"red snapper",    "name_ms":"ikan merah",   "quantity":None,"unit":None,   "note":"whole or pieces; quantity not stated"},
  {"name":"water",          "name_ms":"air",           "quantity":None,"unit":None,   "note":"enough to cover fish"},
  {"name":"ginger",         "name_ms":"halia",        "quantity":None,"unit":None,   "note":"1 knob; bruised"},
  {"name":"lemongrass",     "name_ms":"serai",        "quantity":2,   "unit":None,   "note":"bruised"},
  {"name":"tomato",         "name_ms":"tomato",       "quantity":2,   "unit":None,   "note":"halved"},
  {"name":"onion",          "name_ms":"bawang merah", "quantity":1,   "unit":None,   "note":"sliced"},
  {"name":"salt",           "name_ms":"garam",        "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"seasoning powder","name_ms":"serbuk perasa","quantity":None,"unit":None,  "note":"to taste"},
  {"name":"sugar",          "name_ms":"gula",         "quantity":None,"unit":None,   "note":"a little"},
  {"name":"spring onion",   "name_ms":"daun bawang",  "quantity":None,"unit":None,   "note":"for garnish"},
  {"name":"coriander leaves","name_ms":"daun ketumbar","quantity":None,"unit":None,  "note":"for garnish"},
  {"name":"lime",           "name_ms":"limau nipis",  "quantity":None,"unit":None,   "note":"wedges for serving"}
]},

# ── V53 ─────────────────────────────────────────────────────────────────────
{"video_id":"7481557259689004306","is_recipe":True,"needs_review":True,
"review_notes":"number of frozen paratha sheets not stated; potato quantity implied by filling yield",
"title":"Crispy Samosa (from Frozen Paratha)",
"title_ms":"Samosa Crispy dari Paratha",
"description":"Easy crispy samosas made using frozen paratha sheets filled with spiced potato and mixed vegetable filling — no pastry-making needed.",
"description_ms":"Samosa crispy yang mudah menggunakan paratha beku diisi dengan inti kentang dan sayur berbumbu — tiada perlu buat pastri.",
"cuisine":"Malaysian-Indian","difficulty":"Easy","prep_time":20,"cook_time":20,"servings":10,
"ingredients":["frozen paratha","potato","carrot","pea","onion","garlic","curry powder","salt","seasoning powder","cooking oil"],
"steps":[
  "Boil 3 potatoes until soft; dice. Dice 1 carrot (parboil if needed).",
  "Sauté diced onion and 3 garlic cloves; add 1 tbsp curry powder.",
  "Add diced potato and carrot; season with salt and seasoning powder. Add frozen peas; mix well. Cool completely.",
  "Thaw frozen paratha sheets; cut each sheet into 3 strips.",
  "Place a spoonful of filling on one end of a strip; fold diagonally into a triangle, sealing with water as you go.",
  "Deep-fry in hot oil until golden and crispy on both sides.",
  "Drain and serve with chilli or mint sauce."
],
"steps_ms":[
  "Rebus 3 biji kentang sehingga empuk; potong kiub. Potong 1 carrot kiub (rebus sebentar jika perlu).",
  "Tumis bawang kiub dan 3 ulas bawang putih; masukkan 1 sudu serbuk kari.",
  "Masukkan kentang dan carrot; tambah garam dan serbuk perasa. Masukkan kacang pis beku; gaul rata. Biarkan sejuk sepenuhnya.",
  "Cairkan lembaran paratha beku; potong setiap keping menjadi 3 jalur.",
  "Letakkan sesenduk inti di hujung satu jalur; lipat serong menjadi segitiga, lekatkan dengan air sepanjang jalan.",
  "Goreng dalam minyak panas sehingga golden crispy di kedua-dua belah.",
  "Toskan dan hidang dengan sos cili atau sos pudina."
],
"tags":["halal","vegetarian","snack","samosa","potato","malaysian","raya","ramadan"],
"ingredients_detailed":[
  {"name":"frozen paratha", "name_ms":"roti paratha",  "quantity":None,"unit":None,   "note":"number of sheets not stated"},
  {"name":"potato",         "name_ms":"kentang",       "quantity":3,   "unit":None,   "note":"boiled and diced"},
  {"name":"carrot",         "name_ms":"carrot",        "quantity":1,   "unit":None,   "note":"diced"},
  {"name":"pea",            "name_ms":"kacang pis",    "quantity":None,"unit":None,   "note":"frozen peas"},
  {"name":"onion",          "name_ms":"bawang merah",  "quantity":1,   "unit":None,   "note":"diced"},
  {"name":"garlic",         "name_ms":"bawang putih",  "quantity":3,   "unit":"clove","note":""},
  {"name":"curry powder",   "name_ms":"serbuk kari",   "quantity":1,   "unit":"tbsp", "note":""},
  {"name":"salt",           "name_ms":"garam",         "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"seasoning powder","name_ms":"serbuk perasa","quantity":None,"unit":None,   "note":"to taste"},
  {"name":"cooking oil",    "name_ms":"minyak goreng", "quantity":None,"unit":None,   "note":"for frying"}
]},

# ── V54 ─────────────────────────────────────────────────────────────────────
{"video_id":"7480398655820795144","is_recipe":True,"needs_review":True,
"review_notes":"cockles quantity not stated; dried tamarind slices quantity stated as '4-5 keping'; cook/prep times estimated",
"title":"Cockle Sambal with Dried Tamarind (Sambal Taun)",
"title_ms":"Sambal Taun (Sambal Kerang)",
"description":"A tangy, spicy cockle sambal soured with dried tamarind — a traditional Malay sambal that is excellent with white rice.",
"description_ms":"Sambal kerang yang masam-pedas dengan asam keping — sambal Melayu tradisi yang sangat sedap bersama nasi putih.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":15,"cook_time":15,"servings":3,
"ingredients":["cockles","cooking oil","onion","garlic","blended chilli","dried tamarind slices","water","palm sugar","salt","seasoning powder","kaffir lime leaf"],
"steps":[
  "Open and wash cockles; blanch briefly in boiling water. Set aside.",
  "Sauté sliced onion and 5 garlic cloves in oil until fragrant.",
  "Add 3 tbsp blended chilli; fry until oil separates.",
  "Add 4–5 dried tamarind slices and a little water; stir.",
  "Season with 1 small palm sugar block, salt and seasoning powder.",
  "Add cockles; fold in gently. Do not over-cook — cockles toughen quickly.",
  "Add torn kaffir lime leaves for fragrance; serve immediately."
],
"steps_ms":[
  "Buka dan basuh kerang; celur sebentar dalam air mendidih. Ketepikan.",
  "Tumis hirisan bawang dan 5 ulas bawang putih dalam minyak sehingga wangi.",
  "Masukkan 3 sudu cili kisar; goreng sehingga pecah minyak.",
  "Masukkan 4-5 keping asam keping dan sedikit air; kacau.",
  "Tambah 1 ketul kecil gula Melaka, garam dan serbuk perasa.",
  "Masukkan kerang; gaul perlahan. Jangan masak terlalu lama — kerang mudah keras.",
  "Masukkan daun limau purut yang dicarik untuk aroma; hidang dengan segera."
],
"tags":["halal","seafood","cockles","sambal","sour","malaysian","ramadan"],
"ingredients_detailed":[
  {"name":"cockles",        "name_ms":"kerang",        "quantity":None,"unit":None,   "note":"quantity not stated"},
  {"name":"cooking oil",    "name_ms":"minyak goreng", "quantity":None,"unit":None,   "note":""},
  {"name":"onion",          "name_ms":"bawang merah",  "quantity":1,   "unit":None,   "note":"sliced"},
  {"name":"garlic",         "name_ms":"bawang putih",  "quantity":5,   "unit":"clove","note":""},
  {"name":"blended chilli", "name_ms":"cili kisar",    "quantity":3,   "unit":"tbsp", "note":""},
  {"name":"dried tamarind slices","name_ms":"asam keping","quantity":None,"unit":None,  "note":"4-5 pieces; quantity vague"},
  {"name":"water",          "name_ms":"air",            "quantity":None,"unit":None,   "note":"a little"},
  {"name":"palm sugar",     "name_ms":"gula melaka",   "quantity":1,   "unit":None,   "note":"1 small block"},
  {"name":"salt",           "name_ms":"garam",         "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"seasoning powder","name_ms":"serbuk perasa","quantity":None,"unit":None,   "note":"to taste"},
  {"name":"kaffir lime leaf","name_ms":"daun limau purut","quantity":None,"unit":None,  "note":"torn; for fragrance"}
]},

# ── V55 ─────────────────────────────────────────────────────────────────────
{"video_id":"7611453477151116552","is_recipe":True,"needs_review":False,
"review_notes":"refrigerate overnight for best results; mango is optional topping; prep includes overnight soak",
"title":"Overnight Chia Pudding",
"title_ms":"Chia Pudding Overnight",
"description":"A healthy, creamy overnight chia pudding with only 3 ingredients — perfect for a quick and nutritious sahur.",
"description_ms":"Puding chia semalaman yang sihat dan berkrim dengan hanya 3 bahan — sesuai untuk sahur yang mudah dan berkhasiat.",
"cuisine":"Western","difficulty":"Easy","prep_time":5,"cook_time":0,"servings":2,
"ingredients":["chia seeds","sweetened condensed milk","fresh milk","mango","honey"],
"steps":[
  "Combine 4 tbsp chia seeds, 2 tbsp sweetened condensed milk and 1 cup fresh milk in a jar; stir well.",
  "Refrigerate overnight (or at least 4 hours) until the chia seeds absorb the liquid and puff up into a pudding.",
  "Before serving, stir; top with diced mango and a drizzle of honey."
],
"steps_ms":[
  "Gaul 4 sudu chia seed, 2 sudu krimer manis dan 1 cawan susu segar dalam balang; kacau rata.",
  "Simpan dalam peti sejuk semalaman (atau sekurang-kurangnya 4 jam) sehingga chia seed menyerap cecair dan kembang jadi puding.",
  "Sebelum dihidang, kacau; hiaskan dengan kiub mangga dan titisan madu."
],
"tags":["halal","healthy","chia","no-cook","sahur","breakfast","easy","ramadan"],
"ingredients_detailed":[
  {"name":"chia seeds",    "name_ms":"chia seed",    "quantity":4,   "unit":"tbsp","note":""},
  {"name":"sweetened condensed milk","name_ms":"krimer manis","quantity":2,"unit":"tbsp","note":""},
  {"name":"fresh milk",    "name_ms":"fresh milk",   "quantity":1,   "unit":"cup", "note":""},
  {"name":"mango",         "name_ms":"mangga",       "quantity":None,"unit":None,  "note":"optional topping; diced"},
  {"name":"honey",         "name_ms":"madu",         "quantity":None,"unit":None,  "note":"optional topping; drizzle to taste"}
]},

# ── V56 ─────────────────────────────────────────────────────────────────────
{"video_id":"7478580043820616967","is_recipe":True,"needs_review":True,
"review_notes":"beef quantity not stated; number of wraps not stated; cook/prep times estimated; flour tortilla substituted for taco shell",
"title":"Smash Burger Tacos",
"title_ms":"Smash Burger Tacos",
"description":"Thin, crispy smashed beef patties cooked inside a folded flour tortilla — a fusion of burger and taco with cheese, sauce and lettuce.",
"description_ms":"Patty daging nipis yang dihempas dan garing dimasak di dalam tortilla yang dilipat — gabungan burger dan taco dengan cheese, sos dan salad.",
"cuisine":"Western-fusion","difficulty":"Easy","prep_time":15,"cook_time":15,"servings":4,
"ingredients":["minced beef","salt","black pepper","garlic powder","cooking oil","flour tortilla","processed cheese","mayonnaise","chilli sauce","lettuce","tomato"],
"steps":[
  "Season minced beef with salt, black pepper and garlic powder; shape into loose balls.",
  "Heat a flat griddle or pan; add a little oil.",
  "Place a ball of beef on the pan; immediately press flat with a spatula (smash) until very thin.",
  "Place a flour tortilla on top of the patty; press down.",
  "When the beef is seared on one side, flip the whole thing (tortilla side down) to toast the tortilla.",
  "Lay a slice of cheese on the beef; fold the tortilla in half.",
  "Serve with mayonnaise, chilli sauce, shredded lettuce and diced tomato."
],
"steps_ms":[
  "Perasa daging cincang dengan garam, black pepper dan garlic powder; bentuk menjadi bebola longgar.",
  "Panaskan griddle atau kuali rata; masukkan sedikit minyak.",
  "Letakkan bebola daging di atas kuali; terus hempas rata dengan pengepit (smash) sehingga sangat nipis.",
  "Letakkan tortilla di atas patty; tekan.",
  "Bila daging dah garing di satu sisi, balik kesemuanya (sisi tortilla ke bawah) untuk bakar tortilla.",
  "Letakkan sekeping cheese di atas daging; lipat tortilla jadi dua.",
  "Hidang dengan mayo, sos cili, hirisan salad dan tomato kiub."
],
"tags":["halal","beef","burger","taco","fusion","western","ramadan","easy"],
"ingredients_detailed":[
  {"name":"minced beef",    "name_ms":"daging cincang","quantity":None,"unit":None,   "note":"quantity not stated"},
  {"name":"salt",           "name_ms":"garam",         "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"black pepper",   "name_ms":"black pepper",  "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"garlic powder",  "name_ms":"garlic powder", "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"cooking oil",    "name_ms":"minyak goreng", "quantity":None,"unit":None,   "note":"a little for griddle"},
  {"name":"flour tortilla", "name_ms":"roti wrap",     "quantity":None,"unit":None,   "note":"number not stated"},
  {"name":"processed cheese","name_ms":"cheese",       "quantity":None,"unit":None,   "note":"1 slice per taco"},
  {"name":"mayonnaise",     "name_ms":"mayonis",       "quantity":None,"unit":None,   "note":"for serving"},
  {"name":"chilli sauce",   "name_ms":"sos cili",      "quantity":None,"unit":None,   "note":"for serving"},
  {"name":"lettuce",        "name_ms":"salad",         "quantity":None,"unit":None,   "note":"shredded"},
  {"name":"tomato",         "name_ms":"tomato",        "quantity":None,"unit":None,   "note":"diced"}
]},

# ── V57 ─────────────────────────────────────────────────────────────────────
{"video_id":"7608800441157061896","is_recipe":True,"needs_review":True,
"review_notes":"seafood (prawn/squid) quantity not stated; yee mee/yimi quantity not stated; cook/prep times estimated",
"title":"Cantonese Yee Mee (Hong Kong Egg Noodles in Thick Sauce)",
"title_ms":"Yimi Goreng Basah (Cantonese Yee Mee)",
"description":"Silky Hong Kong egg noodles in a cornstarch-thickened savory sauce with mixed seafood — a Cantonese restaurant classic made at home.",
"description_ms":"Mi yimi Hong Kong dalam kuah pekat berasaskan kanji dengan seafood campuran — masakan restoran Cantonese yang dibuat di rumah.",
"cuisine":"Chinese-Malaysian","difficulty":"Medium","prep_time":15,"cook_time":20,"servings":3,
"ingredients":["Hong Kong egg noodles (yee mee)","cooking oil","garlic","oyster sauce","soy sauce","dark soy sauce","white pepper","chicken stock cube","water","cornstarch","prawn","squid","egg","spring onion","sesame oil"],
"steps":[
  "Blanch yee mee noodles in boiling water for 30 seconds; drain and set aside.",
  "Sauté 4 garlic cloves in hot oil until golden.",
  "Add 2 tbsp oyster sauce, 1 tbsp soy sauce and 0.5 tbsp dark soy sauce; stir.",
  "Add white pepper, 1 chicken stock cube and 1.5 cup water; bring to a simmer.",
  "Add prawns and squid; cook until just done.",
  "Thicken with a cornstarch slurry (2 tbsp cornstarch + water) until the sauce is glossy and coats a spoon.",
  "Push the noodles to one side; crack in 1 egg and fold into the sauce.",
  "Add a drop of sesame oil; garnish with spring onion. Serve immediately."
],
"steps_ms":[
  "Celur yimi dalam air mendidih 30 saat; toskan dan ketepikan.",
  "Tumis 4 ulas bawang putih dalam minyak panas sehingga keemasan.",
  "Masukkan 2 sudu sos tiram, 1 sudu kicap dan setengah sudu kicap hitam; kacau.",
  "Masukkan white pepper, 1 kiub pati ayam dan 1 cawan setengah air; biarkan menggelegak.",
  "Masukkan udang dan sotong; masak sehingga baru masak.",
  "Pekatkan dengan bancuhan tepung jagung (2 sudu tepung jagung + air) sehingga kuah berkilat.",
  "Tolak mi ke tepi; pecahkan 1 telur dan lipat ke dalam kuah.",
  "Masukkan titisan minyak bijan; hiaskan dengan daun bawang. Hidang dengan segera."
],
"tags":["halal","noodles","cantonese","seafood","chinese","yee mee","malaysian","raya"],
"ingredients_detailed":[
  {"name":"Hong Kong egg noodles (yee mee)","name_ms":"yimi","quantity":None,"unit":None,"note":"quantity not stated"},
  {"name":"cooking oil",   "name_ms":"minyak goreng","quantity":None,"unit":None,   "note":"for sautéing"},
  {"name":"garlic",        "name_ms":"bawang putih", "quantity":4,   "unit":"clove","note":""},
  {"name":"oyster sauce",  "name_ms":"sos tiram",    "quantity":2,   "unit":"tbsp", "note":""},
  {"name":"soy sauce",     "name_ms":"kicap",        "quantity":1,   "unit":"tbsp", "note":""},
  {"name":"dark soy sauce","name_ms":"kicap pekat",  "quantity":0.5, "unit":"tbsp", "note":""},
  {"name":"white pepper",  "name_ms":"white pepper", "quantity":None,"unit":None,   "note":"to taste"},
  {"name":"chicken stock cube","name_ms":"kiub pati ayam","quantity":1,"unit":None, "note":""},
  {"name":"water",         "name_ms":"air",           "quantity":1.5, "unit":"cup",  "note":"for sauce"},
  {"name":"cornstarch",    "name_ms":"tepung jagung", "quantity":2,   "unit":"tbsp", "note":"for slurry"},
  {"name":"prawn",         "name_ms":"udang",         "quantity":None,"unit":None,   "note":"quantity not stated"},
  {"name":"squid",         "name_ms":"sotong",        "quantity":None,"unit":None,   "note":"quantity not stated"},
  {"name":"egg",           "name_ms":"telur",         "quantity":1,   "unit":None,   "note":"folded into sauce"},
  {"name":"spring onion",  "name_ms":"daun bawang",   "quantity":None,"unit":None,   "note":"for garnish"},
  {"name":"sesame oil",    "name_ms":"minyak bijan",  "quantity":None,"unit":None,   "note":"a drop for fragrance"}
]},

# ── V58 ─────────────────────────────────────────────────────────────────────
{"video_id":"7481511745421315336","is_recipe":True,"needs_review":True,
"review_notes":"2-dessert compilation; roselle jelly requires 2-hr set time; strawberry cocktail is quick-assemble; jelly powder and roselle syrup quantification not fully stated",
"title":"Roselle Lychee Jelly and Strawberry Mocktail (2-Dessert Compilation)",
"title_ms":"Jeli Ros Laici dan Strawberry Cocktail",
"description":"Two easy cold dessert drinks for Ramadan: a wobbly roselle-lychee layered jelly and a fresh strawberry mint mocktail.",
"description_ms":"Dua pencuci mulut sejuk mudah untuk Ramadan: jeli laici bunga ros berlapis yang gebu-gebu dan mocktail strawberi-pudina yang segar.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":130,"cook_time":15,"servings":6,
"ingredients":["jelly powder","roselle syrup","water","lychee","evaporated milk (liquid)","sweetened condensed milk","strawberry","mint","lime","honey","ice"],
"steps":[
  "[Jeli Ros Laici] Prepare roselle jelly: mix 1 packet jelly powder with water per packet instructions; add roselle syrup for colour and flavour. Pour into moulds; set for 2 hours.",
  "Once set, cube the jelly. Mix evaporated milk and sweetened condensed milk; stir in lychees with their syrup.",
  "Add jelly cubes; chill and serve cold.",
  "[Strawberry Mocktail] Muddle fresh strawberries and mint leaves in a glass.",
  "Add a squeeze of lime and a drizzle of honey; top with ice and sparkling water or plain water.",
  "Stir and serve."
],
"steps_ms":[
  "[Jeli Ros Laici] Sediakan jeli ros: gaul 1 paket serbuk jeli dengan air ikut arahan pakej; masukkan sirap ros untuk warna dan rasa. Tuang ke dalam acuan; biarkan set 2 jam.",
  "Bila dah set, potong kiub. Gaul susu cair dan susu pekat manis; masukkan laici bersama air laici.",
  "Masukkan kiub jeli; sejukkan dan hidang dingin.",
  "[Strawberry Mocktail] Giling strawberi segar dan daun pudina dalam gelas.",
  "Perah limau dan titiskan madu; isi dengan ais dan air berkarbonat atau air biasa.",
  "Kacau dan hidang."
],
"tags":["halal","dessert","jelly","mocktail","strawberry","ramadan","cold","easy"],
"ingredients_detailed":[
  {"name":"jelly powder",   "name_ms":"serbuk jeli",  "quantity":1,   "unit":None,   "note":"1 packet; for roselle jelly"},
  {"name":"roselle syrup",  "name_ms":"sirap ros",    "quantity":None,"unit":None,   "note":"quantity not stated; for colour/flavour in jelly"},
  {"name":"water",          "name_ms":"air",           "quantity":None,"unit":None,   "note":"per packet instructions for jelly"},
  {"name":"lychee",         "name_ms":"laici",        "quantity":1,   "unit":"can",  "note":"canned; with syrup"},
  {"name":"evaporated milk (liquid)","name_ms":"susu cair","quantity":None,"unit":None,"note":"for jelly dessert"},
  {"name":"sweetened condensed milk","name_ms":"krimer manis","quantity":None,"unit":None,"note":"for jelly dessert"},
  {"name":"strawberry",     "name_ms":"strawberi",    "quantity":None,"unit":None,   "note":"fresh; for mocktail"},
  {"name":"mint",           "name_ms":"daun pudina",  "quantity":None,"unit":None,   "note":"for mocktail"},
  {"name":"lime",           "name_ms":"limau nipis",  "quantity":None,"unit":None,   "note":"for mocktail"},
  {"name":"honey",          "name_ms":"madu",         "quantity":None,"unit":None,   "note":"for mocktail"},
  {"name":"ice",            "name_ms":"ais",          "quantity":None,"unit":None,   "note":"for mocktail"}
]},

# ── V59 ─────────────────────────────────────────────────────────────────────
{"video_id":"7608279986633510162","is_recipe":False,"needs_review":False,
"review_notes":"compilation of 5 drinks recipes — no single primary recipe; drinks are too simple to extract meaningful ingredient_detailed structures; mark as non-recipe in database",
"title":"5 Drinks for Breaking Fast (Compilation)",
"title_ms":"5 Menu Air Berbuka Puasa",
"description":"A compilation of five easy drinks for Ramadan iftar: Pink Lemonade, Avocado Milkshake, Sirap Bandung Fizz, Mango Lassi and a Dragon Fruit Slushie.",
"description_ms":"Kompilasi lima minuman berbuka Ramadan: Pink Lemonade, Avocado Milkshake, Sirap Bandung Fizz, Mango Lassi dan Dragon Fruit Slushie.",
"cuisine":"Malaysian","difficulty":"Easy","prep_time":10,"cook_time":0,"servings":5,
"ingredients":[],
"steps":[
  "[Pink Lemonade] Blend lemon juice with water, sugar syrup and a few drops of red food colouring; serve over ice.",
  "[Avocado Milkshake] Blend ripe avocado, fresh milk, sweetened condensed milk and ice until smooth.",
  "[Sirap Bandung Fizz] Mix rose syrup, evaporated milk and sparkling water over ice.",
  "[Mango Lassi] Blend mango, plain yogurt, fresh milk, honey and ice until smooth.",
  "[Dragon Fruit Slushie] Blend dragon fruit with ice, honey and a squeeze of lime until slushy."
],
"steps_ms":[
  "[Pink Lemonade] Blend jus lemon dengan air, sirap gula dan sedikit pewarna merah; hidang atas ais.",
  "[Avocado Milkshake] Blend avokado masak, susu segar, susu pekat manis dan ais sehingga licin.",
  "[Sirap Bandung Fizz] Gaul sirap ros, susu cair dan air berkarbonat atas ais.",
  "[Mango Lassi] Blend mangga, yogurt original, susu segar, madu dan ais sehingga licin.",
  "[Dragon Fruit Slushie] Blend buah naga dengan ais, madu dan perahan limau sehingga jadi slushy."
],
"tags":["halal","drinks","ramadan","iftar","compilation"],
"ingredients_detailed":[]},

]  # end RECIPES

for r in RECIPES:
    path = os.path.join(OUT, f"{r['video_id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=2)
    flag = "✓" if r["is_recipe"] else "○"
    rev  = "needs_review=true" if r.get("needs_review") else "needs_review=false"
    print(f"  {flag} {r['video_id']} | {r['title'][:60]} | {rev}")

print(f"\nWrote {len(RECIPES)} files (V41-V59).")
