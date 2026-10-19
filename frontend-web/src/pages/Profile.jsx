import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  getMyProfile, 
  updateMyProfile, 
  getStreak, 
  dailyCheckin, 
  getUserRecipes,
  getSavedRecipes
} from '../api/recipes'

const DIETARY_OPTIONS = [
  'Halal',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Nut-Free'
]

function getInitials(username) {
  return username ? username.slice(0, 2).toUpperCase() : '?'
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, token } = useAuth()

  // Profile data states
  const [profile, setProfile] = useState(null)
  const [streakInfo, setStreakInfo] = useState(null)
  const [myRecipes, setMyRecipes] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [activeSubTab, setActiveSubTab] = useState('saved')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Configuration Modal state
  const [showSettings, setShowSettings] = useState(false)
  const [bio, setBio] = useState('')
  const [dietary, setDietary] = useState([])
  const [newIngredient, setNewIngredient] = useState('')
  const [ingredients, setIngredients] = useState([])

  // Action states
  const [updating, setUpdating] = useState(false)
  const [checkinLoading, setCheckinLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        const [profRes, streakRes] = await Promise.all([
          getMyProfile(),
          getStreak()
        ])
        
        setProfile(profRes.data)
        setBio(profRes.data.bio || '')
        setDietary(profRes.data.dietary_preferences || [])
        setIngredients(profRes.data.frequently_used_ingredients || [])
        setStreakInfo(streakRes.data)

        // Use user.id from AuthContext (not profRes.data.id which is the Profile table PK)
        if (user?.id) {
          const [recRes, savedRes] = await Promise.all([
            getUserRecipes(user.id),
            getSavedRecipes()
          ])
          setMyRecipes(recRes.data)
          setSavedRecipes(savedRes.data)
        }
      } catch (err) {
        setError('Failed to load profile details.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, navigate])

  const handleCheckin = async () => {
    setCheckinLoading(true)
    try {
      const res = await dailyCheckin()
      setStreakInfo(prev => ({
        ...prev,
        cooking_streak: res.data.cooking_streak,
        checked_in_today: true,
        last_checkin_date: res.data.last_checkin_date
      }))
      if (profile) {
        setProfile(prev => ({
          ...prev,
          cooking_streak: res.data.cooking_streak,
          last_checkin_date: res.data.last_checkin_date
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleDietaryToggle = (pref) => {
    setDietary(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    )
  }

  const handleAddIngredient = (e) => {
    e.preventDefault()
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients(prev => [...prev, newIngredient.trim()])
      setNewIngredient('')
    }
  }

  const handleRemoveIngredient = (ing) => {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setError(null)
    try {
      const payload = {
        bio,
        dietary_preferences: dietary,
        frequently_used_ingredients: ingredients
      }
      const res = await updateMyProfile(payload)
      setProfile(res.data)
      setShowSettings(false)
    } catch (err) {
      setError('Failed to save profile changes.')
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-6 h-6 text-[#FF6B35]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-10 px-4 md:px-8 max-w-6xl mx-auto space-y-10">
      
      {/* ── Center Pinterest Header ───────────────────────────────── */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-lg mx-auto">
        {/* Large Avatar */}
        <div className="relative group">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center text-white text-3xl font-extrabold shadow-md transition-transform duration-300 hover:scale-105">
            {getInitials(user?.username)}
          </div>
          {/* Subtle Cooking Streak Indicator Badge over avatar */}
          <div className="absolute -bottom-1 -right-1 bg-white border border-[#ffe9e3] shadow-sm rounded-full px-2 py-0.5 flex items-center gap-0.5 text-[11px] font-bold text-[#FF6B35]">
            🔥 {streakInfo?.cooking_streak || 0}
          </div>
        </div>

        {/* Username + Edit Profile Icon */}
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-2xl font-extrabold text-[#261814] tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {user?.username}
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Edit Profile Preferences"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Inline Social Stats */}
        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
          <span>{profile?.followers_count || 0} followers</span>
          <span>•</span>
          <span>{profile?.following_count || 0} following</span>
          <span>•</span>
          <span className="text-[#FF6B35] font-bold">🔥 {streakInfo?.cooking_streak || 0}d streak</span>
        </div>

        {/* Bio */}
        {profile?.bio ? (
          <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
            {profile.bio}
          </p>
        ) : (
          <button 
            onClick={() => setShowSettings(true)}
            className="text-xs text-gray-400 hover:text-[#FF6B35] transition-colors"
          >
            Add a bio to express your cooking style
          </button>
        )}

        {/* Dietary preference inline tags */}
        {profile?.dietary_preferences?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {profile.dietary_preferences.map(pref => (
              <span key={pref} className="text-[10px] font-bold bg-gray-100 text-[#594139] px-2.5 py-1 rounded-full">
                {pref}
              </span>
            ))}
          </div>
        )}

        {/* Daily check-in inline badge button */}
        <div className="pt-2">
          {streakInfo?.checked_in_today ? (
            <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs px-4 py-1.5 rounded-full font-bold border border-emerald-100">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Checked in today
            </div>
          ) : (
            <button
              onClick={handleCheckin}
              disabled={checkinLoading}
              className="bg-[#FF6B35] hover:bg-[#ff5516] active:scale-95 text-white text-xs px-5 py-2 rounded-full font-bold shadow-sm transition-all flex items-center gap-1"
            >
              📆 {checkinLoading ? 'Checking in...' : 'Claim Today\'s Cooking Streak'}
            </button>
          )}
        </div>
      </div>

      {/* ── Pinterest-Style Boards (Saved vs Created Tabs) ────────── */}
      <div className="space-y-6">
        <div className="flex border-b border-gray-100 text-sm font-semibold gap-6 justify-center">
          <button
            onClick={() => setActiveSubTab('saved')}
            className={`pb-3 text-center transition-all ${
              activeSubTab === 'saved'
                ? 'border-b-2 border-[#261814] text-[#261814] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Saved Recipes ({savedRecipes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('created')}
            className={`pb-3 text-center transition-all ${
              activeSubTab === 'created'
                ? 'border-b-2 border-[#261814] text-[#261814] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Created Recipes ({myRecipes.length})
          </button>
        </div>

        {/* Recipe Masonry / Grid */}
        {activeSubTab === 'saved' ? (
          savedRecipes.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-3">
              <p className="text-sm">You haven't saved any recipes yet.</p>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-100 hover:bg-[#ffe9e3] text-[#FF6B35] text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-all"
              >
                Browse Recipes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {savedRecipes.map(recipe => {
                const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
                return (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="cursor-pointer rounded-2xl overflow-hidden border border-gray-100 flex flex-col group bg-white hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="h-40 w-full overflow-hidden bg-gray-50 relative">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                      )}
                      {recipe.cuisine && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/95 text-[#594139] shadow-sm">
                          {recipe.cuisine}
                        </span>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-[#261814] line-clamp-2 leading-tight capitalize group-hover:text-[#FF6B35] transition-colors mb-1.5">
                        {recipe.title}
                      </h4>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="capitalize">{recipe.difficulty || 'Medium'}</span>
                        {totalTime > 0 && <span>⏱️ {totalTime}m</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          myRecipes.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-3">
              <p className="text-sm">You haven't contributed any recipes yet.</p>
              <button
                onClick={() => navigate('/post')}
                className="bg-gray-100 hover:bg-[#ffe9e3] text-[#FF6B35] text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-all"
              >
                Share A Recipe
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myRecipes.map(recipe => {
                const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
                return (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="cursor-pointer rounded-2xl overflow-hidden border border-gray-100 flex flex-col group bg-white hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="h-40 w-full overflow-hidden bg-gray-50 relative">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                      )}
                      {recipe.cuisine && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/95 text-[#594139] shadow-sm">
                          {recipe.cuisine}
                        </span>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-[#261814] line-clamp-2 leading-tight capitalize group-hover:text-[#FF6B35] transition-colors mb-1.5">
                        {recipe.title}
                      </h4>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="capitalize">{recipe.difficulty || 'Medium'}</span>
                        {totalTime > 0 && <span>⏱️ {totalTime}m</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ── Settings Configuration Modal ──────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 animate-slide-up relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="border-b border-gray-100 pb-3 mb-5">
              <h2 className="text-lg font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Profile Preferences
              </h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Bio Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Biography</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows="3"
                  className="w-full px-3.5 py-2 text-xs bg-[#fffcfb] border border-[#e1bfb5] rounded-xl focus:outline-none focus:border-[#FF6B35]"
                />
              </div>

              {/* Dietary preferences selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Dietary Rules</label>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_OPTIONS.map(pref => {
                    const isSelected = dietary.includes(pref)
                    return (
                      <button
                        type="button"
                        key={pref}
                        onClick={() => handleDietaryToggle(pref)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                          isSelected
                            ? 'bg-[#FF6B35] text-white border-[#FF6B35]'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pref}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tag Editor for Frequently Used Ingredients */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Frequently Used Ingredients</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add ingredient (e.g. eggs, rice)"
                    value={newIngredient}
                    onChange={e => setNewIngredient(e.target.value)}
                    className="flex-1 px-3.5 py-1.5 text-xs bg-[#fffcfb] border border-[#e1bfb5] rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="bg-[#261814] text-white hover:bg-black text-xs font-bold px-4 py-1.5 rounded-xl transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50">
                  {ingredients.length === 0 ? (
                    <span className="text-[10px] text-gray-400 italic">No ingredients configured</span>
                  ) : (
                    ingredients.map(ing => (
                      <span
                        key={ing}
                        className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing)}
                          className="text-red-500 hover:text-red-700 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Modal footer save actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-[#FF6B35] hover:bg-[#ff5516] text-white font-bold text-xs flex-1 py-2.5 rounded-full shadow-sm transition-all active:scale-95"
                >
                  {updating ? 'Saving Changes...' : 'Save Preferences'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBio(profile?.bio || '')
                    setDietary(profile?.dietary_preferences || [])
                    setIngredients(profile?.frequently_used_ingredients || [])
                    setShowSettings(false)
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-6 py-2.5 rounded-full w-auto"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
