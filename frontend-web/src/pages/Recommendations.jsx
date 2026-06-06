import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getRecommendations, searchRecipes, getPopularIngredients, searchIngredients } from '../api/recipes'

// Fallback if API fails
const FALLBACK_POPULAR = ['chicken', 'garlic', 'onion', 'egg', 'rice', 'ginger']

// ── Enrich Neo4j recipe names with PostgreSQL data (image, id) ────────────────
async function enrichRecipes(names) {
  const enriched = await Promise.all(
    names.map(async (name) => {
      try {
        const res = await searchRecipes({ q: name })
        const match = res.data?.find(
          (r) => r.title.toLowerCase().trim() === name.toLowerCase().trim()
        ) || res.data?.[0]
        return match ? { name, id: match.id, image_url: match.image_url, cuisine: match.cuisine, difficulty: match.difficulty, prep_time: match.prep_time, cook_time: match.cook_time } : { name }
      } catch {
        return { name }
      }
    })
  )
  return enriched
}

// ── Matched recipe card ────────────────────────────────────────────────────────
function RecommendCard({ recipe, score, scoreLabel, onClick }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  return (
    <div
      onClick={() => recipe.id && onClick(recipe.id)}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-[#f7ddd5] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${recipe.id ? 'cursor-pointer' : ''}`}
    >
      {/* Image */}
      <div className="relative h-40 bg-[#fde3db]">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        {/* Score badge */}
        {score !== undefined && (
          <div className="absolute top-2 right-2 bg-[#FF6B35] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
            {scoreLabel}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-[#261814] text-sm leading-snug mb-1 line-clamp-1 capitalize">
          {recipe.name}
        </h3>
        <div className="flex items-center justify-between text-xs text-[#8d7168]">
          <span>{recipe.cuisine || '—'}</span>
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {totalTime}m
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Ingredient tag ────────────────────────────────────────────────────────────
function IngredientTag({ name, onRemove }) {
  return (
    <span className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
      {name}
      <button onClick={() => onRemove(name)}
        className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors">
        ✕
      </button>
    </span>
  )
}

// ── Main Recommendations page ─────────────────────────────────────────────────
export default function Recommendations() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef(null)

  const [inputValue, setInputValue] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [popularIngredients, setPopularIngredients] = useState(FALLBACK_POPULAR)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [excludeTitle, setExcludeTitle] = useState('')
  const [autoTriggered, setAutoTriggered] = useState(false)
  
  // Autocomplete states
  const [suggestionsList, setSuggestionsList] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const autocompleteRef = useRef(null)

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestionsList])

  // Scroll selected suggestion into view when navigating with arrow keys
  useEffect(() => {
    if (selectedIndex >= 0) {
      const activeEl = document.querySelector('.autocomplete-item-active')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Fetch popular ingredients from Neo4j graph on mount
  useEffect(() => {
    getPopularIngredients()
      .then(res => {
        if (res.data?.popular_ingredients?.length > 0)
          setPopularIngredients(res.data.popular_ingredients)
      })
      .catch(() => {}) // silently fall back to default
  }, []) // { matches: [], jaccard: [] }

  // Pre-fill ingredients and auto-fetch recommendations once on load if navigated from Recipe Detail
  useEffect(() => {
    if (location.state?.ingredients?.length && !autoTriggered) {
      const preloaded = location.state.ingredients.map(i => i.toLowerCase().trim())
      setIngredients([...new Set(preloaded)])
      
      const exclude = (location.state.excludeTitle || '').toLowerCase().trim()
      setExcludeTitle(exclude)
      setAutoTriggered(true)

      const fetchPreloaded = async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await getRecommendations(preloaded)
          const { ingredient_matches, jaccard_scores } = res.data

          // Enrich both lists with PostgreSQL data (images, IDs)
          const matchNames = ingredient_matches.map(r => r.recipe)
          const jaccardNames = jaccard_scores.map(r => r.recipe)
          const allNames = [...new Set([...matchNames, ...jaccardNames])]
          const enriched = await enrichRecipes(allNames)
          const enrichMap = Object.fromEntries(enriched.map(r => [r.name, r]))

          setResults({
            matches: ingredient_matches
              .filter(r => r.recipe.toLowerCase().trim() !== exclude)
              .map(r => ({
                ...enrichMap[r.recipe],
                name: r.recipe,
                score: r.matched_ingredients,
                cuisine: enrichMap[r.recipe]?.cuisine || r.cuisine,
                difficulty: enrichMap[r.recipe]?.difficulty || r.difficulty,
              })),
            jaccard: jaccard_scores
              .filter(r => r.recipe.toLowerCase().trim() !== exclude)
              .map(r => ({
                ...enrichMap[r.recipe],
                name: r.recipe,
                score: r.jaccard_score,
                cuisine: enrichMap[r.recipe]?.cuisine || '',
                difficulty: enrichMap[r.recipe]?.difficulty || r.difficulty,
              })),
          })
        } catch (err) {
          setError('Failed to get recommendations. Make sure the backend is running.')
        } finally {
          setLoading(false)
        }
      }
      fetchPreloaded()
    }
  }, [location.state, autoTriggered])

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
        // Filter out already selected ingredients
        const filtered = (res.data.ingredients || []).filter(
          item => !ingredients.includes(item.toLowerCase())
        )
        setSuggestionsList(filtered)
      } catch (err) {
        console.error(err)
      }
    }, 150) // Short debounce to minimize requests

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
    setIngredients(prev => prev.filter(i => i !== name))
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

  const handleGetRecommendations = useCallback(async () => {
    if (ingredients.length === 0) {
      setResults(null)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await getRecommendations(ingredients)
      const { ingredient_matches, jaccard_scores } = res.data

      // Enrich both lists with PostgreSQL data (images, IDs)
      const matchNames = ingredient_matches.map(r => r.recipe)
      const jaccardNames = jaccard_scores.map(r => r.recipe)
      const allNames = [...new Set([...matchNames, ...jaccardNames])]
      const enriched = await enrichRecipes(allNames)
      const enrichMap = Object.fromEntries(enriched.map(r => [r.name, r]))

      setResults({
        matches: ingredient_matches
          .filter(r => r.recipe.toLowerCase().trim() !== excludeTitle)
          .map(r => ({
            ...enrichMap[r.recipe],
            name: r.recipe,
            score: r.matched_ingredients,
            cuisine: enrichMap[r.recipe]?.cuisine || r.cuisine,
            difficulty: enrichMap[r.recipe]?.difficulty || r.difficulty,
          })),
        jaccard: jaccard_scores
          .filter(r => r.recipe.toLowerCase().trim() !== excludeTitle)
          .map(r => ({
            ...enrichMap[r.recipe],
            name: r.recipe,
            score: r.jaccard_score,
            cuisine: enrichMap[r.recipe]?.cuisine || '',
            difficulty: enrichMap[r.recipe]?.difficulty || r.difficulty,
          })),
      })
    } catch {
      setError('Failed to get recommendations. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [ingredients, excludeTitle])

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f7ddd5] mb-6">

        {/* Title */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#261814] mb-1">
            What's in your kitchen? 🧑‍🍳
          </h1>
          <p className="text-sm text-[#8d7168]">
            Tell us what ingredients you have — our graph engine finds the best recipes for you.
          </p>
        </div>

        {/* Ingredient input */}
        <div className="mb-4 relative" ref={autocompleteRef}>
          <label className="block text-xs font-semibold text-[#594139] uppercase tracking-wider mb-2">
            Search Ingredients
          </label>
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
              placeholder="e.g. chicken, garlic, ginger... (press Enter to add)"
              className="flex-1 outline-none text-sm text-[#261814] placeholder-[#8d7168] bg-transparent"
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
                    <span className="capitalize">{suggestion}</span>
                    {idx === 0 && (
                      <span className="text-[10px] bg-[#fde3db] text-[#FF6B35] px-1.5 py-0.5 rounded font-semibold">
                        Enter
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-[#8d7168] bg-[#fff8f6] flex items-center justify-between">
                  <span>Press Enter to add "<strong>{inputValue.trim()}</strong>" as a custom tag</span>
                  <span className="text-[10px] bg-[#fde3db] text-[#FF6B35] px-1.5 py-0.5 rounded font-semibold">
                    Enter
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected tags */}
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ingredients.map(ing => (
              <IngredientTag key={ing} name={ing} onRemove={removeIngredient} />
            ))}
            <button onClick={() => setIngredients([])}
              className="text-xs text-[#8d7168] hover:text-red-500 transition-colors px-2 py-1.5">
              Clear all
            </button>
          </div>
        )}

        {/* Popular items */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#594139] uppercase tracking-wider mb-2">
            Popular Items
          </p>
          <div className="flex flex-wrap gap-2">
            {popularIngredients.map(ing => (
              <button
                key={ing}
                onClick={() => addIngredient(ing)}
                disabled={ingredients.includes(ing)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  ingredients.includes(ing)
                    ? 'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/30 opacity-50 cursor-default'
                    : 'bg-white text-[#594139] border-[#e1bfb5] hover:border-[#FF6B35] hover:text-[#FF6B35] cursor-pointer'
                }`}
              >
                {ing}
              </button>
            ))}
          </div>
        </div>

        {/* Get Recommendations button */}
        <div className="flex items-center justify-between pt-4 border-t border-[#f7ddd5]">
          <p className="text-xs text-[#8d7168]">
            {ingredients.length === 0
              ? 'Add at least 1 ingredient to get started'
              : `${ingredients.length} ingredient${ingredients.length > 1 ? 's' : ''} selected`}
          </p>
          <button
            onClick={handleGetRecommendations}
            disabled={ingredients.length === 0 || loading}
            className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55928] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-full transition-all duration-200 active:scale-95"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analysing...
              </>
            ) : (
              <>
                ✨ Get Recommendations
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {results && (
        <div className="space-y-8">

          {/* Best Matches — ingredient count */}
          {results.matches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-[#261814]">
                  🎯 Best Matches
                </h2>
                <span className="text-xs bg-[#fff1ed] text-[#FF6B35] font-semibold px-2 py-1 rounded-full">
                  {results.matches.length} recipes
                </span>
                <span className="text-xs text-[#8d7168] ml-1">— sorted by ingredient overlap</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {results.matches.map((recipe, i) => (
                  <RecommendCard
                    key={i}
                    recipe={recipe}
                    score={recipe.score}
                    scoreLabel={`${recipe.score} match${recipe.score > 1 ? 'es' : ''}`}
                    onClick={(id) => navigate(`/recipes/${id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Smart Picks — Jaccard similarity */}
          {results.jaccard.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-[#261814]">
                  🧠 Smart Picks
                </h2>
                <span className="text-xs bg-[#fff1ed] text-[#FF6B35] font-semibold px-2 py-1 rounded-full">
                  Jaccard Similarity
                </span>
                <span className="text-xs text-[#8d7168] ml-1">— powered by Neo4j knowledge graph</span>
              </div>
              <p className="text-xs text-[#8d7168] mb-4">
                These recipes share the most ingredient overlap with yours, calculated using Jaccard Similarity on our co-occurrence graph.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {results.jaccard.map((recipe, i) => (
                  <RecommendCard
                    key={i}
                    recipe={recipe}
                    score={recipe.score}
                    scoreLabel={`${Math.round(recipe.score * 100)}% match`}
                    onClick={(id) => navigate(`/recipes/${id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty result */}
          {results.matches.length === 0 && results.jaccard.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#f7ddd5]">
              <div className="text-5xl mb-3">🤔</div>
              <p className="font-semibold text-[#261814] mb-1">No matches found</p>
              <p className="text-sm text-[#8d7168]">
                Try adding more common ingredients like garlic, onion, or chicken.
              </p>
            </div>
          )}

          {/* Neo4j explanation card */}
          <div className="bg-gradient-to-r from-[#261814] to-[#3c2d28] rounded-2xl p-5 flex gap-4 items-start">
            <div className="text-2xl flex-shrink-0">🕸️</div>
            <div>
              <h3 className="text-white font-bold text-sm mb-1">How this works</h3>
              <p className="text-white/70 text-xs leading-relaxed">
                ReciLink uses a <span className="text-[#FF6B35] font-semibold">Neo4j knowledge graph</span> to map
                ingredient co-occurrences across all recipes. When you submit your ingredients, we use{' '}
                <span className="text-[#FF6B35] font-semibold">Jaccard Similarity</span> to find
                recipes that share the most overlap with what you have — and every community recipe posted makes the graph smarter.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── Empty state (before first search) ────────────────────────────── */}
      {!results && !loading && (
        <div className="text-center py-16 text-[#8d7168]">
          <div className="text-6xl mb-4">🧑‍🍳</div>
          <p className="font-semibold text-[#261814] mb-1">Add ingredients above to get started</p>
          <p className="text-sm">Our graph engine will find the best recipes for what you have</p>
        </div>
      )}

    </div>
  )
}
