import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCommunityFeed, updateRecipePost, deleteRecipePost } from '../api/posts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

// Initials helper
function getInitials(username) {
  return username ? username.slice(0, 2).toUpperCase() : '?'
}

function avatarColor(username) {
  const colors = [
    'from-[#FF6B35] to-[#ff9a72]',
    'from-violet-400 to-purple-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-pink-400 to-rose-500',
    'from-[#FF6B35] to-[#ffb698]',
  ]
  const idx = (username?.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ tall }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse ${tall ? 'h-96' : 'h-72'}`}>
      <div className={`bg-[#fde3db] ${tall ? 'h-56' : 'h-40'}`} />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-[#fde3db] rounded-full w-3/4" />
        <div className="h-3 bg-[#fde3db] rounded-full w-1/2" />
        <div className="flex items-center gap-2 mt-3">
          <div className="w-7 h-7 rounded-full bg-[#fde3db]" />
          <div className="h-2.5 bg-[#fde3db] rounded-full w-24" />
        </div>
      </div>
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onClick }) {
  const [imgError, setImgError] = useState(false)
  const photo = post.cover_photo_url || post.recipe?.image_url
  const recipe = post.recipe
  const totalTime = (recipe?.prep_time || 0) + (recipe?.cook_time || 0)
  const tags = recipe?.tags?.slice(0, 3) || []

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group break-inside-avoid mb-4"
      onClick={() => onClick(post)}
    >
      {/* Cover photo */}
      {photo && !imgError ? (
        <div className="relative overflow-hidden">
          <img
            src={photo}
            alt={recipe?.title}
            className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ maxHeight: '320px' }}
            onError={() => setImgError(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Difficulty badge */}
          {recipe?.difficulty && (
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm backdrop-blur-sm ${
                recipe.difficulty === 'Easy' ? 'bg-emerald-500/90' :
                recipe.difficulty === 'Medium' ? 'bg-[#FF6B35]/90' : 'bg-red-500/90'
              }`}>
                {recipe.difficulty}
              </span>
            </div>
          )}

          {/* Cuisine badge */}
          {recipe?.cuisine && (
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#594139] shadow-sm">
                {recipe.cuisine}
              </span>
            </div>
          )}

          {/* Time bottom-left on image */}
          {totalTime > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
              {totalTime}m
            </div>
          )}
        </div>
      ) : (
        /* Fallback no-image card */
        <div className="h-32 bg-gradient-to-br from-[#ffe9e3] to-[#fde3db] flex items-center justify-center relative">
          <span className="text-5xl">🍽️</span>
          {recipe?.difficulty && (
            <div className="absolute top-3 left-3">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${
                recipe.difficulty === 'Easy' ? 'bg-emerald-500' :
                recipe.difficulty === 'Medium' ? 'bg-[#FF6B35]' : 'bg-red-500'
              }`}>
                {recipe.difficulty}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Recipe title */}
        <h3
          className="font-bold text-[#261814] text-sm leading-snug line-clamp-2"
          style={{ fontFamily: 'Plus Jakarta Sans' }}
        >
          {recipe?.title || 'Untitled Recipe'}
        </h3>

        {/* Caption */}
        {post.caption && (
          <p className="text-xs text-[#594139] leading-relaxed line-clamp-2">
            {post.caption}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[#FF6B35] text-[10px] font-semibold bg-[#fff1ed] px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients count */}
        {recipe?.ingredients?.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#8d7168]">
            <svg className="w-3.5 h-3.5 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {recipe.ingredients.length} ingredients
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#f7ddd5]" />

        {/* Author + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(post.posted_by?.username)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
              {getInitials(post.posted_by?.username)}
            </div>
            <span className="text-xs font-semibold text-[#594139] truncate max-w-[90px]">
              {post.posted_by?.username || 'Anonymous'}
            </span>
          </div>
          <span className="text-[10px] text-[#8d7168]">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Post detail modal ─────────────────────────────────────────────────────────

function PostModal({ post, onClose, onPostUpdated }) {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const photo = post.cover_photo_url || post.recipe?.image_url
  const recipe = post.recipe

  const isOwner = user && post.posted_by?.id === user.id

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [caption, setCaption] = useState(post.caption || '')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(post.cover_photo_url || '')
  const [title, setTitle] = useState(recipe?.title || '')
  const [cuisine, setCuisine] = useState(recipe?.cuisine || 'Malaysian')
  const [difficulty, setDifficulty] = useState(recipe?.difficulty || 'Medium')
  const [prepTime, setPrepTime] = useState(recipe?.prep_time || '')
  const [cookTime, setCookTime] = useState(recipe?.cook_time || '')
  const [servings, setServings] = useState(recipe?.servings || 4)
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.join(', ') || '')
  const [steps, setSteps] = useState(recipe?.steps?.join('\n') || '')
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !isSaving && !isDeleting) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        caption,
        cover_photo_url: coverPhotoUrl || null,
        title,
        cuisine,
        difficulty,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        servings: parseInt(servings),
        ingredients: ingredients.split(',').map(i => i.trim()).filter(Boolean),
        steps: steps.split('\n').map(s => s.trim()).filter(Boolean)
      }
      
      const updatedPost = await updateRecipePost(post.id, payload, token)
      onPostUpdated(updatedPost)
      setIsEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this recipe post? This will delete the recipe from both the social feed and the recommendation engine.')) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteRecipePost(post.id, token)
      onPostUpdated(null, post.id) // Remove from state
      onClose()
    } catch (err) {
      setError(err.message)
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Photo header */}
        {photo && !isEditing && (
          <div className="relative h-72 overflow-hidden rounded-t-3xl">
            <img src={photo} alt={recipe?.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {/* Close btn */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-[#261814]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Badges on image */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              {recipe?.difficulty && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${
                  recipe.difficulty === 'Easy' ? 'bg-emerald-500' :
                  recipe.difficulty === 'Medium' ? 'bg-[#FF6B35]' : 'bg-red-500'
                }`}>{recipe.difficulty}</span>
              )}
              {recipe?.cuisine && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/90 text-[#594139]">
                  {recipe.cuisine}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {isEditing ? (
            /* Editing form UI including full recipe updates */
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#f7ddd5] pb-3">
                <h3 className="font-bold text-[#261814] text-lg">Edit Post & Recipe Details</h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-[#8d7168] hover:text-[#261814] font-semibold">
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#594139] mb-1">Recipe Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                    className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#594139] mb-1">Cuisine</label>
                  <select value={cuisine} onChange={e => setCuisine(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]">
                    {['Malaysian', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai', 'Italian', 'Mexican', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#594139] mb-1">Prep Time (min)</label>
                  <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#594139] mb-1">Cook Time (min)</label>
                  <input type="number" value={cookTime} onChange={e => setCookTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#594139] mb-1">Servings</label>
                  <input type="number" value={servings} onChange={e => setServings(e.target.value)}
                    className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#594139] mb-1">Difficulty</label>
                <div className="flex gap-2">
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button key={d} type="button" onClick={() => setDifficulty(d)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        difficulty === d ? 'bg-[#FF6B35] text-white border-[#FF6B35]' : 'bg-[#fff8f6] text-[#594139] border-[#e1bfb5] hover:bg-[#ffe9e3]'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#594139] mb-1">Cover Photo URL</label>
                <input type="text" value={coverPhotoUrl} onChange={e => setCoverPhotoUrl(e.target.value)}
                  placeholder="https://example.com/food.jpg"
                  className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#594139] mb-1">Social Caption</label>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows="2"
                  className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#594139] mb-1">Ingredients (comma-separated, name only)</label>
                <input type="text" value={ingredients} onChange={e => setIngredients(e.target.value)}
                  placeholder="coconut milk, pandan leaves, beef"
                  className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#594139] mb-1">Steps (one step per line)</label>
                <textarea value={steps} onChange={e => setSteps(e.target.value)} rows="3"
                  placeholder="Step 1&#10;Step 2"
                  className="w-full px-3 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-sm focus:outline-none focus:border-[#FF6B35]" />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#f7ddd5]">
                <button type="submit" disabled={isSaving} className="btn-primary flex-1">
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary w-auto px-6">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Standard Modal Details View */
            <>
              {/* Title + close */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  {recipe?.title}
                </h2>
                {!photo && (
                  <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#fff1ed] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#594139]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Author + meta */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(post.posted_by?.username)} flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(post.posted_by?.username)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#261814]">{post.posted_by?.username}</p>
                    <p className="text-xs text-[#8d7168]">{timeAgo(post.created_at)}</p>
                  </div>
                </div>
                <div className="flex gap-3 ml-auto text-xs text-[#8d7168]">
                  {recipe?.prep_time && <span>⏱ {recipe.prep_time}m prep</span>}
                  {recipe?.cook_time && <span>🔥 {recipe.cook_time}m cook</span>}
                  {recipe?.servings && <span>🍽️ {recipe.servings} servings</span>}
                </div>
              </div>

              {/* Edit/Delete Owner actions bar */}
              {isOwner && (
                <div className="flex gap-2 bg-[#fff1ed] rounded-2xl p-3 border border-[#fde3db] justify-end items-center">
                  <span className="text-xs font-semibold text-[#594139] mr-auto pl-1">✨ You own this post</span>
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 bg-white hover:bg-[#ffe9e3] text-xs font-bold px-3 py-1.5 rounded-full text-[#594139] border border-[#e1bfb5] transition-colors shadow-sm">
                    <svg className="w-3.5 h-3.5 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                  <button onClick={handleDelete} disabled={isDeleting}
                    className="flex items-center gap-1 bg-[#ff4a4a]/10 hover:bg-[#ff4a4a]/20 text-xs font-bold px-3 py-1.5 rounded-full text-red-600 border border-red-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}

              {/* Caption */}
              {post.caption && (
                <div className="bg-[#fff8f6] rounded-xl p-4 border border-[#f7ddd5]">
                  <p className="text-sm text-[#594139] leading-relaxed italic">"{post.caption}"</p>
                </div>
              )}

              {/* Tags */}
              {recipe?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="text-xs font-semibold bg-[#fff1ed] text-[#FF6B35] px-3 py-1 rounded-full border border-[#fde3db]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredients */}
              <div>
                <h3 className="text-sm font-bold text-[#261814] mb-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  🥗 Ingredients ({recipe?.ingredients?.length})
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {recipe?.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#594139]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] flex-shrink-0" />
                      {ing}
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-sm font-bold text-[#261814] mb-3" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                  👨‍🍳 Steps
                </h3>
                <div className="space-y-3">
                  {recipe?.steps?.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-[#594139] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* View full recipe button */}
              <button
                onClick={() => { navigate(`/recipes/${recipe?.id}`); onClose() }}
                className="btn-primary mt-2"
              >
                View Full Recipe Page
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Community page ───────────────────────────────────────────────────────

const CUISINE_FILTERS = ['All', 'Malaysian', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai', 'Italian']

export default function Community() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCuisine, setSelectedCuisine] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedPost, setSelectedPost] = useState(null)

  useEffect(() => {
    getCommunityFeed()
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handlePostUpdated = (updatedPost, deletedPostId) => {
    if (deletedPostId) {
      setPosts(prev => prev.filter(p => p.id !== deletedPostId))
      return
    }
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
  }

  // Filter posts
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchCuisine = selectedCuisine === 'All' || p.recipe?.cuisine === selectedCuisine
      const matchSearch = !search ||
        p.recipe?.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.caption?.toLowerCase().includes(search.toLowerCase()) ||
        p.posted_by?.username?.toLowerCase().includes(search.toLowerCase())
      return matchCuisine && matchSearch
    })
  }, [posts, selectedCuisine, search])

  // Split into 2 masonry columns
  const [col1, col2] = useMemo(() => {
    const c1 = [], c2 = []
    filtered.forEach((p, i) => (i % 2 === 0 ? c1 : c2).push(p))
    return [c1, c2]
  }, [filtered])

  return (
    <div className="min-h-screen bg-[#fff8f6]">
      {/* ── Hero header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#f7ddd5] px-8 py-6 sticky top-0 z-30 shadow-sm backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Community Feed
              </h1>
              <p className="text-sm text-[#8d7168] mt-0.5">
                {loading ? 'Loading...' : `${posts.length} recipe${posts.length !== 1 ? 's' : ''} shared by the community`}
              </p>
            </div>
            <button
              id="community-post-btn"
              onClick={() => navigate('/post')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B35] to-[#ff9a72] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Share Recipe
            </button>
          </div>

          {/* Search + filters row */}
          <div className="flex flex-col gap-3">
            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d7168]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="community-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes, captions, or authors..."
                className="w-full pl-11 pr-4 py-2.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-full text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8d7168] hover:text-[#FF6B35] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Cuisine filter chips — horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CUISINE_FILTERS.map((cuisine) => (
                <button
                  key={cuisine}
                  id={`filter-${cuisine.toLowerCase()}`}
                  onClick={() => setSelectedCuisine(cuisine)}
                  className={`filter-chip flex-shrink-0 transition-all duration-200 ${
                    selectedCuisine === cuisine ? 'active' : 'inactive'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feed content ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex items-center gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-700 text-sm">Failed to load community feed</p>
              <p className="text-red-500 text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => { setError(null); setLoading(true); getCommunityFeed().then(setPosts).catch(e => setError(e.message)).finally(() => setLoading(false)) }}
              className="ml-auto text-sm font-semibold text-[#FF6B35] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-4">
            <div className="flex-1 space-y-4">
              {[1, 3, 5].map((i) => <SkeletonCard key={i} tall={i === 3} />)}
            </div>
            <div className="flex-1 space-y-4">
              {[2, 4, 6].map((i) => <SkeletonCard key={i} tall={i === 2} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#ffe9e3] flex items-center justify-center mx-auto text-4xl">
              {search || selectedCuisine !== 'All' ? '🔍' : '🍽️'}
            </div>
            <h3 className="text-lg font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {search || selectedCuisine !== 'All' ? 'No posts match your filter' : 'No posts yet'}
            </h3>
            <p className="text-sm text-[#8d7168]">
              {search || selectedCuisine !== 'All'
                ? 'Try a different cuisine or search term'
                : 'Be the first to share a recipe with the community!'}
            </p>
            {!search && selectedCuisine === 'All' && (
              <button onClick={() => navigate('/post')} className="btn-primary w-auto px-8 mx-auto">
                Share Your First Recipe
              </button>
            )}
          </div>
        )}

        {/* Masonry grid */}
        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Results count when filtering */}
            {(search || selectedCuisine !== 'All') && (
              <p className="text-sm text-[#8d7168] mb-4">
                Showing <span className="font-semibold text-[#FF6B35]">{filtered.length}</span> of {posts.length} posts
                {selectedCuisine !== 'All' && <> in <span className="font-semibold">{selectedCuisine}</span></>}
                {search && <> matching "<span className="font-semibold">{search}</span>"</>}
              </p>
            )}

            <div className="flex gap-4 items-start">
              {/* Column 1 */}
              <div className="flex-1">
                {col1.map((post) => (
                  <PostCard key={post.id} post={post} onClick={setSelectedPost} />
                ))}
              </div>
              {/* Column 2 */}
              <div className="flex-1 mt-6">
                {col2.map((post) => (
                  <PostCard key={post.id} post={post} onClick={setSelectedPost} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Post detail modal ─────────────────────────────────────── */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} onPostUpdated={handlePostUpdated} />
      )}
    </div>
  )
}
