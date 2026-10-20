import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getUserProfile,
  getUserPosts,
  getUserRecipes,
  getUserFollowers,
  getUserFollowing,
  followUser,
  unfollowUser,
} from '../api/recipes'

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

// ── Followers / Following Modal ──────────────────────────────────────────────
function UserListModal({ title, users, onClose, onUserClick }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-slide-up relative max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="font-bold text-base text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* User list */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {users.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">No users found.</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                onClick={() => onUserClick(u.id)}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-[#fff8f6] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(u.username)} flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                  >
                    {getInitials(u.username)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#261814] group-hover:text-[#FF6B35] transition-colors">
                      {u.username}
                    </h4>
                    {u.bio && <p className="text-[11px] text-gray-400 line-clamp-1 max-w-[200px]">{u.bio}</p>}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 group-hover:text-[#FF6B35] transition-colors font-semibold">
                  View →
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function PublicProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, token } = useAuth()

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [activeTab, setActiveTab] = useState('posts') // 'posts' or 'recipes'

  // Modal states
  const [modalType, setModalType] = useState(null) // 'followers' or 'following'
  const [modalUsers, setModalUsers] = useState([])
  const [loadingModal, setLoadingModal] = useState(false)

  const isSelf = currentUser?.id && Number(currentUser.id) === Number(id)

  useEffect(() => {
    // If it's the logged in user, redirect to their personal profile page
    if (isSelf) {
      navigate('/profile', { replace: true })
      return
    }

    const loadProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const [profRes, postsRes, recRes] = await Promise.all([
          getUserProfile(id),
          getUserPosts(id).catch(err => {
            console.error('Error fetching user posts:', err)
            return { data: [] }
          }),
          getUserRecipes(id).catch(err => {
            console.error('Error fetching user recipes:', err)
            return { data: [] }
          }),
        ])
        setProfile(profRes.data)
        setIsFollowing(Boolean(profRes.data.is_following))
        setFollowersCount(profRes.data.followers_count || 0)
        setPosts(postsRes.data || [])
        setRecipes(recRes.data || [])
      } catch (err) {
        console.error('Error loading public profile:', err)
        setError(err.response?.data?.detail || 'User not found or failed to load profile.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [id, isSelf, navigate])

  const handleFollowToggle = async () => {
    if (!token) {
      navigate('/login')
      return
    }
    try {
      if (isFollowing) {
        await unfollowUser(id)
        setIsFollowing(false)
        setFollowersCount((prev) => Math.max(0, prev - 1))
      } else {
        await followUser(id)
        setIsFollowing(true)
        setFollowersCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    }
  }

  const openFollowersModal = async () => {
    setModalType('followers')
    setLoadingModal(true)
    try {
      const res = await getUserFollowers(id)
      setModalUsers(res.data)
    } catch (err) {
      console.error(err)
      setModalUsers([])
    } finally {
      setLoadingModal(false)
    }
  }

  const openFollowingModal = async () => {
    setModalType('following')
    setLoadingModal(true)
    try {
      const res = await getUserFollowing(id)
      setModalUsers(res.data)
    } catch (err) {
      console.error(err)
      setModalUsers([])
    } finally {
      setLoadingModal(false)
    }
  }

  const handleUserModalClick = (targetUserId) => {
    setModalType(null)
    if (currentUser && Number(currentUser.id) === Number(targetUserId)) {
      navigate('/profile')
    } else {
      navigate(`/users/${targetUserId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-7 h-7 text-[#FF6B35]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-xs text-gray-400">Loading chef profile...</span>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-sm space-y-4">
          <div className="text-5xl">🍳</div>
          <h2 className="text-lg font-bold text-[#261814]">Chef Not Found</h2>
          <p className="text-xs text-gray-500">{error || 'This user profile does not exist.'}</p>
          <button
            onClick={() => navigate('/community')}
            className="bg-[#FF6B35] text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-[#ff5516] transition-all"
          >
            Back to Community
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4 md:px-8 max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#FF6B35] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* ── Profile Header ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
        {/* Large Avatar */}
        <div className="relative">
          <div
            className={`w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br ${avatarColor(
              profile.username
            )} flex items-center justify-center text-white text-3xl font-extrabold shadow-md transition-transform duration-300 hover:scale-105`}
          >
            {getInitials(profile.username)}
          </div>
        </div>

        {/* Username & Chef Tag */}
        <div>
          <h1
            className="text-2xl font-extrabold text-[#261814] tracking-tight"
            style={{ fontFamily: 'Plus Jakarta Sans' }}
          >
            {profile.username}
          </h1>
          <span className="text-[11px] font-semibold text-[#FF6B35] bg-[#fff1ed] px-3 py-0.5 rounded-full mt-1 inline-block">
            🍴 ReciLink Foodie
          </span>
        </div>

        {/* Bio */}
        {profile.bio ? (
          <p className="text-xs text-gray-600 leading-relaxed max-w-xs">{profile.bio}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">No bio written yet.</p>
        )}

        {/* Clickable Social Stats */}
        <div className="flex items-center gap-6 py-2 border-y border-gray-100 w-full justify-center text-center">
          <div>
            <div className="text-base font-extrabold text-[#261814]">{posts.length}</div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Posts</div>
          </div>

          <div
            onClick={openFollowersModal}
            className="cursor-pointer hover:opacity-75 transition-opacity"
            title="Click to view followers"
          >
            <div className="text-base font-extrabold text-[#261814]">{followersCount}</div>
            <div className="text-[10px] uppercase font-bold text-[#FF6B35]">Followers</div>
          </div>

          <div
            onClick={openFollowingModal}
            className="cursor-pointer hover:opacity-75 transition-opacity"
            title="Click to view following"
          >
            <div className="text-base font-extrabold text-[#261814]">{profile.following_count || 0}</div>
            <div className="text-[10px] uppercase font-bold text-[#FF6B35]">Following</div>
          </div>
        </div>

        {/* Follow / Unfollow Button */}
        <div className="pt-1">
          <button
            onClick={handleFollowToggle}
            className={`px-8 py-2.5 rounded-full text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
              isFollowing
                ? 'bg-gray-100 text-[#594139] hover:bg-red-50 hover:text-red-500 hover:border-red-200 border border-gray-200'
                : 'bg-[#FF6B35] text-white hover:bg-[#ff5516]'
            }`}
          >
            {isFollowing ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Following
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Follow Chef
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Tabs (Posts vs Recipes) ─────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex border-b border-gray-100 text-xs font-bold gap-8 justify-center">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 text-center transition-all flex items-center gap-1.5 ${
              activeTab === 'posts'
                ? 'border-b-2 border-[#FF6B35] text-[#FF6B35]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>📸 Community Posts</span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{posts.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`pb-3 text-center transition-all flex items-center gap-1.5 ${
              activeTab === 'recipes'
                ? 'border-b-2 border-[#FF6B35] text-[#FF6B35]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>📖 Recipes</span>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{recipes.length}</span>
          </button>
        </div>

        {/* Tab 1: Posts Grid */}
        {activeTab === 'posts' && (
          <div>
            {posts.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-2">
                <div className="text-4xl">📸</div>
                <p className="text-xs">No food posts shared yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {posts.map((post) => {
                  const photo = post.cover_photo_url || post.recipe_image_url
                  return (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/community?post=${post.id}`)}
                      className="cursor-pointer rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col group relative"
                    >
                      {/* Photo */}
                      <div className="h-44 w-full overflow-hidden bg-gray-50 relative">
                        {photo ? (
                          <img
                            src={photo}
                            alt={post.recipe_title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-[#ffe9e3] to-[#fde3db]">
                            🍽️
                          </div>
                        )}

                        {/* Cuisine badge */}
                        {post.recipe_cuisine && (
                          <span className="absolute top-2 right-2 text-[8px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[#594139] shadow-sm">
                            {post.recipe_cuisine}
                          </span>
                        )}

                        {/* Engagement overlay at bottom of photo */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 flex items-center justify-between text-white text-[11px] font-bold">
                          <span className="flex items-center gap-1">
                            ❤️ {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {post.comments_count || 0}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-[#261814] line-clamp-1 leading-snug group-hover:text-[#FF6B35] transition-colors">
                          {post.recipe_title || 'Untitled Recipe'}
                        </h4>
                        {post.recipe_difficulty && (
                          <span className="text-[10px] text-gray-400 capitalize mt-0.5 block">
                            {post.recipe_difficulty} Difficulty
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Recipes List */}
        {activeTab === 'recipes' && (
          <div>
            {recipes.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-2">
                <div className="text-4xl">📖</div>
                <p className="text-xs">No recipes contributed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="cursor-pointer rounded-2xl overflow-hidden border border-gray-100 bg-white hover:shadow-md transition-shadow group flex flex-col"
                  >
                    <div className="h-36 w-full overflow-hidden bg-gray-50 relative">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-[#ffe9e3] to-[#fde3db]">
                          🍽️
                        </div>
                      )}
                      {recipe.cuisine && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/95 text-[#594139]">
                          {recipe.cuisine}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-[#261814] line-clamp-2 group-hover:text-[#FF6B35] transition-colors mb-1">
                        {recipe.title}
                      </h4>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="capitalize">{recipe.difficulty || 'Medium'}</span>
                        <span>{recipe.saves_count || 0} saves</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Followers / Following Modal */}
      {modalType && (
        <UserListModal
          title={modalType === 'followers' ? 'Followers' : 'Following'}
          users={modalUsers}
          onClose={() => setModalType(null)}
          onUserClick={handleUserModalClick}
        />
      )}
    </div>
  )
}
