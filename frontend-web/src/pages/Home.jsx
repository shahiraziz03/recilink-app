import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecipes, searchRecipes } from '../api/recipes'

// ── Difficulty badge ──────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const colors = {
    Easy: 'bg-green-500',
    Medium: 'bg-[#FF6B35]',
    Hard: 'bg-red-500',
  }
  return (
    <span className={`${colors[difficulty] || 'bg-gray-400'} text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide`}>
      {difficulty || 'N/A'}
    </span>
  )
}

// ── Recipe card ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onClick }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const tags = recipe.tags?.slice(0, 2) || []

  return (
    <div className="card group" onClick={() => onClick(recipe)}>
      {/* Image */}
      <div className="relative h-48 bg-[#fde3db] overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
        )}
        <div className="absolute bottom-3 left-3">
          <DifficultyBadge difficulty={recipe.difficulty} />
        </div>
        {recipe.source === 'user' && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#FF6B35] text-[10px] font-bold px-2 py-1 rounded-full">
            👤 Community
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[#261814] text-sm leading-snug mb-1 line-clamp-2 capitalize">
          {recipe.title}
        </h3>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <span key={tag} className="text-[#FF6B35] text-xs font-medium">#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-[#8d7168] mt-2">
          <div className="flex items-center gap-1">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{totalTime > 0 ? `${totalTime} min` : 'N/A'}</span>
          </div>
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Right panel ───────────────────────────────────────────────────────────────
function RightPanel({ recentRecipes }) {
  return (
    <aside className="w-64 flex-shrink-0 space-y-6">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#f7ddd5]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#261814] text-sm">Latest Recipes</h3>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#FF6B35" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <div className="space-y-3">
          {recentRecipes.slice(0, 4).map((recipe) => (
            <div key={recipe.id} className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-xl bg-[#fde3db] overflow-hidden flex-shrink-0">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#261814] truncate capitalize">{recipe.title}</p>
                <p className="text-[11px] text-[#8d7168]">{recipe.cuisine || 'General'}</p>
              </div>
            </div>
          ))}
          {recentRecipes.length === 0 && (
            <p className="text-xs text-[#8d7168] text-center py-2">No recipes yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#f7ddd5]">
        <h3 className="font-semibold text-[#261814] text-sm mb-3">About ReciLink</h3>
        <p className="text-xs text-[#594139] leading-relaxed">
          ReciLink uses a <span className="text-[#FF6B35] font-semibold">knowledge graph</span> to power
          personalised recipe recommendations. Every recipe you post makes the graph smarter.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-[#fff1ed] rounded-xl p-2 text-center">
            <p className="text-[#FF6B35] font-bold text-sm">{recentRecipes.length}+</p>
            <p className="text-[10px] text-[#8d7168]">Recipes</p>
          </div>
          <div className="bg-[#fff1ed] rounded-xl p-2 text-center">
            <p className="text-[#FF6B35] font-bold text-sm">Neo4j</p>
            <p className="text-[10px] text-[#8d7168]">Powered</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Filters ───────────────────────────────────────────────────────────────────
const CUISINE_FILTERS = ['All', 'Malaysian', 'Asian', 'Italian', 'American', 'Western']
const DIFFICULTY_FILTERS = ['Easy', 'Medium', 'Hard']
const LIMIT = 50

// ── Main Home page ────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()

  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCuisine, setActiveCuisine] = useState('All')
  const [activeDifficulty, setActiveDifficulty] = useState(null)

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPage(1)
    try {
      const hasFilters = searchQuery || (activeCuisine && activeCuisine !== 'All') || activeDifficulty
      let res
      if (hasFilters) {
        res = await searchRecipes({
          q: searchQuery || undefined,
          cuisine: activeCuisine !== 'All' ? activeCuisine : undefined,
          difficulty: activeDifficulty || undefined,
        })
        setHasMore(false)
      } else {
        res = await getRecipes(1, LIMIT)
        setHasMore(res.data.length === LIMIT)
      }
      setRecipes(res.data)
    } catch {
      setError('Failed to load recipes. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, activeCuisine, activeDifficulty])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await getRecipes(nextPage, LIMIT)
      setRecipes(prev => [...prev, ...res.data])
      setPage(nextPage)
      setHasMore(res.data.length === LIMIT)
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false)
    }
  }

  // Debounce search + filter changes
  useEffect(() => {
    const timer = setTimeout(fetchRecipes, 400)
    return () => clearTimeout(timer)
  }, [fetchRecipes])

  return (
    <div className="flex gap-6 p-6 max-w-screen-xl mx-auto">

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Search bar */}
        <div className="relative mb-5">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8d7168]"
            width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search recipes, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11 pr-4 py-3 shadow-sm"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {CUISINE_FILTERS.map((cuisine) => (
            <button key={cuisine}
              onClick={() => setActiveCuisine(cuisine)}
              className={`filter-chip ${activeCuisine === cuisine ? 'active' : 'inactive'}`}>
              {cuisine === 'All' ? 'All Recipes' : cuisine}
            </button>
          ))}
          <div className="w-px bg-[#e1bfb5] mx-1 flex-shrink-0" />
          {DIFFICULTY_FILTERS.map((diff) => (
            <button key={diff}
              onClick={() => setActiveDifficulty(prev => prev === diff ? null : diff)}
              className={`filter-chip ${activeDifficulty === diff ? 'active' : 'inactive'}`}>
              {diff}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#261814]">
            {searchQuery || activeCuisine !== 'All' || activeDifficulty
              ? `Results (${recipes.length})`
              : `All Recipes (${recipes.length})`}
          </h2>
          {loading && <span className="text-xs text-[#8d7168] animate-pulse">Loading...</span>}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && recipes.length === 0 && !error && (
          <div className="text-center py-20 text-[#8d7168]">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="font-semibold text-[#261814] mb-1">No recipes found</p>
            <p className="text-sm">Try a different search or filter</p>
          </div>
        )}

        {/* Recipe grid */}
        {(loading || recipes.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-48 bg-[#fde3db]" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-[#fde3db] rounded w-3/4" />
                      <div className="h-3 bg-[#fde3db] rounded w-1/2" />
                    </div>
                  </div>
                ))
              : recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe}
                    onClick={() => navigate(`/recipes/${recipe.id}`)} />
                ))
            }
          </div>
        )}

        {/* Load More */}
        {!loading && hasMore && recipes.length > 0 && (
          <div className="flex justify-center mt-8 mb-4">
            <button onClick={handleLoadMore} disabled={loadingMore}
              className="btn-outline w-auto px-8 py-3 disabled:opacity-50">
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading...
                </span>
              ) : 'Load More'}
            </button>
          </div>
        )}

      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <RightPanel recentRecipes={recipes.slice(0, 4)} />

    </div>
  )
}
