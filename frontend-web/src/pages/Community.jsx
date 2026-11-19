import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PostCard, { getInitials, avatarColor, timeAgo } from '../components/PostCard'
import { getCommunityFeed, updateRecipePost, deleteRecipePost, getPostById, getPersonalizedPostFeed } from '../api/posts'
import { 
  getComments, 
  createComment, 
  toggleSaveRecipe, 
  isRecipeSaved, 
  getSimilarRecipes, 
  getUserProfile, 
  followUser, 
  unfollowUser,
  toggleLikePost,
  getTrendingPosts,
  getFollowingPosts
} from '../api/recipes'



// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ tall }) {
  return (
    <div className="break-inside-avoid mb-5 animate-pulse">
      <div className={`w-full rounded-2xl bg-[#fde3db] ${tall ? 'h-72' : 'h-48'}`} />
      <div className="pt-2 px-0.5 space-y-1.5">
        <div className="h-3.5 bg-[#fde3db] rounded-full w-3/4" />
        <div className="h-3 bg-[#fde3db] rounded-full w-1/2" />
      </div>
    </div>
  )
}



// ── Post detail modal ─────────────────────────────────────────────────────────

function PostModal({ post, onClose, onPostUpdated }) {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const photo = post.cover_photo_url || post.recipe?.image_url
  const isVideo = Boolean(post.video_url)
  const recipe = post.recipe

  const isOwner = user && Number(post.posted_by?.id) === Number(user.id)

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

  // Social / Interactive States
  const [isSaved, setIsSaved] = useState(false)
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [profile, setProfile] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [similar, setSimilar] = useState([])
  const [activeTab, setActiveTab] = useState('ingredients') // 'ingredients' or 'steps'

  useEffect(() => {
    setIsLiked(post.is_liked || false)
    setLikesCount(post.likes_count || 0)
  }, [post.id, post.is_liked, post.likes_count])

  const handleLikeToggle = async () => {
    if (!token) return navigate('/login')
    try {
      const res = await toggleLikePost(post.id)
      setIsLiked(res.data.liked)
      setLikesCount(res.data.likes_count)
      onPostUpdated({ ...post, is_liked: res.data.liked, likes_count: res.data.likes_count })
    } catch (err) {
      console.error("Error toggling like:", err)
    }
  }

  // Load interactive state
  useEffect(() => {
    if (recipe?.id) {
      // Check if recipe is saved
      if (token) {
        isRecipeSaved(recipe.id)
          .then(res => setIsSaved(res.data.saved))
          .catch(err => console.error("Error checking saved state:", err))
      }

      // Fetch comments
      getComments(recipe.id)
        .then(res => setComments(res.data))
        .catch(err => console.error("Error fetching comments:", err))

      // Fetch similar recipes
      getSimilarRecipes(recipe.id, 4)
        .then(res => setSimilar(res.data))
        .catch(err => console.error("Error fetching similar recipes:", err))
    }
  }, [recipe?.id, token])

  // Fetch author profile to see follow status
  useEffect(() => {
    if (post.posted_by?.id && token) {
      getUserProfile(post.posted_by.id)
        .then(res => {
          setProfile(res.data)
          setIsFollowing(res.data.is_following)
        })
        .catch(err => console.error("Error fetching user profile:", err))
    }
  }, [post.posted_by?.id, token])

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

  const handleSaveToggle = async () => {
    if (!token) return navigate('/login')
    try {
      const res = await toggleSaveRecipe(recipe.id)
      setIsSaved(res.data.saved)
    } catch (err) {
      console.error("Error toggling save:", err)
    }
  }

  const handleFollowToggle = async () => {
    if (!token) return navigate('/login')
    try {
      if (isFollowing) {
        await unfollowUser(post.posted_by.id)
        setIsFollowing(false)
        if (profile) setProfile(prev => ({ ...prev, followers_count: prev.followers_count - 1 }))
      } else {
        await followUser(post.posted_by.id)
        setIsFollowing(true)
        if (profile) setProfile(prev => ({ ...prev, followers_count: prev.followers_count + 1 }))
      }
    } catch (err) {
      console.error("Error toggling follow:", err)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!token) return navigate('/login')
    if (!newComment.trim()) return
    try {
      const res = await createComment(recipe.id, newComment.trim())
      setComments(prev => [...prev, res.data])
      setNewComment('')
    } catch (err) {
      console.error("Error submitting comment:", err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-3xl w-full max-w-[min(95vw,64rem)] max-h-[90vh] overflow-y-auto shadow-2xl my-auto animate-slide-up relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4 text-[#261814]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {error && (
          <div className="m-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Top visual detail part */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8">
          {/* Left Column: Cover Image & Badges */}
          <div className="relative flex flex-col justify-center rounded-2xl overflow-hidden bg-gray-50 max-h-[70vh] shadow-sm">
            {post.video_url ? (
              <video
                src={post.video_url}
                poster={post.cover_photo_url || undefined}
                controls
                playsInline
                muted
                className="w-full max-h-[70vh] object-contain"
              />
            ) : photo ? (
              <img 
                src={photo} 
                alt={recipe?.title} 
                className="w-full h-full object-cover rounded-2xl" 
                style={{ minHeight: '350px', maxHeight: '550px' }}
              />
            ) : (
              <div className="h-96 bg-gradient-to-br from-[#ffe9e3] to-[#fde3db] flex items-center justify-center rounded-2xl">
                <span className="text-6xl">🍽️</span>
              </div>
            )}
            
            {/* Overlay Badges */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              {recipe?.difficulty && (
                <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full text-white shadow-md backdrop-blur-sm ${
                  recipe.difficulty === 'Easy' ? 'bg-emerald-500/90' :
                  recipe.difficulty === 'Medium' ? 'bg-[#FF6B35]/90' : 'bg-red-500/90'
                }`}>{recipe.difficulty}</span>
              )}
              {recipe?.cuisine && (
                <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/95 text-[#594139] shadow-md backdrop-blur-sm">
                  {recipe.cuisine}
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Interaction Hub */}
          <div className="flex flex-col justify-between space-y-5">
            {isEditing ? (
              /* Edit Form Layout */
              <form onSubmit={handleUpdate} className="space-y-4 flex flex-col h-full justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#f7ddd5] pb-2">
                    <h3 className="font-bold text-[#261814] text-base">Edit Post & Recipe</h3>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-[#FF6B35] hover:underline font-semibold">
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Title</label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                        className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Cuisine</label>
                      <select value={cuisine} onChange={e => setCuisine(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]">
                        {['Malaysian', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai', 'Italian', 'Mexican', 'Other'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Prep (m)</label>
                      <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Cook (m)</label>
                      <input type="number" value={cookTime} onChange={e => setCookTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Servings</label>
                      <input type="number" value={servings} onChange={e => setServings(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#594139] mb-1">Difficulty</label>
                    <div className="flex gap-2">
                      {['Easy', 'Medium', 'Hard'].map(d => (
                        <button key={d} type="button" onClick={() => setDifficulty(d)}
                          className={`flex-1 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            difficulty === d ? 'bg-[#FF6B35] text-white border-[#FF6B35]' : 'bg-[#fff8f6] text-[#594139] border-[#e1bfb5] hover:bg-[#ffe9e3]'
                          }`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Image URL</label>
                    <input type="text" value={coverPhotoUrl} onChange={e => setCoverPhotoUrl(e.target.value)}
                      placeholder="https://example.com/food.jpg"
                      className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Caption</label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} rows="2"
                      className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Ingredients (comma-separated)</label>
                    <input type="text" value={ingredients} onChange={e => setIngredients(e.target.value)}
                      placeholder="rice, egg, garlic"
                      className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#594139] mb-0.5">Steps (one per line)</label>
                    <textarea value={steps} onChange={e => setSteps(e.target.value)} rows="2"
                      className="w-full px-2.5 py-1.5 bg-[#fff8f6] border border-[#e1bfb5] rounded-xl text-xs focus:outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#f7ddd5]">
                  <button type="submit" disabled={isSaving} className="btn-primary flex-1 py-2 text-xs">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary w-auto px-4 py-2 text-xs">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Interactive Pinterest-style Right Pane */
              <>
                <div className="space-y-4">
                  {/* Action Bar (Like, Save & Owner buttons) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Like Button */}
                      <button
                        onClick={handleLikeToggle}
                        className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-bold text-xs shadow-sm transition-all active:scale-95 ${
                          isLiked
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-100 text-[#594139] hover:bg-red-50 hover:text-red-500 border border-gray-200'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{isLiked ? 'Liked' : 'Like'}</span>
                        <span className="opacity-80">({likesCount})</span>
                      </button>

                      {/* Save Button */}
                      <button
                        onClick={handleSaveToggle}
                        className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-bold text-xs shadow-sm transition-all active:scale-95 ${
                          isSaved
                            ? 'bg-[#261814] text-white hover:bg-black'
                            : 'bg-[#FF6B35] text-white hover:bg-[#ff5516]'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                    </div>

                    {/* Owner Management */}
                    {isOwner && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#ffe9e3] flex items-center justify-center text-[#594139] transition-colors border border-gray-200"
                          title="Edit Recipe"
                        >
                          <svg className="w-4 h-4 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors border border-red-100"
                          title="Delete Recipe"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Creator Info and Follow Toggle */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#fff8f6] to-white p-3 rounded-2xl border border-[#ffe9e3]">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!post.posted_by?.id) return
                        const isOwn = (user?.id && Number(user.id) === Number(post.posted_by.id)) ||
                                      (user?.username && user.username === post.posted_by.username)
                        isOwn ? navigate('/profile') : navigate(`/users/${post.posted_by.id}`)
                      }}
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(post.posted_by?.username)} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                        {getInitials(post.posted_by?.username)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#261814] hover:text-[#FF6B35] transition-colors">{post.posted_by?.username || 'Anonymous'}</p>
                        <p className="text-[10px] text-[#8d7168]">
                          {profile ? `${profile.followers_count || 0} followers` : 'Contributor'}
                        </p>
                      </div>
                    </div>
                    
                    {!isOwner && (
                      <button
                        onClick={handleFollowToggle}
                        className={`text-xs font-bold px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm ${
                          isFollowing
                            ? 'bg-[#261814] text-white hover:bg-black'
                            : 'bg-[#ffe9e3] text-[#FF6B35] hover:bg-[#fde3db] border border-[#fde3db]'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {/* Title & Caption */}
                  <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-extrabold text-[#261814] leading-snug" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                      {recipe?.title}
                    </h2>
                    {post.caption && (
                      <p className="text-xs text-[#594139] leading-relaxed italic border-l-2 border-[#FF6B35] pl-2 bg-[#fffcfb] py-1">
                        "{post.caption}"
                      </p>
                    )}
                  </div>

                  {/* Recipe Stats Bar */}
                  <div className="flex gap-4 text-[11px] text-[#8d7168] bg-[#fffcfb] p-2.5 rounded-xl border border-[#fdf0ec]">
                    {recipe?.prep_time && <span>⏱️ <b>{recipe.prep_time}m</b> prep</span>}
                    {recipe?.cook_time && <span>🔥 <b>{recipe.cook_time}m</b> cook</span>}
                    {recipe?.servings && <span>🍽️ <b>{recipe.servings}</b> servings</span>}
                  </div>

                  {/* Tabs: Ingredients vs Steps */}
                  <div className="space-y-2">
                    <div className="flex border-b border-[#f7ddd5] text-xs font-semibold">
                      <button
                        onClick={() => setActiveTab('ingredients')}
                        className={`flex-1 pb-2 text-center transition-all ${
                          activeTab === 'ingredients'
                            ? 'border-b-2 border-[#FF6B35] text-[#FF6B35]'
                            : 'text-[#8d7168] hover:text-[#594139]'
                        }`}
                      >
                        Ingredients ({recipe?.ingredients?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTab('steps')}
                        className={`flex-1 pb-2 text-center transition-all ${
                          activeTab === 'steps'
                            ? 'border-b-2 border-[#FF6B35] text-[#FF6B35]'
                            : 'text-[#8d7168] hover:text-[#594139]'
                        }`}
                      >
                        Steps ({recipe?.steps?.length || 0})
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="max-h-40 overflow-y-auto pr-1 text-xs text-[#594139] space-y-1.5 scrollbar-thin">
                      {activeTab === 'ingredients' ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {recipe?.ingredients?.map((ing, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-[#fffcfb] px-2.5 py-1.5 rounded-lg border border-[#fef7f5]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                              <span>{ing}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recipe?.steps?.map((step, idx) => (
                            <div key={idx} className="flex gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#FF6B35] text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                                {idx + 1}
                              </div>
                              <p className="leading-relaxed pt-0.5">{step}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t border-[#f7ddd5] pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#261814] flex items-center gap-1.5">
                    <span>💬 Comments</span>
                    <span className="bg-[#fff1ed] text-[#FF6B35] text-[10px] px-2 py-0.5 rounded-full">
                      {comments.length}
                    </span>
                  </h4>

                  {/* Scrollable comments box */}
                  <div className="max-h-40 overflow-y-auto space-y-2.5 pr-2 scrollbar-thin">
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-[#8d7168] italic py-2">No comments yet. Start the conversation!</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2 text-xs">
                          <div className={`w-6.5 h-6.5 rounded-full bg-gradient-to-br ${avatarColor(comment.username)} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5`}>
                            {getInitials(comment.username)}
                          </div>
                          <div className="flex-1 bg-[#fffcfb] p-2 rounded-xl border border-[#fef7f5]">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <span className="font-bold text-[#261814] text-[10px]">{comment.username}</span>
                              <span className="text-[8px] text-[#8d7168]">{timeAgo(comment.created_at)}</span>
                            </div>
                            <p className="text-[#594139] leading-relaxed text-[11px]">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Form */}
                  <form onSubmit={handleCommentSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-[#fff8f6] border border-[#e1bfb5] rounded-full text-xs focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="bg-[#FF6B35] hover:bg-[#ff5516] disabled:opacity-50 disabled:hover:bg-[#FF6B35] text-white font-bold text-xs px-4 py-2 rounded-full transition-colors active:scale-95"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom "More Like This" similar recipes grid */}
        {!isEditing && similar.length > 0 && (
          <div className="border-t border-[#f7ddd5] bg-[#fffcfb] p-6 md:p-8">
            <h3 className="text-sm font-bold text-[#261814] mb-4 flex items-center gap-1.5" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              <span>✨ More Like This</span>
              <span className="text-[10px] text-[#8d7168] font-normal">(Jaccard Similarity)</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((sim) => {
                const simPhoto = sim.image_url
                const simTime = (sim.prep_time || 0) + (sim.cook_time || 0)

                return (
                  <div
                    key={sim.id}
                    onClick={() => {
                      navigate(`/recipes/${sim.id}`)
                      onClose()
                    }}
                    className="cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white border border-[#fde3db] flex flex-col group"
                  >
                    {/* Small image */}
                    <div className="h-28 w-full overflow-hidden bg-gray-100 relative">
                      {simPhoto ? (
                        <img 
                          src={simPhoto} 
                          alt={sim.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#ffe9e3] to-[#fde3db] flex items-center justify-center">
                          <span className="text-2xl">🍽️</span>
                        </div>
                      )}
                      
                      {sim.cuisine && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-[#594139] shadow-sm">
                          {sim.cuisine}
                        </span>
                      )}
                    </div>

                    {/* Small body */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <h4 className="text-[11px] font-bold text-[#261814] line-clamp-2 leading-tight group-hover:text-[#FF6B35] transition-colors mb-1.5">
                        {sim.title}
                      </h4>
                      <div className="flex justify-between items-center text-[9px] text-[#8d7168]">
                        <span className="capitalize">{sim.difficulty || 'Medium'}</span>
                        {simTime > 0 && <span>⏱️ {simTime}m</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Community page ───────────────────────────────────────────────────────

const CUISINE_FILTERS = ['All', 'Malaysian', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai', 'Italian']

export default function Community() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, token } = useAuth()
  const [feedTab, setFeedTab] = useState('explore') // 'explore' | 'trending' | 'following'
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCuisine, setSelectedCuisine] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedPost, setSelectedPost] = useState(null)
  const openedFromPageRef = useRef(false)

  const postIdParam = searchParams.get('post')

  // URL is the source of truth for opening/closing post popup
  useEffect(() => {
    if (!postIdParam) {
      setSelectedPost(null)
      openedFromPageRef.current = false
      return
    }

    if (selectedPost && String(selectedPost.id) === String(postIdParam)) {
      const foundInPosts = posts.find((p) => String(p.id) === String(postIdParam))
      if (foundInPosts && foundInPosts !== selectedPost) {
        setSelectedPost(foundInPosts)
      }
      return
    }

    const found = posts.find((p) => String(p.id) === String(postIdParam))
    if (found) {
      setSelectedPost(found)
      return
    }

    let isCancelled = false
    getPostById(postIdParam, token)
      .then((data) => {
        if (!isCancelled) {
          setSelectedPost(data)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSelectedPost(null)
          const newParams = new URLSearchParams(searchParams)
          newParams.delete('post')
          setSearchParams(newParams, { replace: true })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [postIdParam, posts, token])

  const handlePostClick = (post) => {
    openedFromPageRef.current = true
    setSelectedPost(post)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('post', String(post.id))
    setSearchParams(newParams)
  }

  const handleClosePopup = () => {
    setSelectedPost(null)
    openedFromPageRef.current = false
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/community', { replace: true })
    }
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    let fetcher
    if (feedTab === 'trending') {
      fetcher = getTrendingPosts().then(res => res.data)
    } else if (feedTab === 'following') {
      fetcher = getFollowingPosts().then(res => res.data)
    } else if (feedTab === 'foryou') {
      fetcher = getPersonalizedPostFeed(token).then(res => res.data)
    } else {
      fetcher = getCommunityFeed(token)
    }

    let cancelled = false
    fetcher
      .then((d) => {
        if (!cancelled) setPosts(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [feedTab, token])

  const handlePostUpdated = (updatedPost, deletedPostId) => {
    if (deletedPostId) {
      setPosts(prev => prev.filter(p => p.id !== deletedPostId))
      if (selectedPost && selectedPost.id === deletedPostId) {
        handleClosePopup()
      }
      return
    }
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p))
    if (selectedPost && selectedPost.id === updatedPost.id) {
      setSelectedPost(prev => ({ ...prev, ...updatedPost }))
    }
  }

  const handleLikeToggle = async (postId) => {
    if (!token) {
      navigate('/login')
      return
    }
    try {
      const res = await toggleLikePost(postId)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: res.data.liked, likes_count: res.data.likes_count }
            : p
        )
      )
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev) => ({
          ...prev,
          is_liked: res.data.liked,
          likes_count: res.data.likes_count,
        }))
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
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

  // CSS columns masonry — fluid responsive

  return (
    <div className="min-h-screen bg-[#fff8f6]">
      {/* ── Slim 2-row sticky header ───────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#fff8f6]/90 backdrop-blur-md border-b border-[#f7ddd5] py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col gap-1.5 sm:gap-2">
          {/* Row 1: Left tabs, Center search, Right post */}
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Social Feed Switcher Tabs */}
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none flex-shrink-0">
              <button
                type="button"
                onClick={() => setFeedTab('explore')}
                className={`pb-1 sm:pb-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  feedTab === 'explore'
                    ? 'text-[#261814] border-b-2 border-[#FF6B35]'
                    : 'text-[#8d7168] hover:text-[#261814] border-b-2 border-transparent'
                }`}
              >
                Explore
              </button>
              <button
                type="button"
                onClick={() => setFeedTab('trending')}
                className={`pb-1 sm:pb-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  feedTab === 'trending'
                    ? 'text-[#261814] border-b-2 border-[#FF6B35]'
                    : 'text-[#8d7168] hover:text-[#261814] border-b-2 border-transparent'
                }`}
              >
                Trending
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!token) {
                    navigate('/login')
                    return
                  }
                  setFeedTab('following')
                }}
                className={`pb-1 sm:pb-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  feedTab === 'following'
                    ? 'text-[#261814] border-b-2 border-[#FF6B35]'
                    : 'text-[#8d7168] hover:text-[#261814] border-b-2 border-transparent'
                }`}
              >
                Following
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => setFeedTab('foryou')}
                  className={`pb-1 sm:pb-1.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    feedTab === 'foryou'
                      ? 'text-[#261814] border-b-2 border-[#FF6B35]'
                      : 'text-[#8d7168] hover:text-[#261814] border-b-2 border-transparent'
                  }`}
                >
                  For You
                </button>
              )}
            </div>

            {/* Search bar — flexibly centered */}
            <div className="flex-1 max-w-xl mx-2 sm:mx-4">
              <div className="relative w-full">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d7168] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="community-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search recipes, tags..."
                  className="w-full pl-10 pr-8 py-2 bg-white border border-[#e1bfb5] text-xs sm:text-sm text-[#261814] placeholder-[#8d7168]/70 rounded-full focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15 transition-all shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d7168] hover:text-[#FF6B35] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Post button */}
            <button
              id="community-post-btn"
              type="button"
              onClick={() => navigate('/post')}
              className="flex items-center gap-1.5 bg-[#FF6B35] hover:bg-[#e55928] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Post</span>
            </button>
          </div>

          {/* Row 2: Cuisine filter chips — horizontal scroll */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-none">
            {CUISINE_FILTERS.map((cuisine) => {
              const isSelected = selectedCuisine === cuisine
              return (
                <button
                  key={cuisine}
                  id={`filter-${cuisine.toLowerCase()}`}
                  type="button"
                  onClick={() => setSelectedCuisine(cuisine)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#261814] text-white border border-[#261814]'
                      : 'bg-white text-[#594139] border border-[#e1bfb5] hover:border-[#261814]'
                  }`}
                >
                  {cuisine}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Feed content ─────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex items-center gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-700 text-sm">Failed to load community feed</p>
              <p className="text-red-500 text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => { setError(null); setLoading(true); getCommunityFeed(token).then(setPosts).catch(e => setError(e.message)).finally(() => setLoading(false)) }}
              className="ml-auto text-sm font-semibold text-[#FF6B35] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <SkeletonCard key={i} tall={i % 2 === 0} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#ffe9e3] flex items-center justify-center mx-auto text-4xl">
              {feedTab === 'foryou' ? '✨' : feedTab === 'following' ? '👥' : search || selectedCuisine !== 'All' ? '🔍' : '🍽️'}
            </div>
            <h3 className="text-lg font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              {feedTab === 'foryou'
                ? 'Save or like some recipes to get a personalised feed.'
                : feedTab === 'following'
                ? "No posts from chefs you follow yet"
                : search || selectedCuisine !== 'All'
                ? 'No posts match your filter'
                : 'No posts yet'}
            </h3>
            <p className="text-sm text-[#8d7168]">
              {feedTab === 'foryou'
                ? 'Interact with recipes across ReciLink to train your personal recommendations graph.'
                : feedTab === 'following'
                ? 'Follow more home cooks in the Explore feed to see their delicious creations here!'
                : search || selectedCuisine !== 'All'
                ? 'Try a different cuisine or search term'
                : 'Be the first to share a recipe with the community!'}
            </p>
            {!search && selectedCuisine === 'All' && feedTab !== 'foryou' && (
              <button onClick={() => navigate('/post')} className="btn-primary w-auto px-8 mx-auto">
                Share Your First Recipe
              </button>
            )}
          </div>
        )}

        {/* Masonry grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-4">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={handlePostClick}
                onLikeToggle={handleLikeToggle}
                currentUser={user}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Post detail modal ─────────────────────────────────────── */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={handleClosePopup}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  )
}
