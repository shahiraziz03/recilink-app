import { useState, useRef, useEffect } from 'react'
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
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef(null)

  const isVideo = Boolean(post?.video_url) && !videoError
  const photo = post?.cover_photo_url || post?.recipe?.image_url
  const recipe = post?.recipe
  const totalTime = (recipe?.prep_time || 0) + (recipe?.cook_time || 0)
  const hasMedia = (isVideo || Boolean(photo)) && (!imgError || isVideo)

  // Autoplay video only when at least 60% visible in viewport (respects prefers-reduced-motion)
  useEffect(() => {
    if (!isVideo || !videoRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const videoEl = videoRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const playPromise = videoEl.play()
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // Autoplay was prevented or interrupted
              })
            }
          } else {
            videoEl.pause()
            videoEl.currentTime = 0
          }
        })
      },
      { threshold: [0, 0.6, 1.0] }
    )

    observer.observe(videoEl)
    return () => {
      observer.disconnect()
    }
  }, [isVideo, post?.video_url])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(post)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick && onClick(post)
        }
      }}
      className="group cursor-pointer break-inside-avoid mb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] rounded-2xl select-none"
    >
      {/* ── Media Block ────────────────────────────────────────── */}
      {hasMedia ? (
        <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-100 hover:shadow-md transition-shadow duration-300">
          {isVideo ? (
            <div className="relative w-full overflow-hidden bg-neutral-900">
              <video
                ref={videoRef}
                src={post.video_url}
                poster={post.cover_photo_url || undefined}
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setVideoError(true)}
                className="w-full block object-cover max-h-[480px] pointer-events-none"
              />
              {/* Subtle round play badge indicator */}
              <div className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-sm z-10 pointer-events-none">
                <svg className="w-3 h-3 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          ) : (
            <img
              loading="lazy"
              src={photo}
              alt={recipe?.title || 'Recipe'}
              className="w-full block object-cover max-h-[480px] rounded-2xl"
              onError={() => setImgError(true)}
            />
          )}

          {/* Subtle darkening on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none rounded-2xl" />

          {/* Hover badges overlay (always visible on touch screens) */}
          <div className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200 pointer-events-none">
            {/* Difficulty badge (top-left) */}
            {recipe?.difficulty && (
              <div className="absolute top-2.5 left-2.5">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm backdrop-blur-sm ${
                  recipe.difficulty === 'Easy' ? 'bg-emerald-500/90' :
                  recipe.difficulty === 'Medium' ? 'bg-[#FF6B35]/90' : 'bg-red-500/90'
                }`}>
                  {recipe.difficulty}
                </span>
              </div>
            )}

            {/* Cuisine badge (top-right) */}
            {recipe?.cuisine && (
              <div className="absolute top-2.5 right-2.5">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#594139] shadow-sm">
                  {recipe.cuisine}
                </span>
              </div>
            )}

            {/* Total time bottom-left with light gradient */}
            {totalTime > 0 && (
              <div className="absolute bottom-0 inset-x-0 pt-8 pb-2.5 px-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center gap-1 text-white text-xs font-medium rounded-b-2xl">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                {totalTime}m
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fallback when no media or load failed */
        <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#ffe9e3] to-[#fde3db] flex items-center justify-center relative hover:shadow-md transition-shadow duration-300">
          <span className="text-4xl">🍽️</span>
          {recipe?.difficulty && (
            <div className="absolute top-2.5 left-2.5 pointer-events-none">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${
                recipe.difficulty === 'Easy' ? 'bg-emerald-500' :
                recipe.difficulty === 'Medium' ? 'bg-[#FF6B35]' : 'bg-red-500'
              }`}>
                {recipe.difficulty}
              </span>
            </div>
          )}
          {recipe?.cuisine && (
            <div className="absolute top-2.5 right-2.5 pointer-events-none">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-[#594139] shadow-sm">
                {recipe.cuisine}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Text Details below media (sits directly on page background) ── */}
      <div className="pt-2 px-1">
        <p className="text-sm font-semibold text-[#261814] leading-snug line-clamp-2 capitalize">
          {recipe?.title || 'Untitled Recipe'}
        </p>

        {post?.reason && (
          <p className="text-[11px] text-[#FF6B35] font-medium mt-0.5">
            {post.reason}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mt-1.5">
          {/* Author */}
          <div
            className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              if (!post?.posted_by?.id) return
              const isOwn = (currentUser?.id && Number(currentUser.id) === Number(post.posted_by.id)) ||
                            (currentUser?.username && currentUser.username === post.posted_by.username)
              isOwn ? navigate('/profile') : navigate(`/users/${post.posted_by.id}`)
            }}
          >
            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarColor(post?.posted_by?.username)} flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0 shadow-xs`}>
              {getInitials(post?.posted_by?.username)}
            </div>
            <span className="text-xs text-[#8d7168] truncate hover:text-[#261814] transition-colors">
              {post?.posted_by?.username || 'Anonymous'}
            </span>
          </div>

          {/* Likes & Comments */}
          <div className="flex items-center gap-2.5 flex-shrink-0 text-xs text-[#8d7168]">
            <button
              type="button"
              aria-label={post?.is_liked ? "Unlike" : "Like"}
              onClick={(e) => {
                e.stopPropagation()
                onLikeToggle && onLikeToggle(post.id)
              }}
              className={`flex items-center gap-1 transition-colors hover:text-red-500 cursor-pointer ${
                post?.is_liked ? 'text-red-500 font-medium' : 'text-[#8d7168]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={post?.is_liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{post?.likes_count || 0}</span>
            </button>

            <div className="flex items-center gap-1 text-[#8d7168]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{recipe?.comments_count || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
