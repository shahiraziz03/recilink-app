import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

export function getInitials(username) {
  return username ? username.slice(0, 2).toUpperCase() : '?'
}

export function avatarColor(username) {
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

export default function PostCard({ post, onClick, onLikeToggle, currentUser }) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const photo = post?.cover_photo_url || post?.recipe?.image_url
  const isVideo = Boolean(post?.video_url)
  const recipe = post?.recipe
  const totalTime = (recipe?.prep_time || 0) + (recipe?.cook_time || 0)
  const tags = recipe?.tags?.slice(0, 3) || []

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group break-inside-avoid mb-4 hover:opacity-95 transition-opacity border border-gray-100"
      onClick={() => onClick && onClick(post)}
    >
      {/* Cover photo or video */}
      {(photo || isVideo) && !imgError ? (
        <div className="relative overflow-hidden">
          {isVideo ? (
            <video
              src={post.video_url}
              poster={post.cover_photo_url || undefined}
              className="w-full object-cover max-h-[420px] pointer-events-none"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={photo}
              alt={recipe?.title || 'Recipe'}
              className="w-full object-cover group-hover:scale-105 transition-transform duration-500 max-h-[420px]"
              onError={() => setImgError(true)}
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Difficulty badge */}
          {recipe?.difficulty && (
            <div className="absolute top-3 left-3 pointer-events-none">
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
            <div className="absolute top-3 right-3 pointer-events-none">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#594139] shadow-sm">
                {recipe.cuisine}
              </span>
            </div>
          )}

          {/* Time bottom-left on image */}
          {totalTime > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs font-medium pointer-events-none">
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
            <div className="absolute top-3 left-3 pointer-events-none">
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
      <div className="px-3 py-2.5">
        {post?.reason && (
          <span className="inline-block bg-[#fff1ed] text-[#FF6B35] text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1">
            {post.reason}
          </span>
        )}
        <p className="text-xs font-semibold text-[#261814] leading-snug line-clamp-1 capitalize">
          {recipe?.title || 'Untitled Recipe'}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-5 h-5 rounded-full bg-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] font-bold text-[9px] flex-shrink-0">
            {post?.posted_by?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-[10px] text-[#8d7168] truncate">
            {post?.posted_by?.username || 'Anonymous'}
          </span>
          <div className="ml-auto flex items-center gap-1 text-[#8d7168]">
            <span className="text-[10px]">♡ {post?.likes_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
