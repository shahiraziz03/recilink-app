import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getGrocerySuggestions, searchIngredients, matchRecipes } from '../api/recipes'

// Quick Add Categories definition (Localized for Malaysian Kitchens)
const QUICK_ADD_CATEGORIES = [
  { label: 'Aromatics', emoji: '🌶️', items: ['garlic', 'onion', 'shallot', 'ginger', 'lemongrass', 'chili padi', 'pandan leaf', 'cucumber', 'lime', 'curry leaf'] },
  { label: 'Proteins',   emoji: '🥩', items: ['chicken', 'beef', 'egg', 'ikan bilis', 'tofu', 'tempeh', 'prawn', 'sardine'] },
  { label: 'Dairy',      emoji: '🥛', items: ['milk', 'butter', 'cheese', 'cheddar', 'santan', 'coconut milk', 'condensed milk'] },
  { label: 'Grains',     emoji: '🌾', items: ['rice', 'pasta', 'noodles', 'bread', 'flour', 'vermicelli'] },
  { label: 'Pantry',     emoji: '🫙', items: ['soy sauce', 'kicap manis', 'oyster sauce', 'chilli sauce', 'curry powder', 'tamarind', 'belacan', 'sugar', 'salt'] },
]

// ── Ingredient tag chip ───────────────────────────────────────────────────────
function IngredientTag({ name, onRemove }) {
  return (
    <span className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-xs font-semibold px-2.5 py-1 rounded-full capitalize shadow-sm">
      {name}
      <button
        onClick={() => onRemove(name)}
        className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
      >
        ✕
      </button>
    </span>
  )
}

// ── Suggestion item ───────────────────────────────────────────────────────────
function SuggestionItem({ ingredient, frequency, maxFrequency, index, isChecked, onToggle, suggestedFor, unlockedCount }) {
  const barWidth = Math.max(10, Math.round((frequency / maxFrequency) * 100))
  const confidenceLabel =
    barWidth >= 70 ? 'High' : barWidth >= 40 ? 'Medium' : 'Low'
  const confidenceColor =
    barWidth >= 70 ? 'text-green-600 font-semibold' : barWidth >= 40 ? 'text-[#FF6B35] font-semibold' : 'text-gray-400'

  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group
        ${isChecked
          ? 'bg-[#fff1ed] border-[#FF6B35]/40'
          : 'bg-white border-[#f7ddd5] hover:border-[#FF6B35]/30 hover:bg-[#fff8f6]'
        }`}
    >
      <span className="w-5 h-5 rounded-full bg-[#fde3db] text-[#FF6B35] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-semibold capitalize ${isChecked ? 'line-through text-[#8d7168]' : 'text-[#261814]'}`}>
            {ingredient}
          </span>
          <span className={`text-[10px] ${confidenceColor}`}>
            {confidenceLabel} Match
          </span>
        </div>

        {unlockedCount > 0 && !isChecked ? (
          <div className="text-[9px] text-green-600 mb-1.5 flex items-center gap-1 font-bold bg-green-50 px-1.5 py-0.5 rounded w-fit">
            🔑 Unlocks {unlockedCount} recipe{unlockedCount > 1 ? 's' : ''} {suggestedFor && `(${suggestedFor})`}
          </div>
        ) : suggestedFor && !isChecked ? (
          <div className="text-[9px] text-[#FF6B35] mb-1.5 flex items-center gap-1 font-semibold bg-[#fff1ed] px-1.5 py-0.5 rounded w-fit capitalize">
            💡 Need for: <span className="underline">{suggestedFor}</span>
          </div>
        ) : null}

        <div className="h-1 bg-[#fde3db] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B35] to-[#ff8c5a] rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
        isChecked ? 'bg-[#FF6B35] border-[#FF6B35]' : 'border-[#e1bfb5] group-hover:border-[#FF6B35]'
      }`}>
        {isChecked && (
          <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
    </div>
  )
}

// ── Main Grocery page ─────────────────────────────────────────────────────────
export default function Grocery() {
  const location = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [inputValue, setInputValue] = useState('')
  const [ingredients, setIngredients] = useState(() => {
    const saved = localStorage.getItem('recilink_pantry_ingredients')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [pantryMatches, setPantryMatches] = useState([])
  
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem('recilink_shopping_list')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  const [activeCategoryTab, setActiveCategoryTab] = useState(QUICK_ADD_CATEGORIES[0].label)
  const [autoTriggered, setAutoTriggered] = useState(false)

  // Autocomplete states
  const [suggestionsList, setSuggestionsList] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const autocompleteRef = useRef(null)

  // Save ingredients to local storage
  useEffect(() => {
    localStorage.setItem('recilink_pantry_ingredients', JSON.stringify(ingredients))
  }, [ingredients])

  // Save shopping list to local storage
  useEffect(() => {
    localStorage.setItem('recilink_shopping_list', JSON.stringify([...checkedItems]))
  }, [checkedItems])

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestionsList])

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const activeEl = document.querySelector('.autocomplete-item-active')
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Pre-fill + auto-trigger if navigated from Recipe Detail
  useEffect(() => {
    if (location.state?.ingredients?.length && !autoTriggered) {
      const preloaded = location.state.ingredients.map(i => i.toLowerCase().trim())
      setIngredients([...new Set(preloaded)])
      setAutoTriggered(true)
    }
  }, [])

  // Auto-trigger suggestions when ingredients are loaded/pre-filled
  useEffect(() => {
    if (ingredients.length > 0 && suggestions.length === 0) {
      handleGetSuggestions(ingredients)
    }
  }, [ingredients])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch autocomplete suggestions as the user types
  useEffect(() => {
    const cleaned = inputValue.trim()
    if (!cleaned) {
      setSuggestionsList([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await searchIngredients(cleaned)
        const filtered = (res.data.ingredients || []).filter(
          item => !ingredients.includes(item.toLowerCase())
        )
        setSuggestionsList(filtered)
      } catch (err) {
        console.error(err)
      }
    }, 150)

    return () => clearTimeout(delayDebounce)
  }, [inputValue, ingredients])

  const addIngredient = (name) => {
    const cleaned = name.toLowerCase().trim()
    if (!cleaned) return
    setIngredients(prev => prev.includes(cleaned) ? prev : [...prev, cleaned])
    setInputValue('')
    setSuggestionsList([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeIngredient = (name) => {
    setIngredients(prev => {
      const next = prev.filter(i => i !== name)
      if (next.length === 0) {
        setSuggestions([])
        setPantryMatches([])
      } else {
        handleGetSuggestions(next)
      }
      return next
    })
  }

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestionsList.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % suggestionsList.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev <= 0 ? suggestionsList.length - 1 : prev - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const selected = selectedIndex >= 0 ? suggestionsList[selectedIndex] : suggestionsList[0]
        addIngredient(selected)
        return
      }
    }
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault()
      addIngredient(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && ingredients.length > 0) {
      removeIngredient(ingredients[ingredients.length - 1])
    }
  }

  const handleGetSuggestions = async (ings = ingredients) => {
    if (ings.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const [grocRes, matchRes] = await Promise.all([
        getGrocerySuggestions(ings),
        matchRecipes(ings)
      ])
      setSuggestions(grocRes.data.suggestions || [])
      setPantryMatches(matchRes.data || [])
    } catch {
      setError('Failed to get suggestions. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (name) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const clearAllLists = () => {
    setIngredients([])
    setSuggestions([])
    setPantryMatches([])
    setCheckedItems(new Set())
    localStorage.removeItem('recilink_pantry_ingredients')
    localStorage.removeItem('recilink_shopping_list')
  }

  const maxFrequency = suggestions.length > 0
    ? Math.max(...suggestions.map(s => s.total_frequency))
    : 1

  const checkedCount = checkedItems.size

  const activeCategory = QUICK_ADD_CATEGORIES.find(c => c.label === activeCategoryTab)

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#261814] mb-1">
          Pantry & Groceries 🛒
        </h1>
        <p className="text-sm text-[#8d7168]">
          Manage what you have at home, see pairing suggestions, and build your store shopping list.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── 2-Column Responsive Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Input, Tags, Quick Add (Spans 5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Manage Pantry Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f7ddd5]">
            <h2 className="text-sm font-bold text-[#261814] mb-3 flex items-center gap-1.5">
              <span>🏠</span> My Pantry Ingredients
            </h2>

            {/* Input */}
            <div className="relative mb-4" ref={autocompleteRef}>
              <div className="flex items-center gap-2 border border-[#e1bfb5] rounded-xl px-4 py-2.5 bg-white focus-within:border-[#FF6B35] focus-within:ring-2 focus-within:ring-[#FF6B35]/20 transition-all">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8d7168" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type an ingredient..."
                  className="flex-1 outline-none text-xs text-[#261814] placeholder-[#8d7168] bg-transparent"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && inputValue.trim() && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e1bfb5] rounded-xl shadow-lg z-50 overflow-y-auto max-h-60">
                  {suggestionsList.length > 0 ? (
                    suggestionsList.map((suggestion, idx) => (
                      <button
                        key={suggestion}
                        onClick={() => addIngredient(suggestion)}
                        className={`w-full text-left px-4 py-2 text-sm border-b border-[#f7ddd5] last:border-0 transition-colors flex items-center justify-between ${
                          idx === selectedIndex
                            ? 'bg-[#fff1ed] text-[#FF6B35] font-semibold autocomplete-item-active'
                            : 'text-[#261814] hover:bg-[#fff1ed] hover:text-[#FF6B35]'
                        } ${idx === 0 && selectedIndex === -1 ? 'bg-[#fff8f6]' : ''}`}
                      >
                        <span className="capitalize text-xs">{suggestion}</span>
                        {idx === 0 && (
                          <span className="text-[9px] bg-[#fde3db] text-[#FF6B35] px-1.5 py-0.5 rounded font-semibold">
                            Enter
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-[11px] text-[#8d7168] bg-[#fff8f6] flex items-center justify-between">
                      <span>Press Enter to add "<strong>{inputValue.trim()}</strong>"</span>
                      <span className="text-[9px] bg-[#fde3db] text-[#FF6B35] px-1.5 py-0.5 rounded font-semibold">
                        Enter
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tags display */}
            {ingredients.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4 max-h-40 overflow-y-auto pr-1">
                {ingredients.map(ing => (
                  <IngredientTag key={ing} name={ing} onRemove={removeIngredient} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#8d7168] italic mb-4">Your pantry is empty. Use the Quick Add or search bar below to add ingredients.</p>
            )}

            {ingredients.length > 0 && (
              <button
                onClick={clearAllLists}
                className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                🗑️ Clear All Lists
              </button>
            )}
          </div>

          {/* Quick Add presets Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f7ddd5]">
            <h2 className="text-sm font-bold text-[#261814] mb-3 flex items-center gap-1.5">
              <span>⚡</span> Quick Add Ingredients
            </h2>

            {/* Category tabs */}
            <div className="flex gap-1.5 border-b border-[#f7ddd5] pb-2 mb-3 overflow-x-auto">
              {QUICK_ADD_CATEGORIES.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategoryTab(cat.label)}
                  className={`text-[11px] font-bold pb-1 px-1 border-b-2 whitespace-nowrap transition-colors ${
                    activeCategoryTab === cat.label
                      ? 'border-[#FF6B35] text-[#FF6B35]'
                      : 'border-transparent text-[#8d7168] hover:text-[#261814]'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Category Items list */}
            {activeCategory && (
              <div className="grid grid-cols-3 gap-1.5">
                {activeCategory.items.map(item => {
                  const isAdded = ingredients.includes(item)
                  return (
                    <button
                      key={item}
                      onClick={() => isAdded ? removeIngredient(item) : addIngredient(item)}
                      className={`text-[11px] py-1.5 px-2 rounded-xl text-center border transition-all truncate capitalize ${
                        isAdded
                          ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-semibold shadow-sm'
                          : 'bg-[#fff8f6] text-[#594139] border-[#f7ddd5] hover:border-[#FF6B35] hover:text-[#FF6B35]'
                      }`}
                    >
                      {isAdded && '✓ '}
                      {item}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Suggested list & Pantry matches (Spans 7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {ingredients.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-[#f7ddd5] text-center flex flex-col items-center justify-center">
              <span className="text-5xl mb-3">🍳</span>
              <h3 className="font-bold text-[#261814] mb-1">Pantry is empty</h3>
              <p className="text-xs text-[#8d7168] max-w-sm">
                Add ingredients you already have in stock. The graph engine will suggest matching shopping list additions and recipes!
              </p>
            </div>
          ) : (
            <>
              {/* Shopping List checklist suggestions */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f7ddd5] space-y-4">
                <div className="flex items-center justify-between border-b border-[#f7ddd5] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#261814]">
                      🛒 Smart Grocery Suggestions
                    </h2>
                    <p className="text-[11px] text-[#8d7168]">
                      Common pairs you might need — tick to add to your shopping checklist.
                    </p>
                  </div>
                  {checkedCount > 0 && (
                    <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-2 py-1 rounded-full">
                      🛍️ {checkedCount} Items
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center text-[#8d7168] text-xs gap-2">
                    <svg className="animate-spin w-5 h-5 text-[#FF6B35]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Analysing graph database...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {suggestions.map((item, i) => {
                      // Find if this suggestion is missing in any of the pantry recipes
                      const matchingRecipes = pantryMatches.filter(recipe =>
                        recipe.missing_ingredients.some(ing => ing.toLowerCase().trim() === item.suggested_ingredient.toLowerCase().trim())
                      )
                      const suggestedForRecipe = matchingRecipes[0] ? matchingRecipes[0].title : null
                      
                      // Calculate how many recipes this ingredient would UNLOCK (missing_count === 1)
                      const unlockedRecipes = matchingRecipes.filter(recipe => recipe.missing_count === 1)

                      return (
                        <SuggestionItem
                          key={item.suggested_ingredient}
                          ingredient={item.suggested_ingredient}
                          frequency={item.total_frequency}
                          maxFrequency={maxFrequency}
                          index={i}
                          isChecked={checkedItems.has(item.suggested_ingredient)}
                          onToggle={() => toggleItem(item.suggested_ingredient)}
                          suggestedFor={suggestedForRecipe}
                          unlockedCount={unlockedRecipes.length}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[11px] text-[#8d7168]">
                    No grocery pairing suggestions found yet.
                  </div>
                )}

                {/* Checked items list display */}
                {checkedCount > 0 && (
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-3.5 mt-2">
                    <h3 className="text-xs font-bold text-green-800 mb-2">
                      📋 My Active Shopping List
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {[...checkedItems].map(item => (
                        <span key={item} className="bg-white border border-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize shadow-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pantry Recipes Suggestions list */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f7ddd5] space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[#261814]">
                    🥘 Recipes You Can Almost Cook
                  </h2>
                  <p className="text-[11px] text-[#8d7168]">
                    You are missing only 1 to 3 ingredients for these dishes.
                  </p>
                </div>

                {loading ? (
                  <div className="py-6 text-center text-[#8d7168] text-xs">
                    Searching Postgres...
                  </div>
                ) : pantryMatches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pantryMatches.map((recipe) => (
                      <div
                        key={recipe.id}
                        onClick={() => navigate(`/recipes/${recipe.id}`)}
                        className="bg-white rounded-xl overflow-hidden border border-[#f7ddd5] transition-all duration-300 hover:shadow-md cursor-pointer flex"
                      >
                        <div className="w-16 h-16 bg-[#fde3db] flex-shrink-0">
                          {recipe.image_url ? (
                            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                          )}
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between min-w-0">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#261814] text-[11px] leading-snug line-clamp-1 capitalize">
                              {recipe.title}
                            </h3>
                            <span className="text-[9px] text-[#ff6a35] font-semibold">
                              Missing {recipe.missing_count} item{recipe.missing_count > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1 truncate">
                            {recipe.missing_ingredients.slice(0, 2).map((ing, idx) => (
                              <span key={idx} className="bg-red-50 text-red-600 border border-red-100 rounded text-[8px] px-1.5 py-0.5 font-semibold capitalize">
                                -{ing}
                              </span>
                            ))}
                            {recipe.missing_ingredients.length > 2 && (
                              <span className="text-[7px] text-[#8d7168] self-center">
                                +{recipe.missing_ingredients.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[11px] text-[#8d7168]">
                    No recipe suggestions missing only 1-3 ingredients. Try adding more stock.
                  </div>
                )}
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  )
}
