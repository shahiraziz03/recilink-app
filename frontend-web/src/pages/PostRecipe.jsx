import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createRecipePost, uploadMedia } from '../api/posts'
import PostCard from '../components/PostCard'

const CUISINES = [
  'Malaysian', 'Chinese', 'Indian', 'Western', 'Japanese',
  'Korean', 'Thai', 'Italian', 'Mexican', 'Middle Eastern', 'Other'
]

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard']

const SUGGESTED_TAGS = [
  'halal', 'vegetarian', 'vegan', 'gluten-free', 'spicy',
  'healthy', 'quick', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack'
]

const STEPS = [
  { id: 'details', label: 'Recipe Details', icon: '📋' },
  { id: 'ingredients', label: 'Ingredients', icon: '🥗' },
  { id: 'steps', label: 'Cooking Steps', icon: '👨‍🍳' },
  { id: 'post', label: 'Post & Share', icon: '🚀' }
]

export default function PostRecipe() {
  const navigate = useNavigate()
  const { token, user } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Recipe fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [customCuisine, setCustomCuisine] = useState('') // New custom other input state
  const [difficulty, setDifficulty] = useState('Medium')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState(4)
  const [ingredients, setIngredients] = useState(['', ''])
  const [cookingSteps, setCookingSteps] = useState([''])
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')

  // Post & media fields
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null) // 'image' | 'video'
  const [coverUrl, setCoverUrl] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlFallback, setShowUrlFallback] = useState(false)
  const [fallbackUrlInput, setFallbackUrlInput] = useState('')
  const fileInputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // ── Cleanup on unmount only ───────────────────────────
  const activePreviewRef = useRef(null)
  activePreviewRef.current = mediaPreview

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (activePreviewRef.current && activePreviewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activePreviewRef.current)
      }
    }
  }, [])

  const clearMediaPreview = () => {
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview)
    }
  }

  // ── Remove / Cancel media ──────────────────────────────
  const handleRemoveMedia = (e) => {
    e?.stopPropagation()
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    clearMediaPreview()
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setCoverUrl(null)
    setVideoUrl(null)
    setUploading(false)
    setUploadProgress(0)
    setUploadError(null)
    setFallbackUrlInput('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // ── Process file selection / drop ──────────────────────
  const processFile = async (file) => {
    if (!file) return


    setUploadError(null)

    // 1. Client-side validation BEFORE uploading
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name)
    const isVideo = file.type?.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name)

    if (!isImage && !isVideo) {
      const msg = 'Invalid file type. Please upload a JPG, PNG image or MP4 video.'
      setUploadError(msg)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const maxImageSize = 10 * 1024 * 1024 // 10MB
    const maxVideoSize = 50 * 1024 * 1024 // 50MB

    if (isImage && file.size > maxImageSize) {
      const msg = 'Image size exceeds 10MB limit.'
      setUploadError(msg)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (isVideo && file.size > maxVideoSize) {
      const msg = 'Video size exceeds 50MB limit.'
      setUploadError(msg)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Abort any ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    clearMediaPreview()

    // 2. Show local preview instantly
    const objectUrl = URL.createObjectURL(file)
    const detectedType = isVideo ? 'video' : 'image'

    setMediaFile(file)
    setMediaPreview(objectUrl)
    setMediaType(detectedType)
    setCoverUrl(null)
    setVideoUrl(null)
    setUploadProgress(0)

    // 3. Start upload immediately
    const controller = new AbortController()
    abortControllerRef.current = controller
    setUploading(true)

    try {
      const result = await uploadMedia(
        file,
        token,
        (percent) => setUploadProgress(percent),
        controller.signal
      )

      const isVideoResult = result.media_type === 'video' || (!result.media_type && detectedType === 'video')
      if (isVideoResult) {
        setVideoUrl(result.url)
        setCoverUrl(null)
        setMediaType('video')
      } else {
        setCoverUrl(result.url)
        setVideoUrl(null)
        setMediaType('image')
      }
      setUploadProgress(100)
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }

      // On upload error: show message from backend, keep box in empty state, allow retry
      if (objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
      setMediaFile(null)
      setMediaPreview(null)
      setMediaType(null)
      setCoverUrl(null)
      setVideoUrl(null)
      setUploadProgress(0)
      setUploadError(err.message || 'Upload failed. Please try again.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setUploading(false)
      }
    }
  }

  // ── URL fallback handler ───────────────────────────────
  const handleApplyUrl = () => {
    const url = fallbackUrlInput.trim()
    if (!url) return
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    clearMediaPreview()
    setMediaFile(null)
    setMediaPreview(url)
    setCoverUrl(url)
    setVideoUrl(null)
    setMediaType('image')
    setUploadError(null)
    setUploading(false)
    setUploadProgress(100)
  }

  const getVideoThumbnailUrl = (url) => {
    if (!url) return null
    return url.replace(/\.[A-Za-z0-9]+$/, '.jpg')
  }

  // ── Ingredient helpers ─────────────────────────────────
  const addIngredient = () => setIngredients([...ingredients, ''])
  const removeIngredient = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i))
  const updateIngredient = (i, val) => {
    const next = [...ingredients]
    next[i] = val
    setIngredients(next)
  }

  // ── Step helpers ───────────────────────────────────────
  const addStep = () => setCookingSteps([...cookingSteps, ''])
  const removeStep = (i) => setCookingSteps(cookingSteps.filter((_, idx) => idx !== i))
  const updateStep = (i, val) => {
    const next = [...cookingSteps]
    next[i] = val
    setCookingSteps(next)
  }

  // ── Tag helpers ────────────────────────────────────────
  const addTag = (tag) => {
    const clean = tag.trim().toLowerCase()
    if (clean && !tags.includes(clean)) setTags([...tags, clean])
    setTagInput('')
  }
  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag))

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  // Get final calculated cuisine value
  const getSelectedCuisine = () => {
    if (cuisine === 'Other') {
      return customCuisine.trim() || 'Other'
    }
    return cuisine
  }

  // ── Step validation ────────────────────────────────────
  const canProceed = () => {
    if (currentStep === 0) {
      const validCuisine = cuisine === 'Other' ? customCuisine.trim().length > 0 : cuisine !== ''
      return title.trim().length > 0 && validCuisine
    }
    if (currentStep === 1) return ingredients.some((i) => i.trim())
    if (currentStep === 2) return cookingSteps.some((s) => s.trim())
    return true
  }

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!videoUrl && !coverUrl) {
      setError('Please add a photo or video to share your recipe.')
      return
    }

    if (!token) {
      setError('You must be logged in to post a recipe.')
      return
    }

    if (uploading) {
      setError('Please wait for the media upload to complete.')
      return
    }

    if (mediaFile && !videoUrl && !coverUrl) {
      setError(uploadError || 'Media upload has not completed or failed. Please re-select your file before posting.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let recipeImageUrl = null
      const postData = {
        caption: caption.trim() || null,
      }

      if (videoUrl) {
        postData.video_url = videoUrl
        recipeImageUrl = getVideoThumbnailUrl(videoUrl)
      } else if (coverUrl) {
        postData.cover_photo_url = coverUrl
        recipeImageUrl = coverUrl
      }

      const recipeData = {
        title: title.trim(),
        description: description.trim() || null,
        cuisine: getSelectedCuisine(),
        difficulty,
        prep_time: prepTime ? parseInt(prepTime) : null,
        cook_time: cookTime ? parseInt(cookTime) : null,
        servings: parseInt(servings),
        ingredients: ingredients.filter((i) => i.trim()),
        steps: cookingSteps.filter((s) => s.trim()),
        tags: tags.length ? tags : null,
        image_url: recipeImageUrl,
        source: 'user',
      }


      await createRecipePost(recipeData, postData, token)
      setSubmitSuccess(true)
      setTimeout(() => navigate('/community'), 2500)
    } catch (err) {
      setError(err.message || 'Failed to submit recipe')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f6]">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center mx-auto shadow-xl animate-bounce-once">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Recipe Posted! 🎉
            </h2>
            <p className="text-[#8d7168] mt-2">Your recipe is now live on the community feed.</p>
          </div>
          <div className="w-48 h-1.5 bg-[#ffe9e3] rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-[#FF6B35] rounded-full animate-progress" />
          </div>
          <p className="text-sm text-[#8d7168]">Redirecting to the feed...</p>
        </div>
      </div>
    )
  }

  const mockPost = {
    id: 0,
    caption: caption.trim() || undefined,
    cover_photo_url: videoUrl ? undefined : (coverUrl || (mediaType !== 'video' ? mediaPreview : undefined)),
    video_url: videoUrl || (mediaType === 'video' ? mediaPreview : undefined),
    likes_count: 0,
    is_liked: false,
    recipe: {
      title: title.trim() || 'Your Recipe Title',
      cuisine: getSelectedCuisine() || undefined,
      difficulty,
      prep_time: prepTime ? parseInt(prepTime) : 0,
      cook_time: cookTime ? parseInt(cookTime) : 0,
      tags: tags.length ? tags : [],
      ingredients: ingredients.filter((i) => i.trim()),
      steps: cookingSteps.filter((s) => s.trim()),
    },
    posted_by: {
      id: user?.id || 0,
      username: user?.username || 'You',
    },
  }

  return (
    <div className="min-h-screen bg-[#fff8f6] py-6 sm:py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Share Your Recipe
            </h1>
            <p className="text-sm text-[#8d7168]">Let the world taste your culinary masterpiece</p>
          </div>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="max-w-4xl mx-auto mb-8 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-0 min-w-[500px] sm:min-w-0">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                className={`flex flex-col items-center gap-1.5 group transition-all duration-300 ${
                  idx <= currentStep ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                  idx < currentStep
                    ? 'bg-[#FF6B35] text-white scale-95'
                    : idx === currentStep
                    ? 'bg-[#FF6B35] text-white ring-4 ring-[#FF6B35]/20 scale-110'
                    : 'bg-white border-2 border-[#e1bfb5] text-[#8d7168]'
                }`}>
                  {idx < currentStep ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${
                  idx === currentStep ? 'text-[#FF6B35]' : idx < currentStep ? 'text-[#594139]' : 'text-[#8d7168]'
                }`}>
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all duration-500 ${
                  idx < currentStep ? 'bg-[#FF6B35]' : 'bg-[#e1bfb5]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card container */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-[#f7ddd5] overflow-hidden">

          {/* ── STEP 0: Recipe Details ────────────────────────── */}
          {currentStep === 0 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Recipe Details</h2>
                  <p className="text-sm text-[#8d7168]">Tell us about your dish</p>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Recipe Name *</label>
                <input
                  id="recipe-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mum's Nasi Lemak"
                  className="input-field text-base"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Description</label>
                <textarea
                  id="recipe-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this recipe special?"
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {/* Cuisine + Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Cuisine *</label>
                  <div className="space-y-2">
                    <select
                      id="recipe-cuisine"
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select Cuisine</option>
                      {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Custom text field showing if "Other" is picked */}
                    {cuisine === 'Other' && (
                      <input
                        id="recipe-custom-cuisine"
                        type="text"
                        value={customCuisine}
                        onChange={(e) => setCustomCuisine(e.target.value)}
                        placeholder="Type custom cuisine (e.g. Nyonya, Peranakan)"
                        className="input-field text-sm animate-fade-in"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Difficulty</label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <button
                        key={d}
                        id={`difficulty-${d.toLowerCase()}`}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                          difficulty === d
                            ? 'bg-[#FF6B35] text-white shadow-sm scale-105'
                            : 'bg-[#fff1ed] text-[#594139] hover:bg-[#ffe9e3]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Times + Servings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Prep Time</label>
                  <div className="relative">
                    <input
                      id="recipe-prep-time"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="15"
                      min="0"
                      className="input-field pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8d7168] font-medium">min</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Cook Time</label>
                  <div className="relative">
                    <input
                      id="recipe-cook-time"
                      type="number"
                      value={cookTime}
                      onChange={(e) => setCookTime(e.target.value)}
                      placeholder="30"
                      min="0"
                      className="input-field pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8d7168] font-medium">min</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Servings</label>
                  <input
                    id="recipe-servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    min="1"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Ingredients ───────────────────────────── */}
          {currentStep === 1 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🥗</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Ingredients</h2>
                  <p className="text-sm text-[#8d7168]">List everything you'll need</p>
                </div>
              </div>

              <div className="space-y-3">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-3 group">
                    <div className="w-7 h-7 rounded-full bg-[#ffe9e3] flex items-center justify-center text-xs font-bold text-[#FF6B35] flex-shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      id={`ingredient-${idx}`}
                      type="text"
                      value={ing}
                      onChange={(e) => updateIngredient(idx, e.target.value)}
                      placeholder={`e.g. ${idx === 0 ? '2 cups coconut milk' : idx === 1 ? '1 cup jasmine rice' : 'Ingredient ' + (idx + 1)}`}
                      className="input-field flex-1"
                    />
                    {ingredients.length > 1 && (
                      <button
                        id={`remove-ingredient-${idx}`}
                        type="button"
                        onClick={() => removeIngredient(idx)}
                        className="w-8 h-8 rounded-full bg-[#fde3db] hover:bg-red-100 text-[#8d7168] hover:text-red-500 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                id="add-ingredient-btn"
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-2 text-sm font-semibold text-[#FF6B35] hover:text-[#e55928] transition-colors duration-200 mt-2"
              >
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-[#FF6B35] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Add Ingredient
              </button>

              {/* Progress indicator */}
              <div className="bg-[#fff1ed] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#FF6B35]">{ingredients.filter(i => i.trim()).length}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#261814]">ingredients added</p>
                  <p className="text-xs text-[#8d7168]">Aim for 3+ for best results</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Cooking Steps ─────────────────────────── */}
          {currentStep === 2 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">👨‍🍳</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Cooking Steps</h2>
                  <p className="text-sm text-[#8d7168]">Walk others through your process</p>
                </div>
              </div>

              <div className="space-y-4">
                {cookingSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#ff9a72] flex items-center justify-center text-white text-sm font-bold shadow-sm mt-2">
                      {idx + 1}
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        id={`cooking-step-${idx}`}
                        value={step}
                        onChange={(e) => updateStep(idx, e.target.value)}
                        placeholder={
                          idx === 0
                            ? 'e.g. Wash the rice and soak for 30 minutes...'
                            : idx === 1
                            ? 'e.g. Bring coconut milk to a gentle simmer...'
                            : `Step ${idx + 1}...`
                        }
                        rows={2}
                        className="input-field resize-none w-full"
                      />
                      {cookingSteps.length > 1 && (
                        <button
                          id={`remove-step-${idx}`}
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#fde3db] hover:bg-red-100 text-[#8d7168] hover:text-red-500 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                id="add-step-btn"
                type="button"
                onClick={addStep}
                className="flex items-center gap-2 text-sm font-semibold text-[#FF6B35] hover:text-[#e55928] transition-colors duration-200"
              >
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-[#FF6B35] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Add Step
              </button>
            </div>
          )}

          {/* ── STEP 3: Post & Share ──────────────────────────── */}
          {currentStep === 3 && (
            <div className="p-8 space-y-6 animate-slide-in">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🚀</span>
                <div>
                  <h2 className="text-xl font-bold text-[#261814]" style={{ fontFamily: 'Plus Jakarta Sans' }}>Post & Share</h2>
                  <p className="text-sm text-[#8d7168]">Add a photo and caption to share with the community</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Left: Form */}
                <div className="space-y-5">
                  {/* Media Upload Container */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">
                        Cover Photo or Video <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-red-500 font-medium">Required</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) processFile(file)
                      }}
                    />

                    {!mediaPreview ? (
                      /* Empty State */
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Upload photo or video"
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            fileInputRef.current?.click()
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDragging(true)
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          setIsDragging(false)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDragging(false)
                          const file = e.dataTransfer.files?.[0]
                          if (file) processFile(file)
                        }}
                        className={`relative w-full aspect-[4/5] max-h-[420px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors ${
                          isDragging
                            ? 'border-[#FF6B35] bg-[#fff1ed]'
                            : 'border-[#e1bfb5] hover:border-[#FF6B35] bg-[#fffcfb]'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-full bg-[#ffe9e3] text-[#FF6B35] flex items-center justify-center mb-3 text-2xl shadow-sm">
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-[#261814]">Add a photo or video</p>
                        <p className="text-xs text-[#8d7168] mt-1.5 max-w-[220px]">
                          JPG, PNG or MP4. Photo max 10MB, video max 50MB
                        </p>
                      </div>
                    ) : (
                      /* Filled State */
                      <div className="relative w-full aspect-[4/5] max-h-[420px] rounded-2xl bg-neutral-100 overflow-hidden border border-gray-200 flex items-center justify-center group">
                        {mediaType === 'video' ? (
                          <video
                            src={mediaPreview}
                            controls
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <img
                            src={mediaPreview}
                            alt="Media Preview"
                            className="w-full h-full object-contain"
                          />
                        )}

                        {/* Remove (X) button */}
                        <button
                          type="button"
                          onClick={handleRemoveMedia}
                          aria-label="Remove media"
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-md z-30 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Replace button (bottom) */}
                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Replace media"
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm transition-colors shadow-md z-10 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                          >
                            Replace
                          </button>
                        )}

                        {/* Upload progress overlay */}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-white z-20">
                            <p className="text-sm font-semibold tracking-wide">
                              Uploading... {uploadProgress}%
                            </p>
                            <div className="w-full max-w-[200px] h-2 bg-white/30 rounded-full overflow-hidden mt-3 shadow-inner">
                              <div
                                className="h-full bg-[#FF6B35] rounded-full transition-all duration-200"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-white/70 mt-2">Click X above to cancel</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pre-upload validation error or backend upload error */}
                    {uploadError && (
                      <p className="text-xs text-red-500 mt-1.5 font-medium">{uploadError}</p>
                    )}

                    {/* Upload success indicator */}
                    {(coverUrl || videoUrl) && !uploading && !uploadError && (
                      <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
                        <span>✓</span> Uploaded {mediaFile?.name ? `: ${mediaFile.name}` : ''}
                      </p>
                    )}

                    {/* Collapsed URL fallback */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowUrlFallback(!showUrlFallback)}
                        className="text-xs text-[#8d7168] hover:text-[#FF6B35] underline underline-offset-2 transition-colors"
                      >
                        {showUrlFallback ? 'Hide URL input' : 'Or paste an image URL'}
                      </button>
                      {showUrlFallback && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="url"
                            value={fallbackUrlInput}
                            onChange={(e) => setFallbackUrlInput(e.target.value)}
                            placeholder="https://example.com/photo.jpg"
                            className="input-field text-xs py-1.5 flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleApplyUrl}
                            className="px-3 py-1.5 bg-[#594139] hover:bg-[#261814] text-white text-xs font-semibold rounded-xl transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Caption</label>
                    <textarea
                      id="post-caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Share the story behind this dish..."
                      rows={4}
                      className="input-field resize-none"
                    />
                    <p className={`text-xs text-right ${caption.length > 200 ? 'text-[#FF6B35]' : 'text-[#8d7168]'}`}>
                      {caption.length} / 280
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Tags</label>
                    <div className="input-field flex flex-wrap gap-2 min-h-[44px] items-center">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 bg-[#FF6B35] text-white text-xs font-medium px-3 py-1 rounded-full"
                        >
                          #{tag}
                          <button
                            id={`remove-tag-${tag}`}
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:opacity-70 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <input
                        id="tag-input"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={() => tagInput.trim() && addTag(tagInput)}
                        placeholder={tags.length === 0 ? 'Add tags...' : ''}
                        className="outline-none text-sm flex-1 min-w-[80px] bg-transparent"
                      />
                    </div>
                    {/* Suggested tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 6).map((tag) => (
                        <button
                          key={tag}
                          id={`suggested-tag-${tag}`}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="text-xs px-2.5 py-1 rounded-full border border-[#e1bfb5] text-[#594139] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Preview card */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[#594139] uppercase tracking-wide">Preview</p>
                  <div className="w-full max-w-[22rem] mx-auto md:mx-0">
                    <PostCard post={mockPost} onClick={() => {}} />

                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { label: 'Ingredients', value: ingredients.filter(i => i.trim()).length },
                        { label: 'Steps', value: cookingSteps.filter(s => s.trim()).length },
                        { label: 'Tags', value: tags.length },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-[#fff1ed] rounded-xl p-2.5 text-center">
                          <p className="text-lg font-bold text-[#FF6B35]">{stat.value}</p>
                          <p className="text-xs text-[#8d7168]">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation footer ─────────────────────────────── */}
          <div className="px-8 py-5 bg-[#fff8f6] border-t border-[#f7ddd5] flex items-center justify-between">
            <button
              id="step-back-btn"
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                currentStep === 0
                  ? 'text-[#c4a39a] cursor-not-allowed'
                  : 'text-[#594139] hover:bg-[#ffe9e3] hover:text-[#FF6B35]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Step indicator */}
            <div className="flex gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-6 bg-[#FF6B35]' : idx < currentStep ? 'w-1.5 bg-[#FF6B35]/40' : 'w-1.5 bg-[#e1bfb5]'
                  }`}
                />
              ))}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <button
                id="step-next-btn"
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  canProceed()
                    ? 'bg-[#FF6B35] text-white hover:bg-[#e55928] shadow-sm hover:shadow-md active:scale-95'
                    : 'bg-[#fde3db] text-[#c4a39a] cursor-not-allowed'
                }`}
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {!coverUrl && !videoUrl && !uploading && !isSubmitting && (
                  <span className="text-xs text-red-500 font-medium">
                    Add a photo or video to continue
                  </span>
                )}
                <button
                  id="submit-post-btn"
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !token || uploading || (!coverUrl && !videoUrl)}
                  title={!coverUrl && !videoUrl && !uploading && !isSubmitting ? 'Add a photo or video to continue' : undefined}
                  className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                    isSubmitting || !token || uploading || (!coverUrl && !videoUrl)
                      ? 'bg-[#fde3db] text-[#c4a39a] cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#FF6B35] to-[#ff9a72] text-white shadow-md hover:shadow-lg active:scale-95 hover:from-[#e55928] hover:to-[#FF6B35]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Posting...
                    </>
                  ) : uploading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      Post Recipe
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Login prompt if no token */}
        {!token && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-sm text-amber-800">
              You need to{' '}
              <a href="/login" className="font-semibold text-[#FF6B35] hover:underline">log in</a>
              {' '}to post a recipe.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
