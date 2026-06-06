import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getGrocerySuggestions, searchIngredients } from '../api/recipes'

// ── Ingredient tag chip ───────────────────────────────────────────────────────
function IngredientTag({ name, onRemove }) {
  return (
    <span className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
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
function SuggestionItem({ ingredient, frequency, maxFrequency, index, isChecked, onToggle }) {
  const barWidth = Math.max(10, Math.round((frequency / maxFrequency) * 100))
  const confidenceLabel =
    barWidth >= 70 ? 'High' : barWidth >= 40 ? 'Medium' : 'Low'
  const confidenceColor =
    barWidth >= 70 ? 'text-green-600' : barWidth >= 40 ? 'text-[#FF6B35]' : 'text-gray-400'

  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 group
        ${isChecked
          ? 'bg-[#fff1ed] border-[#FF6B35]/40'
          : 'bg-white border-[#f7ddd5] hover:border-[#FF6B35]/30 hover:bg-[#fff8f6]'
        }`}
    >
      {/* Index number */}
      <span className="w-6 h-6 rounded-full bg-[#fde3db] text-[#FF6B35] text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Ingredient name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-semibold capitalize ${isChecked ? 'line-through text-[#8d7168]' : 'text-[#261814]'}`}>
            {ingredient}
          </span>
          <span className={`text-[11px] font-semibold ${confidenceColor}`}>
            {confidenceLabel} match
          </span>
        </div>
        {/* Frequency bar */}
        <div className="h-1.5 bg-[#fde3db] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B35] to-[#ff8c5a] rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Checkbox */}
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        isChecked ? 'bg-[#FF6B35] border-[#FF6B35]' : 'border-[#e1bfb5] group-hover:border-[#FF6B35]'
      }`}>
        {isChecked && (
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
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
  const inputRef = useRef(null)

  const [inputValue, setInputValue] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [checkedItems, setCheckedItems] = useState(new Set())
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

  // Pre-fill + auto-trigger if navigated from Recipe Detail
  useEffect(() => {
    if (location.state?.ingredients?.length && !autoTriggered) {
      const preloaded = location.state.ingredients.map(i => i.toLowerCase().trim())
      setIngredients([...new Set(preloaded)])
      setAutoTriggered(true)
    }
  }, [])

  // Auto-trigger suggestions when ingredients are pre-filled from navigation
  useEffect(() => {
    if (autoTriggered && ingredients.length > 0 && suggestions.length === 0) {
      handleGetSuggestions(ingredients)
    }
  }, [autoTriggered, ingredients])

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
    setSuggestions([])
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
    setCheckedItems(new Set())
    try {
      const res = await getGrocerySuggestions(ings)
      setSuggestions(res.data.suggestions || [])
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

  const maxFrequency = suggestions.length > 0
    ? Math.max(...suggestions.map(s => s.total_frequency))
    : 1

  const checkedCount = checkedItems.size

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#261814] mb-1">
          Grocery Suggestions 🛒
        </h1>
        <p className="text-sm text-[#8d7168]">
          Tell us what you already have — we'll suggest what to buy next based on ingredient co-occurrence patterns.
        </p>
      </div>

      {/* ── Input card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f7ddd5] mb-6">
        <label className="block text-xs font-semibold text-[#594139] uppercase tracking-wider mb-2">
          What do you already have?
        </label>

        {/* Input */}
        <div className="relative mb-3" ref={autocompleteRef}>
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
              placeholder="e.g. chicken, garlic... (press Enter to add)"
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

        {/* Tags */}
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ingredients.map(ing => (
              <IngredientTag key={ing} name={ing} onRemove={removeIngredient} />
            ))}
            <button
              onClick={() => { setIngredients([]); setSuggestions([]) }}
              className="text-xs text-[#8d7168] hover:text-red-500 transition-colors px-2 py-1.5"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#f7ddd5]">
          <p className="text-xs text-[#8d7168]">
            {ingredients.length === 0
              ? 'Add ingredients you already have'
              : `${ingredients.length} ingredient${ingredients.length > 1 ? 's' : ''} added`}
          </p>
          <button
            onClick={() => handleGetSuggestions()}
            disabled={ingredients.length === 0 || loading}
            className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55928] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analysing graph...
              </>
            ) : '🛒 Get Suggestions'}
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
      {suggestions.length > 0 && (
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#261814]">
                Suggested Ingredients to Buy
              </h2>
              <p className="text-xs text-[#8d7168] mt-0.5">
                Based on co-occurrence patterns in our recipe graph • tap to mark as got it
              </p>
            </div>
            {checkedCount > 0 && (
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1.5 rounded-full">
                ✓ {checkedCount} item{checkedCount > 1 ? 's' : ''} added
              </span>
            )}
          </div>

          {/* Suggestion list */}
          <div className="space-y-2">
            {suggestions.map((item, i) => (
              <SuggestionItem
                key={item.suggested_ingredient}
                ingredient={item.suggested_ingredient}
                frequency={item.total_frequency}
                maxFrequency={maxFrequency}
                index={i}
                isChecked={checkedItems.has(item.suggested_ingredient)}
                onToggle={() => toggleItem(item.suggested_ingredient)}
              />
            ))}
          </div>

          {/* Shopping summary */}
          {checkedCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-green-800 mb-2">
                🛍️ Your Shopping List ({checkedCount} item{checkedCount > 1 ? 's' : ''})
              </h3>
              <div className="flex flex-wrap gap-2">
                {[...checkedItems].map(item => (
                  <span key={item} className="bg-white border border-green-200 text-green-700 text-xs font-medium px-3 py-1 rounded-full capitalize">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Neo4j explanation */}
          <div className="bg-gradient-to-r from-[#261814] to-[#3c2d28] rounded-2xl p-5 flex gap-4 items-start">
            <div className="text-2xl flex-shrink-0">🕸️</div>
            <div>
              <h3 className="text-white font-bold text-sm mb-1">How suggestions are generated</h3>
              <p className="text-white/70 text-xs leading-relaxed">
                Suggestions come from <span className="text-[#FF6B35] font-semibold">CO_OCCURS</span> relationships
                in our Neo4j graph. Ingredients that frequently appear together in recipes get a higher match score.
                The <span className="text-[#FF6B35] font-semibold">bar length</span> shows relative co-occurrence
                frequency — longer means more recipes pair these ingredients together.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ── No results ───────────────────────────────────────────────────── */}
      {!loading && suggestions.length === 0 && ingredients.length > 0 && !error && (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#f7ddd5]">
          <div className="text-4xl mb-3">🤔</div>
          <p className="font-semibold text-[#261814] mb-1">No suggestions found</p>
          <p className="text-sm text-[#8d7168]">
            These ingredients may not have enough co-occurrence data yet.
            Try more common ingredients like garlic, onion, or chicken.
          </p>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && ingredients.length === 0 && (
        <div className="text-center py-16 text-[#8d7168]">
          <div className="text-6xl mb-4">🛒</div>
          <p className="font-semibold text-[#261814] mb-1">Start by adding what you have</p>
          <p className="text-sm">We'll suggest what to grab from the store to complete your recipes</p>
        </div>
      )}

    </div>
  )
}
