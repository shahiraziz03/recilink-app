import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecipeById } from '../api/recipes'

// ── Difficulty badge ──────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const colors = {
    Easy: 'bg-green-100 text-green-700 border-green-200',
    Medium: 'bg-orange-100 text-[#FF6B35] border-orange-200',
    Hard: 'bg-red-100 text-red-600 border-red-200',
  }
  return (
    <span className={`${colors[difficulty] || 'bg-gray-100 text-gray-600 border-gray-200'} border text-xs font-semibold px-3 py-1.5 rounded-full`}>
      {difficulty || 'N/A'}
    </span>
  )
}

// ── Meta pill ─────────────────────────────────────────────────────────────────
function MetaPill({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center bg-[#fff1ed] rounded-2xl px-5 py-3 min-w-[80px]">
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-[#FF6B35] font-bold text-sm">{value}</span>
      <span className="text-[#8d7168] text-[11px]">{label}</span>
    </div>
  )
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRecipe = async () => {
      setLoading(true)
      try {
        const res = await getRecipeById(id)
        setRecipe(res.data)
      } catch {
        setError('Recipe not found.')
      } finally {
        setLoading(false)
      }
    }
    fetchRecipe()
  }, [id])

  const handleGrocerySuggestions = () => {
    // Pass ingredients to grocery page via state
    navigate('/grocery', { state: { ingredients: recipe.ingredients } })
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-6 animate-pulse">
        <div className="h-72 bg-[#fde3db] rounded-3xl mb-6" />
        <div className="h-8 bg-[#fde3db] rounded w-1/2 mb-3" />
        <div className="h-4 bg-[#fde3db] rounded w-1/3 mb-6" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-[#fde3db] rounded-2xl" />
          <div className="h-64 bg-[#fde3db] rounded-2xl" />
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error || !recipe) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-[#261814] mb-2">Recipe Not Found</h2>
        <p className="text-[#8d7168] mb-6">This recipe may have been removed or doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn-primary w-auto px-6">
          Back to Home
        </button>
      </div>
    )
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#8d7168] hover:text-[#FF6B35] transition-colors mb-5 text-sm font-medium group"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          className="group-hover:-translate-x-0.5 transition-transform">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Recipes
      </button>

      {/* ── Hero image ───────────────────────────────────────────────────── */}
      <div className="relative w-full h-72 md:h-96 rounded-3xl overflow-hidden mb-8 bg-[#fde3db] shadow-sm">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🍽️</div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Source badge */}
        <div className="absolute top-4 left-4">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${
            recipe.source === 'user'
              ? 'bg-[#FF6B35]/90 text-white'
              : 'bg-white/90 text-[#594139]'
          }`}>
            {recipe.source === 'user' ? '👤 Community Recipe' : '📦 Curated Recipe'}
          </span>
        </div>
      </div>

      {/* ── Title + meta ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#261814] mb-3 leading-tight capitalize">
          {recipe.title}
        </h1>

        {/* Cuisine + Difficulty chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {recipe.cuisine && (
            <span className="flex items-center gap-1 bg-[#fff1ed] text-[#FF6B35] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#fde3db]">
              🌍 {recipe.cuisine}
            </span>
          )}
          <DifficultyBadge difficulty={recipe.difficulty} />
          {recipe.tags?.map((tag) => (
            <span key={tag} className="text-[#8d7168] text-xs font-medium">#{tag}</span>
          ))}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-[#594139] text-sm leading-relaxed mb-5">
            {recipe.description}
          </p>
        )}

        {/* Meta pills */}
        <div className="flex gap-3 flex-wrap">
          {recipe.prep_time > 0 && (
            <MetaPill icon="🔪" label="Prep" value={`${recipe.prep_time}m`} />
          )}
          {recipe.cook_time > 0 && (
            <MetaPill icon="🔥" label="Cook" value={`${recipe.cook_time}m`} />
          )}
          {totalTime > 0 && (
            <MetaPill icon="⏱️" label="Total" value={`${totalTime}m`} />
          )}
          {recipe.servings && (
            <MetaPill icon="🍽️" label="Serves" value={recipe.servings} />
          )}
        </div>
      </div>

      {/* ── Two column: Ingredients + Steps ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Ingredients */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f7ddd5]">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🧺</span>
            <h2 className="text-base font-bold text-[#261814]">Ingredients</h2>
            <span className="ml-auto text-xs text-[#8d7168] bg-[#fff1ed] px-2 py-1 rounded-full">
              {recipe.ingredients?.length || 0} items
            </span>
          </div>
          <ul className="space-y-3">
            {recipe.ingredients?.map((ingredient, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-[#261814] py-2 border-b border-[#f7ddd5] last:border-0">
                <span className="w-5 h-5 rounded-full bg-[#fff1ed] flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />
                </span>
                <span className="capitalize">{ingredient}</span>
              </li>
            ))}
          </ul>

          {/* Grocery button */}
          <button
            onClick={handleGrocerySuggestions}
            className="mt-5 w-full flex items-center justify-center gap-2 border border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white font-semibold text-sm py-2.5 rounded-xl transition-all duration-200"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Get Grocery Suggestions
          </button>
        </div>

        {/* Cooking steps */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#f7ddd5]">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🍳</span>
            <h2 className="text-base font-bold text-[#261814]">Cooking Instructions</h2>
          </div>
          <ol className="space-y-5">
            {recipe.steps?.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-7 h-7 rounded-full bg-[#FF6B35] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  {i + 1}
                </span>
                <p className="text-sm text-[#594139] leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>

      {/* ── Get AI Recommendations ───────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8c5a] rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-white font-bold text-base mb-1">
            Like this recipe? Find similar ones!
          </h3>
          <p className="text-white/80 text-sm">
            Our graph-based engine finds recipes that share the same ingredients.
          </p>
        </div>
        <button
          onClick={() => navigate('/recommendations', { state: { ingredients: recipe.ingredients, excludeTitle: recipe.title } })}
          className="bg-white text-[#FF6B35] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#fff1ed] transition-colors flex-shrink-0 ml-4"
        >
          ✨ Get Recommendations
        </button>
      </div>

    </div>
  )
}
